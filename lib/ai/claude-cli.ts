import "server-only"

import { spawn } from "node:child_process"
import { tmpdir } from "node:os"

// Generation runs through the Claude Code CLI rather than the HTTP API, so it
// bills against the Claude subscription instead of API credits. The CLI is
// spawned per request in `--print` mode and authenticates from
// CLAUDE_CODE_OAUTH_TOKEN (or an interactive `claude` login on the host).
//
// Two consequences of that choice shape everything below:
//
//   1. There is no schema-enforced structured output. The caller has to ask for
//      JSON and validate what comes back — see `lib/ai/blog.ts`.
//   2. Subscription rate limits are sized for one person working interactively,
//      not for N users generating at once. The concurrency gate is therefore
//      load-bearing, not an optimisation.

export const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude"
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5"
export const CLAUDE_EFFORT = process.env.CLAUDE_EFFORT || "high"

const TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS || 240_000)
const MAX_CONCURRENT = Math.max(1, Number(process.env.CLAUDE_MAX_CONCURRENT || 2))
const MAX_QUEUE_DEPTH = Math.max(1, Number(process.env.CLAUDE_QUEUE_DEPTH || 20))

/** The CLI declined the prompt, or hit a limit the writer can act on. */
export class GenerationRefused extends Error {
  constructor(readonly reason: string) {
    super(reason)
    this.name = "GenerationRefused"
  }
}

/** The queue is full. Distinct from a failure — retrying shortly will work. */
export class GenerationBusy extends Error {
  constructor() {
    super(
      "Too many posts are being written at once. Give it a moment and try again."
    )
    this.name = "GenerationBusy"
  }
}

// ---------------------------------------------------------------------------
// Concurrency gate
//
// A subscription is one seat. Letting every request spawn its own CLI would
// trip the account's rate limit and fail all of them rather than queueing, so
// requests past the limit wait — and past the queue depth, are turned away with
// something the UI can explain.
// ---------------------------------------------------------------------------

let active = 0
const waiting: Array<() => void> = []

async function acquire(signal?: AbortSignal): Promise<() => void> {
  if (active < MAX_CONCURRENT) {
    active += 1
    return release
  }

  if (waiting.length >= MAX_QUEUE_DEPTH) {
    throw new GenerationBusy()
  }

  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      const index = waiting.indexOf(admit)
      if (index !== -1) {
        waiting.splice(index, 1)
      }
      reject(new DOMException("Aborted", "AbortError"))
    }

    function admit() {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }

    waiting.push(admit)
    signal?.addEventListener("abort", onAbort, { once: true })
  })

  active += 1
  return release
}

function release() {
  active -= 1
  waiting.shift()?.()
}

/** Queue depth, for logging and for the health check. */
export function generationLoad() {
  return { active, queued: waiting.length, maxConcurrent: MAX_CONCURRENT }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/** The events `--output-format stream-json` emits that we act on. */
export type ClaudeEvent =
  | { type: "system" }
  | { type: "assistant" }
  | { type: "rate_limit_event"; [key: string]: unknown }
  | { type: "result"; subtype: string; is_error: boolean; result?: string }

export type ClaudeRun = {
  /** The assistant's final text. */
  text: string
  /** What the run would have cost on the API. Notional on a subscription — it
      bills against the plan's limits, not a balance — but useful for spotting
      a prompt that has grown expensive. */
  notionalCostUsd: number
}

export async function runClaude({
  system,
  prompt,
  signal,
  onEvent,
}: {
  system: string
  prompt: string
  signal?: AbortSignal
  onEvent?: (event: ClaudeEvent) => void
}): Promise<ClaudeRun> {
  const done = await acquire(signal)
  try {
    return await spawnClaude({ system, prompt, signal, onEvent })
  } finally {
    done()
  }
}

function spawnClaude({
  system,
  prompt,
  signal,
  onEvent,
}: {
  system: string
  prompt: string
  signal?: AbortSignal
  onEvent?: (event: ClaudeEvent) => void
}): Promise<ClaudeRun> {
  return new Promise((resolve, reject) => {
    // `turbopackIgnore` because the binary is resolved at runtime from
    // CLAUDE_BIN. Without it the bundler's static analysis cannot tell what is
    // being spawned, assumes the worst, and traces the entire project into the
    // server bundle — every source file and the whole public folder.
    const child = spawn(
      /* turbopackIgnore: true */ CLAUDE_BIN,
      [
        "-p",
        "--model",
        CLAUDE_MODEL,
        "--effort",
        CLAUDE_EFFORT,
        "--output-format",
        "stream-json",
        // stream-json refuses to emit without it.
        "--verbose",
        // One turn: this is a single generation, not an agent loop. Without a
        // cap a confused run could spend the subscription's quota exploring.
        "--max-turns",
        "1",
        // No tools. The CLI would otherwise be able to read the filesystem it
        // is running on, which a blog generator has no business doing.
        "--disallowedTools",
        "*",
        // Replaces Claude Code's default system prompt rather than appending to
        // it. That prompt is ~3,400 tokens of coding-agent instructions —
        // irrelevant here, and billed on every call.
        "--system-prompt",
        system,
        // Ignore user/project/local settings so the app's behaviour does not
        // depend on a CLAUDE.md sitting in whatever directory it was started
        // from.
        "--setting-sources",
        "",
      ],
      {
        // Nothing in the repo should be reachable even by accident.
        cwd: tmpdir(),
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          // An API key present in the environment would shadow the OAuth
          // subscription token and silently bill per token instead.
          ANTHROPIC_API_KEY: undefined,
          ANTHROPIC_AUTH_TOKEN: undefined,
        } as NodeJS.ProcessEnv,
      }
    )

    let stdout = ""
    let stderr = ""
    let settled = false
    let notionalCostUsd = 0
    let resultText: string | undefined
    let failure: string | undefined

    const timer = setTimeout(() => {
      fail(
        new Error(
          `Generation timed out after ${Math.round(TIMEOUT_MS / 1000)}s.`
        )
      )
    }, TIMEOUT_MS)

    function cleanup() {
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      if (!child.killed) {
        child.kill("SIGTERM")
      }
    }

    function fail(error: Error) {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      reject(error)
    }

    function succeed(run: ClaudeRun) {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      resolve(run)
    }

    function onAbort() {
      fail(new DOMException("Aborted", "AbortError"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })

    // The prompt goes over stdin rather than argv: a long brief plus keywords
    // can exceed the platform's argument-length limit, and the failure when it
    // does is opaque.
    child.stdin.on("error", () => {
      // The child can exit before stdin is drained; the exit handler reports it.
    })
    child.stdin.end(prompt)

    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk

      // One JSON object per line, but a chunk can split a line anywhere.
      const lines = stdout.split("\n")
      stdout = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        let event: ClaudeEvent & Record<string, unknown>
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }

        onEvent?.(event)

        if (event.type === "result") {
          const totalCost = event["total_cost_usd"]
          if (typeof totalCost === "number") {
            notionalCostUsd = totalCost
          }
          if (event.is_error || event.subtype !== "success") {
            failure = `${event.subtype ?? "error"}`
          } else if (typeof event.result === "string") {
            resultText = event.result
          }
        }
      }
    })

    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })

    child.on("error", (error: NodeJS.ErrnoException) => {
      fail(
        error.code === "ENOENT"
          ? new Error(
              `The \`${CLAUDE_BIN}\` command was not found. Install it with \`npm i -g @anthropic-ai/claude-code\`, or set CLAUDE_BIN to its full path.`
            )
          : error
      )
    })

    child.on("close", (code) => {
      if (settled) {
        return
      }

      if (failure) {
        // The CLI reports an auth problem as a normal result envelope, so this
        // is where a missing or expired token surfaces.
        if (/auth|login|credential|token/i.test(failure + stderr)) {
          return fail(
            new GenerationRefused(
              "Claude CLI is not signed in. Run `claude setup-token` and set CLAUDE_CODE_OAUTH_TOKEN, or run `claude` on this host and log in."
            )
          )
        }
        if (/limit|quota|usage/i.test(failure + stderr)) {
          return fail(
            new GenerationRefused(
              "The Claude subscription has hit its usage limit. It resets on the plan's schedule."
            )
          )
        }
        return fail(new Error(`Claude CLI failed: ${failure}`))
      }

      if (resultText === undefined) {
        return fail(
          new Error(
            code === 0
              ? "Claude CLI returned no result."
              : `Claude CLI exited with code ${code}. ${stderr.trim().slice(0, 300)}`
          )
        )
      }

      succeed({ text: resultText, notionalCostUsd })
    })
  })
}

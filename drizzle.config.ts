import { readFileSync } from "node:fs"

import { defineConfig } from "drizzle-kit"

// Next loads `.env.local` itself, but drizzle-kit runs outside Next and only
// picks up `.env`. Rather than ask for the connection string in two files, read
// the one Next already uses.
function loadEnvLocal() {
  let contents: string
  try {
    contents = readFileSync(".env.local", "utf8")
  } catch {
    return
  }

  for (const line of contents.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) {
      continue
    }
    // A quoted value keeps its inner `#`; an unquoted one ends at the comment.
    const raw = match[2].trim()
    const value =
      raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1)
        : raw.split(" #")[0].trim()

    process.env[match[1]] ??= value
  }
}

loadEnvLocal()

// TiDB Cloud refuses a plaintext connection. The app applies TLS in the pool
// options, but drizzle-kit's `url` credential takes no separate ssl object — so
// here it rides on the query string, which mysql2 parses out of the URI.
function withTls(url: string): string {
  if (!url || url.includes("ssl=")) {
    return url
  }
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}ssl=${encodeURIComponent('{"rejectUnauthorized":true}')}`
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { url: withTls(process.env.DATABASE_URL ?? "") },
})

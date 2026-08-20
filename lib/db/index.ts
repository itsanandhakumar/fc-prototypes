import { drizzle, type MySql2Database } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"

import * as schema from "@/lib/db/schema"

// The Auth.js adapter inspects this instance the moment `auth.ts` is imported,
// so the Drizzle object has to exist eagerly — it cannot be built on first
// query. Creating the pool is cheap and opens no socket, so that is fine; the
// only thing that must not happen at import time is *failing*.
//
// `next build` imports every module a route touches just to collect metadata.
// Throwing here on a missing DATABASE_URL would fail the build rather than the
// request, which is both a worse error and one CI cannot avoid without holding
// production credentials. So a missing URL warns loudly and leaves a pool that
// fails on first use instead.
const UNCONFIGURED = "mysql://forward:unconfigured@127.0.0.1:4000/forward"

function connectionUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) {
    return url
  }

  console.warn(
    "[forward] DATABASE_URL is not set — every database call will fail. " +
      "Copy .env.example to .env.local and fill in the TiDB Cloud connection string."
  )
  return UNCONFIGURED
}

function createPool() {
  return mysql.createPool({
    uri: connectionUrl(),
    // TiDB Cloud terminates TLS and will not accept a plaintext connection.
    // `rejectUnauthorized` stays on: TiDB serves a cert from a public CA, so
    // the system trust store is enough and there is no bundle to ship.
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    // TiDB Serverless closes idle connections server-side; a small pool that
    // gives up waiting rather than queueing forever fails fast and visibly
    // instead of hanging a request.
    connectionLimit: 10,
    waitForConnections: true,
    connectTimeout: 15_000,
    enableKeepAlive: true,
  })
}

// Dev hot-reload re-evaluates modules on every edit. Without this the pools
// pile up until TiDB starts refusing connections.
const globalForDb = globalThis as unknown as {
  __forwardDb?: MySql2Database<typeof schema>
}

export const db: MySql2Database<typeof schema> = (globalForDb.__forwardDb ??=
  drizzle(createPool(), { schema, mode: "default" }))

export { schema }

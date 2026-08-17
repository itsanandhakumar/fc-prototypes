import "server-only"

/**
 * The clock, read once per request.
 *
 * Reading it inside a component body is a side effect during render, and React
 * says so — the same render would give a different answer each time it ran.
 * Behind an async call it is an input to the render instead of an act of it,
 * which is what it actually is: the request happened at a moment, and this is
 * that moment.
 *
 * Everything else in the app avoids the clock entirely (see lib/time.ts). Only
 * the calendar needs one, because only the calendar names actual days.
 */
export async function currentTime(): Promise<number> {
  return Date.now()
}

/**
 * Meridian plugin: strip opencode-identifying fingerprints from the system prompt.
 *
 * Scoped to the `opencode` adapter. Runs on every opencode request — the
 * scrub is idempotent, so fork/subagent replays produce identical output.
 */

import type { Transform, RequestContext } from "./types.js"
import { scrubOpencodeFingerprints } from "./scrub.js"

export type { Transform, RequestContext } from "./types.js"

function getScrubMode(): "aggressive" | "minimal" {
  const env = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }).process?.env

  return env?.MERIDIAN_OPENCODE_SCRUB_MODE === "minimal"
    ? "minimal"
    : "aggressive"
}

const plugin: Transform = {
  name: "opencode-scrub",
  version: "0.1.0",
  description: "Strip opencode-identifying fingerprints from the system prompt before it reaches Claude",
  adapters: ["opencode"],

  onRequest(ctx: RequestContext): RequestContext {
    if (!ctx.systemContext) return ctx
    const scrubbed = scrubOpencodeFingerprints(ctx.systemContext, getScrubMode())
    if (scrubbed === ctx.systemContext) return ctx
    return { ...ctx, systemContext: scrubbed }
  },
}

export default plugin
export { scrubOpencodeFingerprints }

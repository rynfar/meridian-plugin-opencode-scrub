/**
 * Meridian plugin: strip opencode-identifying fingerprints from the system prompt.
 *
 * Runs on the `opencode` adapter and on `passthrough` requests carrying an
 * OpenCode-specific marker. LiteLLM can remove the client headers that let
 * Meridian identify OpenCode, so its requests arrive as `passthrough`.
 */

import type { Transform, RequestContext } from "./types.js"
import packageMetadata from "../package.json" with { type: "json" }
import { scrubOpencodeFingerprints } from "./scrub.js"

export type { Transform, RequestContext } from "./types.js"

// The duplicate <env> preamble is shared with genuine Claude Code traffic.
// Require an independent OpenCode/OMO marker before touching passthrough
// requests, so unrelated clients keep their original prompt bytes.
const PASSTHROUGH_OPENCODE_MARKER =
  /You are OpenCode, the best coding agent on the planet\.|You are powered by the model named |<omo-env>|<agent-identity>|You are (?:"|\*\*)Sisyphus(?:"|\*\*)[^\n]*OhMyOpenCode/

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
  version: packageMetadata.version,
  description: "Strip opencode-identifying fingerprints from the system prompt before it reaches Claude",
  adapters: ["opencode", "passthrough"],

  onRequest(ctx: RequestContext): RequestContext {
    if (!ctx.systemContext) return ctx
    if (ctx.adapter === "passthrough" && !PASSTHROUGH_OPENCODE_MARKER.test(ctx.systemContext)) return ctx
    const scrubbed = scrubOpencodeFingerprints(ctx.systemContext, getScrubMode())
    if (scrubbed === ctx.systemContext) return ctx
    return { ...ctx, systemContext: scrubbed }
  },
}

export default plugin
export { scrubOpencodeFingerprints }

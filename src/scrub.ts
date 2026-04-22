/**
 * Scrub opencode-identifying fingerprints from a system prompt.
 *
 * Targets both vanilla OpenCode (from sst/opencode's built-in `anthropic.txt`)
 * and OhMyOpenCode-style custom personas (Sisyphus, etc.). Each rule is an
 * independent, idempotent regex — if a pattern isn't present the rule no-ops,
 * so the same plugin handles both variants without configuration.
 *
 * Detection vectors scrubbed:
 *   - "OpenCode" / "opencode" brand tokens in the opening identity line and
 *     embedded prose
 *   - The feedback block pointing to github.com/anomalyco/opencode
 *   - The "When the user directly asks about OpenCode" docs paragraph
 *   - OhMyOpenCode's "Sisyphus ... from OhMyOpenCode" identity line
 *   - The runtime <omo-env> block
 *   - The self-outing "You are powered by the model named ..." line that
 *     opencode's environment() builder appends (strongest third-party tell —
 *     Claude Code never emits this phrasing)
 *   - The duplicate "Here is some useful information about the environment
 *     you are running in:" preamble + <env> block. Claude Code's preset
 *     already injects this; opencode appending its own copy makes the
 *     preamble appear twice in the final system prompt, which Anthropic's
 *     billing layer treats as a third-party-impersonation signal and gates
 *     opus behind Extra Usage (sonnet/haiku unaffected).
 *
 * Preserved: all tool policy, tone rules, task management guidance, code
 * references section, Sisyphus orchestration rules (Phase 0, explore/
 * librarian, Oracle), and any user CLAUDE.md content appended by opencode.
 */

/** Vanilla L1 identity line from anthropic.txt */
const OPENCODE_IDENTITY_LINE =
  /You are OpenCode, the best coding agent on the planet\.[^\n]*\n+/

/** Vanilla feedback block (lines 7-10 of anthropic.txt) */
const OPENCODE_FEEDBACK_BLOCK =
  /If the user asks for help or wants to give feedback[\s\S]*?github\.com\/anomalyco\/opencode[^\n]*\n+/

/** Vanilla "When the user directly asks about OpenCode..." paragraph */
const OPENCODE_DOCS_PARAGRAPH =
  /When the user directly asks about OpenCode[\s\S]*?opencode\.ai\/docs[^\n]*\n+/

/** Vanilla "Professional objectivity" sentence containing "OpenCode honestly applies" */
const OPENCODE_OBJECTIVITY_BRAND =
  /It is best for the user if OpenCode honestly applies/

/** Any residual bare "OpenCode"/"opencode" tokens in preserved prose */
const OPENCODE_BRAND_TOKEN = /\bOpenCode\b/g

/** OhMyOpenCode Sisyphus identity line */
const OMO_IDENTITY_LINE =
  /You are "Sisyphus"[^\n]*from OhMyOpenCode\.[^\n]*\n+/

/** The <omo-env>...</omo-env> block */
const OMO_ENV_BLOCK = /<omo-env>[\s\S]*?<\/omo-env>\n*/

/**
 * The runtime environment() line from opencode's session/system.ts. Claude
 * Code never emits this phrasing, so it's a strong third-party signal.
 */
const POWERED_BY_LINE =
  /You are powered by the model named [^\n]+\n/

/**
 * Opencode-injected environment block + its preamble. The preamble string
 * is the EXACT one Claude Code's preset uses — when opencode appends its
 * own copy on top of the preset, the preamble appears twice in the final
 * system prompt and Anthropic gates opus behind Extra Usage. Bisected
 * 2026-04-21: removing this block (or just the preamble line) makes opus
 * succeed; sonnet/haiku unaffected.
 */
const OPENCODE_ENV_BLOCK =
  /\nHere is some useful information about the environment you are running in:\n<env>[\s\S]*?<\/env>\n/

const GENERIC_IDENTITY =
  "You are an expert coding assistant. You help users with software engineering tasks by reading files, executing commands, editing code, and writing new files.\n"

const GENERIC_OBJECTIVITY =
  "It is best for the user if the assistant honestly applies"

export function scrubOpencodeFingerprints(systemPrompt: string): string {
  if (!systemPrompt) return systemPrompt
  return systemPrompt
    .replace(OPENCODE_IDENTITY_LINE, GENERIC_IDENTITY)
    .replace(OPENCODE_FEEDBACK_BLOCK, "")
    .replace(OPENCODE_DOCS_PARAGRAPH, "")
    .replace(OPENCODE_OBJECTIVITY_BRAND, GENERIC_OBJECTIVITY)
    .replace(OMO_IDENTITY_LINE, "")
    .replace(OMO_ENV_BLOCK, "")
    .replace(POWERED_BY_LINE, "")
    .replace(OPENCODE_ENV_BLOCK, "\n")
    .replace(OPENCODE_BRAND_TOKEN, "the assistant")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "")
}

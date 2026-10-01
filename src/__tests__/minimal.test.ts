import { afterEach, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import plugin from "../index.js"
import { scrubOpencodeFingerprints } from "../scrub.js"
const saved = process.env.MERIDIAN_OPENCODE_SCRUB_MODE
afterEach(() => { if (saved === undefined) delete process.env.MERIDIAN_OPENCODE_SCRUB_MODE; else process.env.MERIDIAN_OPENCODE_SCRUB_MODE = saved })
const runtime = `You are powered by the model named Claude Opus.
Here is some useful information about the environment you are running in:
<env>
 Working directory: /client/project
 Platform: darwin
</env>
`
const policy = "Keep my OpenCode tool policy and OhMyOpenCode project prose."
const vanilla = "You are OpenCode, the best coding agent on the planet.\n" + runtime + "\n\n\n" + policy

test("minimal removes the duplicate preamble while retaining cwd and project prose", () => {
  const out = scrubOpencodeFingerprints(vanilla, "minimal")
  expect(out).not.toContain("Here is some useful information")
  expect(out).not.toContain("You are powered by")
  expect(out).not.toContain("Platform: darwin")
  expect(out).toContain("Working directory: /client/project")
  expect(out).toContain(policy)
  expect(out).not.toContain("You are an expert coding assistant.")
  expect(out).not.toContain("\n\n\n")
  expect(scrubOpencodeFingerprints(out, "minimal")).toBe(out)
})

test("minimal retains OMO policies while removing all identity and runtime wrappers", () => {
  const source = readFileSync(join(import.meta.dir, "fixtures/omo-sisyphus-claude.txt"), "utf8")
  const out = scrubOpencodeFingerprints(source, "minimal")
  for (const marker of ["<agent-identity>", "<omo-env>", "You are **Sisyphus**", "You are powered by"]) expect(out).not.toContain(marker)
  for (const marker of ["<Role>", "**Operating Mode**:", "**Instruction priority**:"]) expect(out).toContain(marker)
  expect(scrubOpencodeFingerprints(out, "minimal")).toBe(out)
})

test("default and explicit aggressive mode retain the same result", () => {
  expect(scrubOpencodeFingerprints(vanilla)).toBe(scrubOpencodeFingerprints(vanilla, "aggressive"))
  expect(scrubOpencodeFingerprints(vanilla)).toContain("You are an expert coding assistant.")
  expect(scrubOpencodeFingerprints(vanilla)).not.toContain(policy)
})

test("the environment mode applies at each request and unknown values remain aggressive", () => {
  const ctx = { adapter: "opencode", systemContext: vanilla, metadata: {} }
  process.env.MERIDIAN_OPENCODE_SCRUB_MODE = "minimal"
  expect(plugin.onRequest?.(ctx)?.systemContext).toBe(scrubOpencodeFingerprints(vanilla, "minimal"))
  process.env.MERIDIAN_OPENCODE_SCRUB_MODE = "unknown"
  expect(plugin.onRequest?.(ctx)?.systemContext).toBe(scrubOpencodeFingerprints(vanilla))
})

test("minimal preserves genuine Claude passthrough context byte-for-byte", () => {
  process.env.MERIDIAN_OPENCODE_SCRUB_MODE = "minimal"
  const ctx = { adapter: "passthrough", systemContext: "You are Claude Code.\n\n\n" + runtime.replace(/You are powered by[^\n]+\n/, ""), metadata: {} }
  expect(plugin.onRequest?.(ctx)).toBe(ctx)
})

test("minimal still scrubs headerless OpenCode traffic", () => {
  process.env.MERIDIAN_OPENCODE_SCRUB_MODE = "minimal"
  const ctx = { adapter: "passthrough", systemContext: runtime + policy, metadata: {} }
  expect(plugin.onRequest?.(ctx)?.systemContext).not.toContain("Here is some useful information")
  expect(plugin.onRequest?.(ctx)?.systemContext).toContain("Working directory: /client/project")
})

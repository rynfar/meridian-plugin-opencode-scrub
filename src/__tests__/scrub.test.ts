import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { scrubOpencodeFingerprints } from "../scrub.js"

// Real anthropic.txt from anomalyco/opencode @ dev, fetched 2026-07-10.
const VANILLA = readFileSync(
  join(import.meta.dir, "fixtures", "opencode-anthropic.txt"),
  "utf-8",
)

// OMO (oh-my-opencode) v4.16.x Claude-routed Sisyphus prompt shape:
// <agent-identity> block (added in the 4.x line) + bold **Sisyphus** identity
// inside <Role> + <omo-env> + opencode's powered-by line.
const OMO_CLAUDE = readFileSync(
  join(import.meta.dir, "fixtures", "omo-sisyphus-claude.txt"),
  "utf-8",
)

describe("scrubOpencodeFingerprints — vanilla anthropic.txt", () => {
  test("replaces the identity line with the generic one", () => {
    const out = scrubOpencodeFingerprints(VANILLA)
    expect(out).not.toContain("You are OpenCode, the best coding agent on the planet")
    expect(out).toContain("You are an expert coding assistant.")
  })

  test("removes the feedback block and docs paragraph", () => {
    const out = scrubOpencodeFingerprints(VANILLA)
    expect(out).not.toContain("github.com/anomalyco/opencode")
    expect(out).not.toContain("opencode.ai/docs")
  })

  test("neutralizes the objectivity brand sentence and residual brand tokens", () => {
    const out = scrubOpencodeFingerprints(VANILLA)
    expect(out).toContain("It is best for the user if the assistant honestly applies")
    expect(out).not.toMatch(/\bOpenCode\b/)
  })

  test("is idempotent", () => {
    const once = scrubOpencodeFingerprints(VANILLA)
    expect(scrubOpencodeFingerprints(once)).toBe(once)
  })
})

describe("scrubOpencodeFingerprints — OMO 4.x Sisyphus (issue #1 drift)", () => {
  test("removes the <agent-identity> block entirely", () => {
    const out = scrubOpencodeFingerprints(OMO_CLAUDE)
    expect(out).not.toContain("<agent-identity>")
    expect(out).not.toContain("designated identity for this session")
    expect(out).not.toContain("always identify as Sisyphus")
  })

  test("removes the bold **Sisyphus** identity line used by Claude-routed variants", () => {
    const out = scrubOpencodeFingerprints(OMO_CLAUDE)
    expect(out).not.toContain('You are **Sisyphus**')
    expect(out).not.toContain('You are "Sisyphus"')
  })

  test("leaves no OhMyOpenCode brand token behind", () => {
    const out = scrubOpencodeFingerprints(OMO_CLAUDE)
    expect(out).not.toContain("OhMyOpenCode")
  })

  test("removes <omo-env> and the powered-by line", () => {
    const out = scrubOpencodeFingerprints(OMO_CLAUDE)
    expect(out).not.toContain("<omo-env>")
    expect(out).not.toContain("You are powered by the model named")
  })

  test("preserves the persona/orchestration rules", () => {
    const out = scrubOpencodeFingerprints(OMO_CLAUDE)
    expect(out).toContain("**Operating Mode**")
    expect(out).toContain("**Instruction priority**")
    expect(out).toContain("<Role>")
  })

  test("is idempotent on the OMO prompt", () => {
    const once = scrubOpencodeFingerprints(OMO_CLAUDE)
    expect(scrubOpencodeFingerprints(once)).toBe(once)
  })
})

describe("scrubOpencodeFingerprints — duplicate <env> block (metering trigger)", () => {
  // opencode's environment() output: powered-by line + the full <env> block
  // whose fields duplicate the Claude Code preset's own env. This is the
  // signal Anthropic meters as Extra Usage (CrazyCoder bisected 2026-04-21).
  const ENV_APPEND = `You are powered by the model named claude-haiku-4-5. The exact model ID is anthropic/claude-haiku-4-5
Here is some useful information about the environment you are running in:
<env>
  Working directory: /tmp
  Workspace root folder: /tmp
  Is directory a git repo: no
  Platform: darwin
  Today's date: Thu Jul 10 2026
</env>`

  test("keeps only the client cwd when the duplicate env block ends the string", () => {
    const out = scrubOpencodeFingerprints(ENV_APPEND)
    expect(out).toContain("<env>\n  Working directory: /tmp\n</env>")
    expect(out).not.toContain("useful information about the environment")
    expect(out).not.toContain("You are powered by the model named")
    expect(out).not.toContain("Workspace root folder")
    expect(out).not.toContain("Platform: darwin")
  })

  test("preserves the client cwd when content follows the duplicate env block", () => {
    const withTail = ENV_APPEND + "\n\nProject guidance: prefer TypeScript.\n"
    const out = scrubOpencodeFingerprints(withTail)
    expect(out).toContain("<env>\n  Working directory: /tmp\n</env>")
    expect(out).not.toContain("useful information about the environment")
    expect(out).toContain("Project guidance: prefer TypeScript.")
  })

  test("removes the duplicate env entirely when it has no working directory", () => {
    const withoutCwd = ENV_APPEND.replace("  Working directory: /tmp\n", "")
    const out = scrubOpencodeFingerprints(withoutCwd)
    expect(out).not.toContain("<env>")
    expect(out).not.toContain("useful information about the environment")
  })

  test("preserves a Windows client path for Meridian's cwd extractor", () => {
    const windows = ENV_APPEND.replace("/tmp", "C:\\Users\\Ada\\project")
    const out = scrubOpencodeFingerprints(windows)
    expect(out.match(/<env>\s*[\s\S]*?Working directory:\s*([^\n<]+)/i)?.[1]?.trim())
      .toBe("C:\\Users\\Ada\\project")
  })

  test("is idempotent on the env append", () => {
    const once = scrubOpencodeFingerprints(ENV_APPEND)
    expect(scrubOpencodeFingerprints(once)).toBe(once)
  })
})

describe("scrubOpencodeFingerprints — pass-through", () => {
  test("no-op on a prompt without opencode/OMO fingerprints", () => {
    const plain =
      "You are Claude Code, Anthropic's CLI.\n\n# Tone\nBe concise and direct."
    expect(scrubOpencodeFingerprints(plain)).toBe(plain)
  })

  test("no-op on empty input", () => {
    expect(scrubOpencodeFingerprints("")).toBe("")
  })
})


describe("keepClientCwd env forms (issue #21)", () => {
  const ENV_BLOCK = (line: string) =>
    "Here is some useful information about the environment you are running in:\n<env>\n" + line + "\nIs directory a git repo: Yes\n</env>\n"

  test("preserves Primary working directory (Claude Code form)", () => {
    const out = scrubOpencodeFingerprints("You are OpenCode, the best coding agent on the planet.\n" + ENV_BLOCK("Primary working directory: C:\\proj\\alpha"))
    expect(out).toContain("C:\\proj\\alpha")
    expect(out).not.toContain("best coding agent")
  })

  test("preserves legacy Working directory form", () => {
    const out = scrubOpencodeFingerprints(ENV_BLOCK("Working directory: /home/user/legacy"))
    expect(out).toContain("/home/user/legacy")
  })

  test("preserves uppercase/mixed-case label", () => {
    const out = scrubOpencodeFingerprints(ENV_BLOCK("Primary Working Directory: D:\\Mixed"))
    expect(out).toContain("D:\\Mixed")
  })
})

import { describe, expect, test } from "bun:test"
import { scrubOpencodeFingerprints, type ScrubMode } from "../scrub.js"

const paths = [
  "C:\\work\\OpenCode",
  "D:\\work\\OhMyOpenCode project",
  "C:\\work\\openCode mixed CASE",
  "/tmp/OpenCode",
  "/tmp/OhMyOpenCode/second project",
  "/tmp/You are powered by the model named Demo",
  "/tmp/You are OpenCode, the best coding agent on the planet.",
  "/tmp/It is best for the user if OpenCode honestly applies",
  "/tmp/When the user directly asks about OpenCode/opencode.ai/docs",
  "/tmp/If the user asks for help or wants to give feedback/github.com/anomalyco/opencode",
]

// OpenCode emits an LF environment, even on Windows. Also accept CRLF input
// without changing the cwd that Meridian's extractClientCwd reads from it.
function prompt(cwd: string, newline: string): string {
  return [
    "You are OpenCode, the best coding agent on the planet.",
    "You are powered by the model named Claude.",
    "Keep tool policy: ask before publishing.",
    "Residual OpenCode and OhMyOpenCode prose.",
    "",
    "Here is some useful information about the environment you are running in:",
    "<env>",
    `  Working directory: ${cwd}`,
    `  Workspace root folder: ${cwd}`,
    "  Platform: win32",
    "</env>",
    "",
    "Instructions from: AGENTS.md",
    "Project policy: preserve this receipt and tool guidance.",
  ].join(newline)
}

function extractCwd(text: string): string | undefined {
  return text.match(/<env>\s*[\s\S]*?Working directory:\s*([^\n<]+)/i)?.[1]?.trim()
}

for (const mode of ["aggressive", "minimal"] as const satisfies readonly ScrubMode[]) {
  describe(`client cwd metadata (${mode})`, () => {
    for (const cwd of paths) {
      test(`preserves ${cwd} through every fingerprint rule and a second scrub`, () => {
        for (const newline of ["\n", "\r\n"]) {
          const out = scrubOpencodeFingerprints(prompt(cwd, newline), mode)
          expect(extractCwd(out)).toBe(cwd)
          expect(out).toContain(`<env>\n  Working directory: ${cwd}\n</env>`)
          expect(out).not.toContain("Here is some useful information about the environment")
          expect(out).not.toContain("Workspace root folder:")
          expect(out).not.toContain("Platform: win32")
          expect(out).toContain("Instructions from: AGENTS.md")
          expect(out).toContain("Project policy: preserve this receipt and tool guidance.")
          expect(out).toContain("Keep tool policy: ask before publishing.")
          const prose = out.replace(/<env>[\s\S]*?<\/env>/g, "")
          expect(prose).not.toContain("You are powered by the model named")
          expect(prose).not.toContain("You are OpenCode, the best coding agent on the planet")
          expect(prose).toContain(mode === "minimal"
            ? "Residual OpenCode and OhMyOpenCode prose."
            : "Residual the assistant and the assistant prose.")
          expect(scrubOpencodeFingerprints(out, mode)).toBe(out)
        }
      })
    }

    test("protects canonical cwd metadata without the original preamble", () => {
      for (const cwd of paths) {
        const source = `<env>\n  Working directory: ${cwd}\n</env>\n\nKeep project policy.`
        expect(extractCwd(scrubOpencodeFingerprints(source, mode))).toBe(cwd)
      }
    })

    test("does not leak cwd between independent project requests", () => {
      for (const cwd of [paths[0], paths[1], paths[0]]) {
        expect(extractCwd(scrubOpencodeFingerprints(prompt(cwd, "\n"), mode))).toBe(cwd)
      }
    })
  })
}

for (const mode of ["aggressive", "minimal"] as const) {
  test(`protects Primary and case-varied cwd metadata before prose rules (${mode})`, () => {
    for (const label of ["Primary working directory", "primary WORKING DIRECTORY", "Working\tdirectory"]) {
      for (const cwd of ["C:\\work\\OpenCode", "/tmp/You are powered by the model named Demo"]) {
        const bare = `<env>\n  ${label}: ${cwd}\n</env>`
        const source = `Keep tool policy.\n${bare}\nResidual OpenCode prose.`
        const out = scrubOpencodeFingerprints(source, mode)
        expect(out).toContain(cwd)
        expect(out).toContain(`<env>\n  Working directory: ${cwd}\n</env>`)
        expect(out).toContain("Keep tool policy.")
        expect(scrubOpencodeFingerprints(out, mode)).toBe(out)
      }
    }
  })
}

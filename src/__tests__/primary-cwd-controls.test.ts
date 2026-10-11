import { describe, expect, test } from "bun:test"
import { scrubOpencodeFingerprints, type ScrubMode } from "../scrub.js"
import plugin from "../index.js"

const env = (line: string) =>
  "Here is some useful information about the environment you are running in:\n<env>\n" + line +
  "\nPlatform: linux\n</env>\nProject guidance: preserve this."

for (const mode of ["aggressive", "minimal"] satisfies ScrubMode[]) {
  describe(`Primary cwd controls (${mode})`, () => {
    for (const line of [
      "Primary working directory: /owned/project",
      "  PrImArY\tWoRkInG\tdIrEcToRy:\t/owned/project  ",
      "Working directory: /owned/project",
    ]) {
      test(`captures only the supported label: ${line}`, () => {
        const out = scrubOpencodeFingerprints(env(line), mode)
        expect(out).toBe("\n<env>\n  Working directory: /owned/project\n</env>\nProject guidance: preserve this.")
        expect(scrubOpencodeFingerprints(out, mode)).toBe(out)
      })
    }
    for (const line of [
      "Secondary working directory: /not-primary",
      "My Primary working directory: /not-primary",
      "Primary working directory:    ",
      "Primary working directory:<untrusted>",
    ]) {
      test(`does not broaden capture: ${line}`, () => {
        expect(scrubOpencodeFingerprints(env(line), mode)).toBe("\nProject guidance: preserve this.")
      })
    }
    test("retains case, Unicode and spaces in the path", () => {
      expect(scrubOpencodeFingerprints(env("Primary working directory: /owned/Über Project"), mode))
        .toContain("Working directory: /owned/Über Project")
    })
    test("standalone Primary context outside the duplicate block is unchanged", () => {
      const input = "Project instructions:\n<env>\nPrimary working directory: /owned/project\n</env>"
      expect(scrubOpencodeFingerprints(input, mode)).toBe(input)
    })
  })
}

test("unmarked passthrough traffic remains byte-exact", () => {
  const context = { adapter: "passthrough", model: "opus", metadata: {}, systemContext: env("Primary working directory: /owned/project") }
  expect(plugin.onRequest?.(context)).toBe(context)
})

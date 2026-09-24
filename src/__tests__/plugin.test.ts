import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import plugin from "../index.js"
import type { RequestContext } from "../types.js"

const packageVersion = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf8")).version

const opencodePrompt = `You are powered by the model named claude-haiku-4-5. The exact model ID is anthropic/claude-haiku-4-5
Here is some useful information about the environment you are running in:
<env>
  Working directory: /client/project
  Platform: darwin
</env>`

describe("opencode-scrub adapter boundary", () => {
  it("reports the shipped package version", () => {
    expect(plugin.version).toBe(packageVersion)
  })

  it("includes LiteLLM's passthrough classification and scrubs OpenCode content", () => {
    expect(plugin.adapters).toContain("passthrough")
    const ctx: RequestContext = { adapter: "passthrough", systemContext: opencodePrompt, metadata: {} }
    const result = plugin.onRequest?.(ctx)
    expect(result?.systemContext).not.toContain("You are powered by the model named")
    expect(result?.systemContext).not.toContain("Here is some useful information")
    expect(result?.systemContext).toContain("Working directory: /client/project")
  })

  it("preserves genuine Claude Code passthrough prompts byte-for-byte", () => {
    const systemContext = "You are Claude Code.\n\n\nHere is some useful information about the environment you are running in:\n<env>\n  Working directory: /client/project\n</env>\n\n"
    const ctx: RequestContext = { adapter: "passthrough", systemContext, metadata: {} }
    expect(plugin.onRequest?.(ctx)).toBe(ctx)
    expect(ctx.systemContext).toBe(systemContext)
  })

  it("preserves incidental OpenCode mentions in other passthrough prompts", () => {
    const systemContext = "Compare OpenCode and other editors.\n\n\nKeep this formatting.\n"
    const ctx: RequestContext = { adapter: "passthrough", systemContext, metadata: {} }
    expect(plugin.onRequest?.(ctx)).toBe(ctx)
  })

  it("keeps the existing direct OpenCode adapter behavior", () => {
    const ctx: RequestContext = { adapter: "opencode", systemContext: opencodePrompt, metadata: {} }
    const result = plugin.onRequest?.(ctx)
    expect(result?.systemContext).not.toContain("Here is some useful information")
    expect(result?.systemContext).toContain("Working directory: /client/project")
  })
})

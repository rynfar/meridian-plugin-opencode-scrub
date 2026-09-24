# @rynfar/meridian-plugin-opencode-scrub

A [Meridian](https://github.com/rynfar/meridian) plugin that strips OpenCode's identifying fingerprints from the system prompt before it reaches Claude.

## Why

Vanilla OpenCode's system prompt (loaded from `packages/opencode/src/session/prompt/anthropic.txt` when the model id matches `claude`) opens with `"You are OpenCode, the best coding agent on the planet."` and carries a feedback block pointing at `github.com/anomalyco/opencode`, a docs paragraph referencing `opencode.ai/docs`, and a "Professional objectivity" sentence that names `OpenCode` directly.

OpenCode's runtime `environment()` builder also prepends a line like `"You are powered by the model named claude-opus-4-6. The exact model ID is anthropic/claude-opus-4-6"` — a phrasing Claude Code never emits, which makes it a strong third-party tell.

When Meridian routes OpenCode → Claude Max, those identity sections are:

1. **Redundant** — Claude Code's preset already owns identity, tone, safety, and tool-use guidance.
2. **A detection fingerprint** — they give Anthropic's detection a clear "this isn't Claude Code" signal that can trigger third-party extra-usage errors or rate-limit flags.

This plugin surgically removes those lines and replaces the identity paragraph with a neutral, generic coding-assistant framing. It removes the duplicate environment preamble and redundant fields while keeping a bare `<env>` block with the client `Working directory` line. Tone rules, task management, tool usage policy, code references, and user CLAUDE.md content remain intact.

The scrub also handles [OhMyOpenCode](https://github.com/anomalyco/ohmyopencode)-style custom personas (Sisyphus et al.): the `You are "Sisyphus" ... from OhMyOpenCode.` identity line and the `<omo-env>...</omo-env>` block are stripped, while the persona's orchestration rules (Phase 0 intent gate, explore/librarian delegation, Oracle consultation, tone guidelines) are preserved.

The scrub is **idempotent** — running it twice on the same string is a no-op.

## Install

### Option 1: npm (recommended)

```bash
mkdir -p ~/.config/meridian && cd ~/.config/meridian
npm init -y >/dev/null
npm install @rynfar/meridian-plugin-opencode-scrub
```

Then point Meridian's plugin config at the installed file:

```bash
cat > ~/.config/meridian/plugins.json <<'JSON'
{
  "plugins": [
    {
      "path": "/Users/YOU/.config/meridian/node_modules/@rynfar/meridian-plugin-opencode-scrub/dist/index.js",
      "enabled": true
    }
  ]
}
JSON
```

Restart Meridian (or `curl -X POST http://localhost:3456/plugins/reload`).

### Option 2: Local clone (for development)

```bash
git clone https://github.com/rynfar/meridian-plugin-opencode-scrub.git ~/repos/meridian-plugin-opencode-scrub
cd ~/repos/meridian-plugin-opencode-scrub
npm install
npm run build
```

Point `~/.config/meridian/plugins.json` at `dist/index.js` in the clone.

Verify at `http://localhost:3456/plugins` — you should see `opencode-scrub` listed as **active**.

## Behavior

| Input | Output |
|---|---|
| No system prompt | unchanged |
| System prompt without OpenCode identity markers | unchanged (idempotent) |
| Vanilla OpenCode (`anthropic.txt`) | identity line swapped for generic, feedback block removed, docs paragraph removed, "OpenCode honestly applies" neutralized |
| OhMyOpenCode/Sisyphus prompt | OMO identity line removed, `<omo-env>` block removed, "You are powered by..." line removed; persona rules preserved |
| OpenCode prompt + user CLAUDE.md additions | identity stripped, all user content preserved |
| OpenCode environment preamble + `<env>` | duplicate preamble and redundant fields removed; bare `Working directory` retained for Meridian's cwd extraction |

The plugin runs for the `opencode` adapter and for `passthrough` requests that still carry an OpenCode-specific identity or runtime marker. This covers OpenCode routed through LiteLLM when its client headers are removed. Other passthrough prompts, including genuine Claude Code prompts with an `<env>` block, remain byte-for-byte unchanged.

## Rules

The scrub applies 8 independent regex replacements, each idempotent and each a no-op when its pattern is absent:

1. **Vanilla identity line** — `You are OpenCode, the best coding agent on the planet.` → generic
2. **Feedback block** — `If the user asks for help or wants to give feedback...github.com/anomalyco/opencode`
3. **Docs paragraph** — `When the user directly asks about OpenCode...opencode.ai/docs`
4. **Objectivity brand** — `It is best for the user if OpenCode honestly applies` → `...the assistant honestly applies`
5. **OMO identity line** — `You are "Sisyphus" ... from OhMyOpenCode.`
6. **OMO env block** — `<omo-env>...</omo-env>`
7. **Powered-by line** — `You are powered by the model named ...`
8. **Residual brand tokens** — bare `OpenCode` → `the assistant`

When `scrubOpencodeFingerprints` is called inside an OpenCode client hook, the
bare working-directory line keeps the client's project path available to
Meridian. Server-side use remains compatible: Meridian extracts the raw path
before applying its plugin transform.

## Development

```bash
npm install
npm run build
```

The built plugin is a single ES module at `dist/index.js` with `dist/index.d.ts` for types.

## License

MIT

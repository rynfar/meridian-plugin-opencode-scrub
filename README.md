# @rynfar/meridian-plugin-opencode-scrub

A [Meridian](https://github.com/rynfar/meridian) plugin that strips OpenCode's identifying fingerprints from the system prompt before it reaches Claude.

## Why

Vanilla OpenCode's system prompt (loaded from `packages/opencode/src/session/prompt/anthropic.txt` when the model id matches `claude`) opens with `"You are OpenCode, the best coding agent on the planet."` and carries a feedback block pointing at `github.com/anomalyco/opencode`, a docs paragraph referencing `opencode.ai/docs`, and a "Professional objectivity" sentence that names `OpenCode` directly.

OpenCode's runtime `environment()` builder also prepends a line like `"You are powered by the model named claude-opus-4-6. The exact model ID is anthropic/claude-opus-4-6"` — a phrasing Claude Code never emits, which makes it a strong third-party tell.

When Meridian routes OpenCode → Claude Max, those identity sections are:

1. **Redundant** — Claude Code's preset already owns identity, tone, safety, and tool-use guidance.
2. **A detection fingerprint** — they give Anthropic's detection a clear "this isn't Claude Code" signal that can trigger third-party extra-usage errors or rate-limit flags.

This plugin surgically removes those lines and replaces the identity paragraph with a neutral, generic coding-assistant framing. Everything else in OpenCode's prompt (tone rules, task management, tool usage policy, code references, the env block, any user CLAUDE.md appended by OpenCode) is preserved verbatim.

The scrub also handles [OhMyOpenCode](https://github.com/anomalyco/ohmyopencode)-style custom personas (Sisyphus et al.): the `You are "Sisyphus" ... from OhMyOpenCode.` identity line and the `<omo-env>...</omo-env>` block are stripped, while the persona's orchestration rules (Phase 0 intent gate, explore/librarian delegation, Oracle consultation, tone guidelines) are preserved.

The scrub is **idempotent** — running it twice on the same string is a no-op.

## Modes

The plugin supports two modes via `MERIDIAN_OPENCODE_SCRUB_MODE`:

- **`aggressive`** (default) — current behavior. Strips duplicate OpenCode env preamble, strips `<omo-env>`, replaces the identity line with a generic one, and normalizes leftover spacing.
- **`minimal`** — removes only the strongest fingerprint lines while preserving prompt structure. Keeps `<env>` and `<omo-env>` blocks intact and does not inject a replacement identity line.

Example:

```bash
MERIDIAN_OPENCODE_SCRUB_MODE=minimal meridian
```

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
| Vanilla OpenCode (`anthropic.txt`) | aggressive: identity line swapped for generic; minimal: identity line removed; both remove feedback/docs blocks and neutralize `OpenCode honestly applies` |
| OhMyOpenCode/Sisyphus prompt | aggressive: OMO identity + `<omo-env>` removed; minimal: only OMO identity removed; both remove `You are powered by...`; persona rules preserved |
| OpenCode prompt + user CLAUDE.md additions | identity stripped, all user content preserved |

The plugin is scoped to `adapters: ["opencode"]`, so it has no effect on requests from pi, Crush, Droid, ForgeCode, or the passthrough adapter.

## Rules

The aggressive scrub applies 8 independent regex replacements, each idempotent and each a no-op when its pattern is absent. Minimal mode applies only rules 1-5 and 7:

1. **Vanilla identity line** — `You are OpenCode, the best coding agent on the planet.` → generic
2. **Feedback block** — `If the user asks for help or wants to give feedback...github.com/anomalyco/opencode`
3. **Docs paragraph** — `When the user directly asks about OpenCode...opencode.ai/docs`
4. **Objectivity brand** — `It is best for the user if OpenCode honestly applies` → `...the assistant honestly applies`
5. **OMO identity line** — `You are "Sisyphus" ... from OhMyOpenCode.`
6. **OMO env block** — `<omo-env>...</omo-env>`
7. **Powered-by line** — `You are powered by the model named ...`
8. **Residual brand tokens** — bare `OpenCode` → `the assistant`

`aggressive` also strips OpenCode's duplicate `<env>` preamble block; `minimal` preserves it.

## Development

```bash
npm install
npm run build
```

The built plugin is a single ES module at `dist/index.js` with `dist/index.d.ts` for types.

## License

MIT

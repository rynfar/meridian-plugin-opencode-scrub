# Primary working directory preservation — #21 / source #22

Disposition: **accept with scope correction, held for live acceptance**.
No merge, issue closure, release or publication is claimed.

## Authored incorporation

- Baseline main: `77316d2` (minimal mode and environment dedup already shipped).
- Source: `50e9526a2cd53198a513483bcdf0209cacd9003d`.
- Authored cherry-pick: `fb7a6231eab8b1d7e37bc2f7a75c34f42ebdd6d7`.
- Author: Mohamed R. Khalil <m.radwan.khalil@gmail.com>, authored
  2026-10-07 23:02:51 UTC. Author and AuthorDate are unchanged.
- Maintainer scope note, controls and manual probe are separate changes.

The reported omission is real: the whole duplicate environment block is
replaced, but its cwd capture previously accepted only `Working directory:`.
An optional, line-anchored `Primary` prefix preserves the new form. It does not
broaden to arbitrary labels or change the first-match rule. Existing brand,
identity, environment dedup, minimal/aggressive and passthrough-marker guards
are retained.

**Scope correction:** Meridian's server-side request transform runs after
cwd/session selection. This fixes model-visible context and consumers that
scrub before parsing a request; it does not demonstrate a server-side
session-keying failure. The reporter confirmed this in issue #21's October 10
comment. No new public interface is added.

## Regression evidence

On unchanged main with the contributor's tests only: the Primary and
mixed-case Primary assertions fail; the legacy control passes. After the
cherry-pick: all 31 tests pass.

The expanded exact-output controls run both modes, support case/tab/Unicode/
space variations, reject unrelated/blank/tag-only labels, check idempotence,
keep standalone context untouched, and retain byte-exact unmarked passthrough.
With these identical controls on unchanged main: 41 pass / 6 fail (all the
Primary-specific assertions). Candidate: 50 pass / 0 fail. `npm ci`,
`npm run build` and `npx tsc --noEmit` pass on Darwin arm64, Bun 1.3.14.
Windows paths are string fixtures, not a native Windows certification.

## Manual headless real-client probe

```sh
E2E_MERIDIAN_ROOT=/absolute/built/meridian \
E2E_PLUGIN_PATH=/absolute/independently-installed-scrub/dist/index.js \
E2E_LIVE_PROFILE_FILE=/private/access-only-profiles.json \
E2E_MODEL=claude-opus-5-5 E2E_SCRUB_MODE=aggressive \
bun scripts/e2e-primary-cwd.mjs
```

The input is a private single `oauth-token` profile with **no refresh token**.
The script isolates HOME, configuration, XDG, sessions, proxy and project;
uses tested `setup --v1`; verifies exactly one package-matching Meridian client
plugin; and retains actual route/session/signed-turn witnesses. It runs actual
OpenCode and observes, rather than replaces, the actual SDK. A before hook
changes the real client's environment line to the reported Primary form with
an owned context directory distinct from SDK cwd. That distinction prevents
the SDK's own environment preset from falsely satisfying the assertion.
The transform occurs after Meridian's cwd choice, matching the scoped defect.

Apply the same final preservation assertion to independently installed baseline
and candidate packages. Require successful original client and real SDK result,
matching served model, retained cwd in both the post-hook prompt and actual SDK
append, unchanged identity/fingerprint guards, and closed client/relay/query
lifetimes. Generated wording is not the assertion.

### First failures and remaining gate

The first Opus arm had a flawed fixture: inherited client cwd did not match the
expected canonical path, the SDK's own cwd could make its append check pass,
and the client automatically retried a provider refusal six times. It is **not**
a red acceptance control. The script now injects a unique owned context path,
fixes actual V1 route witnesses, and stops the client on the first failed SDK
result. Those changes do not turn the old failure into product evidence.

The corrected Haiku baseline arm made one actual SDK query. Actual OpenCode
1.18.34, Meridian 1.80.0 at `6e510dbcb`, SDK 0.2.141, Darwin arm64:

- Real V1 plugin-generated session/signed-turn headers reached `/messages`.
- Primary-form fixture armed on `adapter=opencode` with the owned context path.
- Unchanged scrub dropped that path; actual SDK append also lacked it.
- Provider returned an error result with served model `<synthetic>`; no valid
  completion. The original client was stopped and its close/pipe event joined;
  the relay closed with zero active handlers or sockets, and the SDK iterator
  completed before proxy close returned.

The actual provider refusal on the first Opus arm was `rate_limit_error`.
A separate read-only OAuth usage lookup reported the current account's
seven-day utilization at 100%, resetting 2026-10-11 16:59:59 UTC. This is a
provider-access hold, not evidence that the fix fails, and not a request to
refresh login or enable paid Extra Usage. No native credentials were refreshed
or written. No further model attempts or alternate accounts were used.

`primary-cwd-22-probe.json` retains sanitized facts. Raw generated client logs
are private; they are not the sole evidence record. **Successful identical
baseline/candidate real-client assertions and both-mode candidate controls
remain unrun.** Do not merge source #22 or close #21 until those gates pass.
The manual probe itself remains pending final independent live qualification.

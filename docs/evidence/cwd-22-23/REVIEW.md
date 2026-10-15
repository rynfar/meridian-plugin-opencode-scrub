# Client cwd preservation: PRs 22 and 23

Disposition: merged as the contributors' own pull requests under contributor attribution rules (`rynfar/meridian#1363`). Base `main` was `77316d2`.

## Landed contributor commits on `main`

- **PR #22** (`50e9526a2cd53198a513483bcdf0209cacd9003d` -> `cf047f81a11ecc17a9cb90cf7574d2938339d9e3`):
  - Author on `main`: `Mohamed R. Khalil <m.radwan.khalil@gmail.com>`
  - Closes issue #21 (`fix(scrub): capture Primary working directory form in keepClientCwd`).
- **PR #23** (`ef058ab2cc700796fcad3f4b8b88cb6debfc43eb` + maintainer merge/canonicalization `b92ec65371a6d70bebc96fb87a82cd3068cbb9a3` -> `c59fa180a67bdc0e92e54335faf37192df334b5c`):
  - Author on `main`: `Sergio Márquez <44240815+sergiomarquezdev@users.noreply.github.com>`
  - Co-authored-by: `Trevor Walker <37091216+rynfar@users.noreply.github.com>` (for the conflict resolution with #22 and canonicalization of bare `Primary` / tabbed working-directory labels).
- Former maintainer integration draft PR #24 (`codex/cwd-preservation-22-23-20261012`) was closed unmerged so neither contributor's work was squash-landed under a maintainer commit.

## Adversarial review & interaction findings

On unchanged `main` (`77316d2`), #23's 24 added regressions produce 23 failures (29 total passes), reproducing Windows/Unix brand-path corruption and instruction-like path truncation. The two authored changes together pass 55 tests.

Adversarial review found two interaction gaps between #22 and #23:
1. The extraction helper (`clientCwd`) accepted `Primary` and case/whitespace variants, but the block protection matcher (`CLIENT_CWD_ENV_BLOCK`) did not, so bare cwd metadata with `Primary working directory` or `Working\tdirectory` could still be rewritten before extraction.
2. Bare `Working\tdirectory` survived prose rules once matched, but Meridian's `extractClientCwd` parser requires the canonical space-separated `<env>\n  Working directory: ${cwd}\n</env>` label.

The maintainer commit on #23 (`b92ec65`) resolved the merge conflict with #22, expanded `CLIENT_CWD_ENV_BLOCK` to match optional `Primary` and case/whitespace variants, and canonicalized every retained `<env>` block to `Working directory: ${cwd}`. All 57 unit tests (625 assertions) and `npm run build` pass.

## Installed package / Meridian loader & parser integration

`scripts/e2e-cwd-package.mjs` loads the built plugin through Meridian's actual plugin loader and transform runner (`src/proxy/plugins/loader.ts`, `src/proxy/transform.ts`) and verifies output with Meridian's production `extractClientCwd` and `getConversationFingerprint` (`src/proxy/session/fingerprint.ts`). It asserts active plugin identity before requests, 98 successful hook invocations and zero errors after, and unchanged unmarked passthrough traffic across all 48 cases (`PASS`, 0 failed).

Exact reproduction:

```sh
E2E_MERIDIAN_ROOT=/absolute/meridian \
E2E_PLUGIN_PATH=/absolute/independent/install/dist/index.js \
E2E_REPORT=/absolute/owned/report.json bun scripts/e2e-cwd-package.mjs
```

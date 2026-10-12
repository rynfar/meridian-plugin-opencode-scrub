# Client cwd preservation: PRs 22 and 23

Disposition: accept both with a maintainer interaction correction; affected-client
acceptance and final CI remain open. Base main `77316d2`.

Contributor authorship/date retained by actual cherry-picks:

- #22 `50e9526a2cd53198a513483bcdf0209cacd9003d` → `8ea0a3c`,
  Mohamed R. Khalil <m.radwan.khalil@gmail.com>, 2026-10-07T23:02:51Z.
- #23 `ef058ab2cc700796fcad3f4b8b88cb6debfc43eb` → `2de2298`,
  Sergio Márquez <marquezpsergio@gmail.com>, 2026-10-12T10:30:29Z.

The conflict was resolved by retaining #22's optional Primary label in #23's
extracted clientCwd helper. Contributor PR heads/discussion were refreshed;
neither had reviews or comments. No package version, dependencies or public
plugin interface change.

On unchanged main, #23's 24 added regressions produce 23 failures (29 total
passes), reproducing Windows/Unix brand-path corruption and instruction-like
path truncation. The two authored changes together pass 55 tests. Adversarial
review found an interaction gap: the extraction helper accepted Primary and
case/whitespace variants, but the block protection matcher did not. Bare cwd
metadata could still be rewritten before extraction. New controls fail in both
modes before correction (55 pass / 2 fail). The separate maintainer correction
makes the protection matcher accept the same label forms; all 57 tests and
TypeScript build pass afterward. Exact before/after logs are adjacent.

Product fit: cwd is opaque client metadata, not fingerprint prose. Protecting it
before identity replacements preserves project/session identity while leaving
ordinary prose scrubbing, project instructions, adapter guards and per-request
isolation intact. Reviewed generated/bare blocks, LF/CRLF, repeated scrubbing,
minimal/aggressive behavior and contribution interaction. No shared mutable
request state or placeholder collision is introduced.

The contributor reports Windows OpenCode 2.0.27 / opencode-with-claude 1.11.1
fixture integration in #23, but no executable/artifact is included in that PR.
That report is not independently reproduced here. These local string regressions
are not native Windows or live model acceptance. Required remaining evidence:
commit a reproducible actual-client cwd/tool/continuation harness, qualify both
client and server scrub plugins, independently installed package, affected
platform/client/model and final-head CI. Do not close #21/#22/#23 or publish until
those applicable gates are established. No credentials or model calls were used.


## Installed package/parser integration found and corrected another defect

The new committed `scripts/e2e-cwd-package.mjs` loads the independently installed
plugin through Meridian's actual loader/transform runner and checks output with
its production cwd extractor and conversation fingerprint. It asserts active
identity before requests, 98 successful hook invocations and zero errors after,
plus unchanged genuine unmarked passthrough traffic. It requires no credentials,
client process or model. Windows paths here are string fixtures, not Windows E2E.

The c3ec923 package failed six of 48 cases: bare `Working\tdirectory` survived
prose rules, but Meridian's parser requires the canonical space-separated label.
The separate correction canonicalizes every protected block's label while
preserving its path. The independently repacked/reinstalled correction passes all
48 cases, including stable history identity, repeated scrubbing and instructions.
All 57 unit tests still pass (625 assertions), and build/pack pass. The published
0.2.3 package fails all 48 cases; its older implementation does not implement the
current source's mode behavior, so those mode labels describe requested env,
not proof the registry package supports minimal mode.

Reports hash both index.js and scrub.js: entrypoint identity alone does not
identify a changed imported implementation. Adjacent package integrity records
identify the separately installed intermediate and corrected tarballs. Exact
reproduction (Bun, a built Meridian checkout containing mandatory scrub preflight):

```sh
E2E_MERIDIAN_ROOT=/absolute/meridian \
E2E_PLUGIN_PATH=/absolute/independent/install/dist/index.js \
E2E_REPORT=/absolute/owned/report.json bun scripts/e2e-cwd-package.mjs
```

This completes the installed-plugin/parser boundary gate only. Actual native
Windows/client tool execution and live SDK/model/continuation remain unverified;
no merge, source closure or release is claimed.

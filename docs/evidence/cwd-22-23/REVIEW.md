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

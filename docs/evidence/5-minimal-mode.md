# OpenCode scrub #5: minimal mode with runtime deduplication

## Accepted behavior and contributor credit

Source PR [#5](https://github.com/rynfar/meridian-plugin-opencode-scrub/pull/5)
head `40094cd9adaef32456befa54c1b969d611785395`, by briankeefe
`brian.c.keefe@gmail.com`, was cherry-picked as
`eddcf85a40701b94c6b95cfbe16b7cd644d57350`, preserving Author/AuthorDate.
A separate maintainer correction restores current main's package metadata,
passthrough guard, OMO 4.x fixes and newline handling before adding the mode.
The owner's July 10 review explicitly welcomes this opt-in feature and requires
runtime environment removal to remain enabled.

Unset/unknown modes keep aggressive behavior. `minimal` removes known identity
and runtime fingerprints, preserves client cwd and project/persona policy, and
avoids a generic replacement identity and residual brand-word rewriting. It
still removes duplicate environment preambles in both modes. No release,
package-version bump or core Meridian API change is part of this delivery.

## Before/after and meaningful controls

The actual authored minimal implementation retained the vanilla environment
preamble: `preambleRetained=true, cwdRetained=true, identityGeneric=false,
policyRetained=true`. This reproduces the owner's blocking finding with the
source function, rather than inferring it from a green unit suite.

Corrected tests cover vanilla environment removal/cwd/project preservation,
OMO fixture identity removal with tool/persona policy intact, idempotence,
request-time mode switching, unknown-value default, genuine Claude passthrough
identity and headerless OpenCode requests. Full suite: 28 passed, zero failed.
Standalone TypeScript and build pass; default outputs are byte-identical to
current main for both real prompt fixtures. An initial test expected an OMO
marker absent from the fixture; corrected the test to assert actual Operating
Mode/Instruction priority markers. No product defect claimed for that setup error.

## Actual headless client proof

Independently `npm pack`ed and installed the built plugin tarball in a disposable
npm project (version remains 0.2.3; not published). Both modes ran through actual
OpenCode **1.18.33**, Meridian **1.79.0** compiled from tested PR #1209 head
`d08011f8624d62ef8f66d261cc9b1295eaf7883d`, SDK **0.2.141**, Claude Code
**2.1.284**, actual **claude-opus-5-5**, Node on macOS arm64. Credentials are
read-only; request bodies/client output stay in private temporary directories.

| Mode | Actual read tools | Random client-only receipt in SDK request | Same client session continuation | Client errors | Scrub invocations/errors |
| --- | --- | --- | --- | --- | --- |
| minimal | 1 | yes | yes | 0 | 4 / 0 |
| aggressive | 1 | yes | yes | 0 | 4 / 0 |

In both runs the actual pre-transform main requests have powered-by/environment
preambles and cwd. Post-transform requests remove both fingerprints and retain
cwd. Minimal post-transform contexts have no generic identity; aggressive main
requests have the generic identity. This establishes the mode distinction in
actual client traffic. The title request has no tools or fingerprint and is
unchanged. The private receipt proves actual client execution and SDK delivery;
client exit zero alone would not establish that.

Escrowed harness: [scripts/e2e-minimal-opencode.mjs](../../scripts/e2e-minimal-opencode.mjs).
Reproduce after building Meridian and independently installing a packed plugin:

```sh
npm test
npx tsc --noEmit
npm run build
npm pack --pack-destination /private/tmp
# Install the resulting tarball in a disposable npm project; use its dist/index.js.
E2E_MERIDIAN_ROOT=/path/to/built/meridian \
E2E_PLUGIN_PATH=/path/to/disposable/node_modules/@rynfar/meridian-plugin-opencode-scrub/dist/index.js \
E2E_SCRUB_MODE=minimal node scripts/e2e-minimal-opencode.mjs
# Repeat with E2E_SCRUB_MODE=aggressive.
```

The harness requires OpenCode and existing Claude subscription credentials. It
uses isolated client/config/session directories and asserts actual tool results,
completed text, zero JSON error events, same-session continuation, plugin stats
and pre/post runtime fields. It preserves sanitized outcome summaries without
publishing raw prompts, credentials or session IDs.

## Adversarial findings and limits

The original feature's environmental preservation is corrected; current main's
adapter and passthrough guards survive reconciliation. No unrestricted brand
rewrite occurs in minimal preserved prose, while known identity wrappers are
still removed. Pure negative controls preserve genuine Claude context unchanged.
Actual client tools and continuation succeed in both modes. No public plugin
configuration/lifecycle change, server dependency or global credentials write.

The contributor's original failing client/model/flow was not specified. These
results do not claim to reproduce that original instability, guarantee billing
classification, or test a live OhMyOpenCode installation; OMO coverage uses the
repository's actual fixture. Billing classification can change upstream, so a
passing run alone is not a permanent metering guarantee. Durable results above
survive temporary local logs; full headless harness remains in the repository.

# Changelog

## [0.3.0](https://github.com/rynfar/meridian-plugin-opencode-scrub/compare/meridian-plugin-opencode-scrub-v0.2.3...meridian-plugin-opencode-scrub-v0.3.0) (2026-10-01)


### Features

* add minimal scrub mode with environment deduplication ([#19](https://github.com/rynfar/meridian-plugin-opencode-scrub/issues/19)) ([77316d2](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/77316d2ba4ed77ef3d5f12e40256ba1c3699d85a))

## [0.2.3](https://github.com/rynfar/meridian-plugin-opencode-scrub/compare/meridian-plugin-opencode-scrub-v0.2.2...meridian-plugin-opencode-scrub-v0.2.3) (2026-09-24)


### Bug Fixes

* report OpenCode scrub package version ([#16](https://github.com/rynfar/meridian-plugin-opencode-scrub/issues/16)) ([015d373](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/015d373d663ac4b1bc6ccc95f80bc5bfb265d2d1))

## [0.2.2](https://github.com/rynfar/meridian-plugin-opencode-scrub/compare/meridian-plugin-opencode-scrub-v0.2.1...meridian-plugin-opencode-scrub-v0.2.2) (2026-09-24)


### Bug Fixes

* scrub OpenCode prompts routed through LiteLLM ([#14](https://github.com/rynfar/meridian-plugin-opencode-scrub/issues/14)) ([c517a2c](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/c517a2c374e36cf859d8ec1398ce35b1cc0e9aa6))

## [0.2.1](https://github.com/rynfar/meridian-plugin-opencode-scrub/compare/meridian-plugin-opencode-scrub-v0.2.0...meridian-plugin-opencode-scrub-v0.2.1) (2026-09-23)


### Bug Fixes

* OMO 4.x identity drift + robust &lt;env&gt; stripping ([#1](https://github.com/rynfar/meridian-plugin-opencode-scrub/issues/1)) ([#6](https://github.com/rynfar/meridian-plugin-opencode-scrub/issues/6)) ([59a1bfc](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/59a1bfce767d1994a4bb6a700373e4c11aef3633))
* retain client cwd when scrubbing OpenCode env ([245512f](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/245512f303d96d24a40cc7a5e27eee55bbaaf8e7))
* validate optional Meridian dispatch condition ([#12](https://github.com/rynfar/meridian-plugin-opencode-scrub/issues/12)) ([8ace4ca](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/8ace4ca10551c168dc024355d782c4cef491aac5))

## [0.2.0](https://github.com/rynfar/meridian-plugin-opencode-scrub/compare/meridian-plugin-opencode-scrub-v0.1.0...meridian-plugin-opencode-scrub-v0.2.0) (2026-04-26)


### Features

* initial opencode-scrub plugin with vanilla + OhMyOpenCode support ([a3eb086](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/a3eb086d6ee1a27d12944337111f0106a05a1bda))
* scrub duplicate &lt;env&gt; preamble that triggers Anthropic billing gate ([5e9f730](https://github.com/rynfar/meridian-plugin-opencode-scrub/commit/5e9f730487c4358821f942ed356966d1d95ab19d))

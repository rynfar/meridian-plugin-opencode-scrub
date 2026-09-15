# Publishing

Package: `@rynfar/meridian-plugin-opencode-scrub` (public).

After the first publication, configure npm's trusted publisher with:

- GitHub owner: `rynfar`
- Repository: `meridian-plugin-opencode-scrub`
- Workflow: `release-please.yml`
- Environment: leave blank

GitHub-hosted Actions use OIDC with npm 11.19.1. No `NPM_TOKEN` is
needed for subsequent releases. Each publish runs tests and builds first.
The version in `package.json` must not already exist on npm.

First publication requires an authenticated maintainer. Verify the package
contents with `npm pack --dry-run` before publishing. Do not commit credentials.

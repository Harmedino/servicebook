# Changelog

Notable changes to ServiceBook. Each release is a git tag `vMAJOR.MINOR.PATCH` on `main`, and client deployments are built from those tags as [docs/RELEASING.md](docs/RELEASING.md) describes. Dates are written YYYY-MM-DD.

Changes are grouped under **Added**, **Changed**, **Removed**, **Fixed** and **Security**. Every release also has an **Upgrading** section. Read it before you move any client to that release. It always has these five lines, with "None" where nothing applies:

- **Backup required:** "yes" when the release rewrites stored data, otherwise "no". Take a backup before every upgrade anyway ([Backups](docs/RELEASING.md#backups)).
- **Environment:** variables that are new, renamed or removed, each with its default and what happens if it isn't set.
- **Migrations:** what runs at start-up, what it changes, and where its report goes.
- **Manual steps:** anything to do by hand, in order, and whether it comes before or after the deploy.
- **Deploy order:** the API first, then the website, unless the notes say otherwise.

## Unreleased

Work towards the first release sold to single businesses: one business per deployment, set up by configuration, never code.

### Added

- `docs/RELEASING.md`: the freeze of the multi-business version, the seller's checklist for it, branches and tags, the rules every release keeps, cutting and rolling out a release (demo first, API before website), backups and rolling back.
- This changelog, and a link to both files from the README's Deploying section.

### Upgrading

- **Backup required:** no.
- **Environment:** none.
- **Migrations:** none.
- **Manual steps:** before anything else merges into `main`, the seller finishes the [checklist in docs/RELEASING.md](docs/RELEASING.md#sellers-checklist): push `saas-final` and `saas-legacy`, pin the live API and website to `saas-legacy`, prove that `main` no longer deploys, and tell the hosted site's real users.
- **Deploy order:** nothing to deploy; this changes documentation only.

## saas-final - 2026-10-02 (frozen, not a release)

The last multi-business version of ServiceBook, as the hosted SaaS site ran it: anyone could sign up and run their business on one shared site, next to the marketing pages, the public roadmap and the shared demo salon. It is the annotated tag `saas-final` and the branch `saas-legacy`, both at `fb3ea94` (created 2026-10-11).

It is kept so it can always be recovered. No client runs it. The single-business releases run one business per database, so the hosted site's database stays with this version until the site becomes the sales demo on a new database ([What happens to the hosted site later](docs/RELEASING.md#what-happens-to-the-hosted-site-later)).

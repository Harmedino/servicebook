# Releasing ServiceBook

How versions of ServiceBook are cut and rolled out to clients, and the one-time freeze of the old multi-business (hosted SaaS) version.

This file is for the **seller**: the person who owns this codebase and sells a copy of it to each client. "You" below is the seller. "Owner" keeps its meaning from the rest of ServiceBook: a client's login.

## Contents

1. [Step zero: freeze the SaaS version](#step-zero-freeze-the-saas-version)
2. [Branches and tags](#branches-and-tags)
3. [Rules every release keeps](#rules-every-release-keeps)
4. [Cutting a release](#cutting-a-release)
5. [Rolling out a release](#rolling-out-a-release)
6. [Backups](#backups)
7. [Rolling back](#rolling-back)

---

## Step zero: freeze the SaaS version

ServiceBook is changing from one hosted site shared by many businesses into a product sold as a separate copy to each client. The hosted site must keep running the old version while that work merges, so the old version is frozen first.

**Nothing from the single-business work, this file included, may merge into a branch that a live site deploys from until the [seller's checklist](#sellers-checklist) is done.**

### The frozen version

| Name | Kind | Points at | State |
|---|---|---|---|
| `saas-final` | Annotated tag: "Last multi-business (SaaS) version, before the single-business rebuild" | `fb3ea94cccfa9afe185f7e900b929766bb29ecf4` ("Merge #28" of 2026-10-02, the head of `main` when the freeze was made) | Created locally on 2026-10-11. **Not pushed yet.** |
| `saas-legacy` | Branch | The same commit | Created locally on 2026-10-11. **Not pushed yet.** |

- The two names differ on purpose: a tag and a branch with the same name make git refs ambiguous, and hosts deploy branches, not tags.
- Never move, rebase or delete either of them. The tag records the old version; the branch is what the live projects build from.
- Pushing them from the environment that created them was refused (HTTP 403 from its git proxy), so pushing them is step 3 of the checklist. The commit itself stays in the history of `main` (the default branch) either way, so the old version can't be lost. The live projects still need the pushed `saas-legacy` branch to stay on it.

### What the live projects deploy

Expected: both live projects build from `main`, and both serve `fb3ea94`. The dashboards couldn't be read when this file was written, so the last column is empty. Fill it in (step 1) and commit this file on the single-business work branch, never on `main` before step 8.

| Project | Setting | Expected | Confirmed in the dashboard |
|---|---|---|---|
| API on Render (the web service created from `render.yaml`) | Branch | `main` | |
| | Commit of the deploy that is live | `fb3ea94` | |
| | Auto-Deploy | On | |
| | Managed by a Blueprint | Probably (the repo has a `render.yaml`) | |
| | Pull request previews | Off | |
| Website on Vercel (root directory `apps/web`) | Production branch | `main` | |
| | Commit of the current Production deployment | `fb3ea94` | |
| | Preview deployments for other branches | On (Vercel's default) | |
| | Ignored Build Step | None | |

Where to look:
- **Render:** the service's **Events** list shows the commit of the live deploy. **Settings → Build & Deploy** shows the branch and Auto-Deploy. A service created from a Blueprint says so on its page, and the **Blueprints** page lists it. Pull request previews are in the service's settings when the workspace offers them.
- **Vercel:** **Deployments** shows the Production deployment marked as current, with its branch and commit. The production branch is under **Settings → Environments → Production** (under **Settings → Git** on older dashboards). The Ignored Build Step is under **Settings → Git** or **Settings → Build and Deployment**.
- Dashboards get reorganised. If a setting isn't where this says, search the host's docs for it by name.

**If a live project serves a commit other than `fb3ea94`, stop.** The freeze must point at what is live. Before pushing anything, recreate the tag and branch at the live commit, then update both tables:

```bash
git tag -d saas-final
git tag -a saas-final <live commit> -m "Last multi-business (SaaS) version, before the single-business rebuild"
git branch -f saas-legacy <live commit>
```

### Seller's checklist

Do these in order. Tick each box here and commit the file on the work branch, so anyone reading it knows where things stand. Until steps 4 and 5 are done, any commit on `main` redeploys the live site.

1. [ ] **Fill in the table above** from the Render and Vercel dashboards.

2. [ ] **Back up the live database** with `mongodump` (see [Backups](#backups)), using the `MONGODB_URI` from the Render service's environment. Keep the file private: it holds every business on the hosted site and their customers' details.

3. [ ] **Push the tag and the branch.** In the checkout that has them:

   ```bash
   git rev-parse 'saas-final^{commit}' saas-legacy   # both print fb3ea94cccfa9afe185f7e900b929766bb29ecf4
   git push origin saas-final
   git push origin saas-legacy
   ```

   In any other clone, create them first. The commit is already in `main`'s history:

   ```bash
   git fetch origin
   git tag -a saas-final fb3ea94cccfa9afe185f7e900b929766bb29ecf4 -m "Last multi-business (SaaS) version, before the single-business rebuild"
   git branch saas-legacy fb3ea94cccfa9afe185f7e900b929766bb29ecf4
   ```

   Optional: on GitHub, add a ruleset that blocks updates to and deletion of the `saas-legacy` branch and the `saas-final` tag.

4. [ ] **Pin the API on Render to `saas-legacy`.**
   - Set the service's branch to `saas-legacy`. The live deploy keeps running; if Render starts a deploy for the change, it builds the same commit (`fb3ea94`), so nothing changes.
   - If a Blueprint manages the service, point the Blueprint at `saas-legacy` too, or turn its automatic sync off. Otherwise a sync can put the branch back to `main`, and later changes to `render.yaml` on `main` would change the live service. Look at the service's branch again after any sync.
   - Turn pull request previews off if they're on. A preview gets the live service's environment, so it would run new code against the live database.
   - If the branch can't be changed, turn Auto-Deploy off instead, and never use **Manual Deploy → Deploy latest commit** on this service.

5. [ ] **Pin the website on Vercel to `saas-legacy`.**
   - Set the production branch to `saas-legacy`. The current Production deployment stays live.
   - Stop Vercel building any other branch, so pushes to `main` don't publish previews of the new code. Set the Ignored Build Step to:

     ```bash
     if [ "$VERCEL_GIT_COMMIT_REF" = "saas-legacy" ]; then exit 1; else exit 0; fi
     ```

     Vercel builds when this command exits with 1 and skips the build when it exits with 0.
   - If the production branch can't be changed, the Ignored Build Step alone still stops every new deploy from `main`.

6. [ ] **Prove that `main` no longer deploys.** Push an empty commit to `main`:

   ```bash
   git switch main
   git pull --ff-only
   git commit --allow-empty -m "chore: check the live site no longer deploys from main"
   git push origin main
   ```

   Then check:
   - **Render:** no new deploy appears in Events. The live deploy is still `fb3ea94`.
   - **Vercel:** no Production deployment starts for the new commit (it is skipped, or doesn't appear). The current Production deployment is still `fb3ea94`.
   - **The live site** still works: the home page and the demo load, and a booking page shows free times.

   If either host starts deploying from `main`, cancel that deploy and go back to step 4 or 5.

7. [ ] **Tell any real users of the hosted site what happens next, and offer them an export.**
   - Find them. Every business except the demo salon is a real sign-up. The demo is found by its owner's login (`demo@servicebook.app`) rather than its slug (`glow-studio-lekki`), because the slug is free for a sign-up to take while the demo is being rebuilt:

     ```bash
     mongosh "<live MONGODB_URI>" --quiet --eval '
       const demo = db.users.findOne({ email: "demo@servicebook.app" });
       db.businesses.find({ ownerId: { $ne: demo ? demo._id : null } }).forEach((b) => {
         const owner = db.users.findOne({ _id: b.ownerId });
         print(b._id.toString(), b.slug, b.name, owner && owner.email,
           b.createdAt.toISOString(), db.bookings.countDocuments({ businessId: b._id }) + " bookings");
       })'
     ```

   - Write to each owner. Something like: *"The hosted version of ServiceBook keeps working as it is for now, but it will stop holding real businesses' data on [date]. Before then we can send you a copy of your business's data: services, staff, customers, bookings, reviews and photos. Reply to this email if you'd like it."*
   - Export one business when asked. Every collection that holds a business's data has a `businessId` field, except the business itself (`_id`) and the staff working hours (linked by `staffId`):

     ```bash
     URI='<live MONGODB_URI>'
     BIZ='<business id from the list above>'
     OUT="export-$BIZ"
     for c in bookings businesshours customers enquiries images messages notifications reviews services staffs timeoffs waitlistentries workposts; do
       mongodump --uri="$URI" --collection="$c" --query="{\"businessId\":{\"\$oid\":\"$BIZ\"}}" --out="$OUT"
     done
     mongodump --uri="$URI" --collection=businesses --query="{\"_id\":{\"\$oid\":\"$BIZ\"}}" --out="$OUT"
     STAFF_IDS=$(mongosh "$URI" --quiet --eval "EJSON.stringify(db.staffs.find({ businessId: ObjectId('$BIZ') }).toArray().map((s) => s._id))")
     mongodump --uri="$URI" --collection=staffavailabilities --query="{\"staffId\":{\"\$in\":$STAFF_IDS}}" --out="$OUT"
     ```

     The export leaves out `users` (logins with password hashes), `pushsubscriptions` (browser push addresses) and `ideas` (the old roadmap). Send the folder as an encrypted archive over a private channel: it holds their customers' personal data. Delete your copy once they have it.

8. [ ] **Only now merge** the single-business work into `main`, starting with this file.

### What happens to the hosted site later

When the sales demo ships, the hosted site becomes the demo:
1. Point both live projects from `saas-legacy` back to `main`, and change the Ignored Build Step from step 5 to build `main` instead of `saas-legacy`.
2. Set `SALES_DEMO=true` on both projects, with the other variables the client guide lists, and point the API's `MONGODB_URI` at a **new, empty** database.
3. Redeploy: the API first, then the website.
4. Keep the old database, read-only, until every real user from step 7 has been handled. Then delete it.

---

## Branches and tags

| Name | What it is | What deploys from it |
|---|---|---|
| `main` | The default branch. All work merges here through pull requests. | The sales demo, once it ships. Until then, nothing. |
| `vMAJOR.MINOR.PATCH` | Release tags, cut on `main` (for example `v1.0.0`). | Nothing directly: `release` is moved to them. |
| `release` | The branch every client project builds from. Created by the first client release, then moved to each new release tag. | Every client's API (Render) and website (Vercel). |
| `saas-final`, `saas-legacy` | The frozen multi-business version ([above](#the-frozen-version)). | The old hosted site, until it becomes the sales demo. |

Work branches merge into `main` and deploy nothing.

**Demo first.** The sales demo builds from `main`, so every change runs on the demo before any client gets it. A release tag only ever points at a commit that has already run on the demo.

---

## Rules every release keeps

These keep an upgrade from taking a client offline or losing their data. A change that can't keep them needs a manual step, written in the release's Upgrading notes.

1. **A new environment variable must have a safe default.** A deployment that doesn't set it keeps working as before, or becomes safer without going offline.
2. **A renamed or removed variable must log a warning for one release** before it stops being read.
3. **Bad configuration must fail the build, not the running site.** The build command on every host checks the environment, so when a value is wrong the previous deploy keeps serving.
4. **Migrations must be safe to repeat and run under a lock.** They never merge or delete data on their own, keep original values for one release where they rewrite them, write a report, and leave data that the previous release can still read.
5. **A removed or renamed API route must keep working for one more release, and the website must cope with the previous API for one release.** The API and the website deploy separately, so for a few minutes a client runs one release's API with the other's website.
6. **Every release must have an Upgrading section in [`CHANGELOG.md`](../CHANGELOG.md)**: environment changes, migrations, manual steps, and whether a backup is required.

---

## Cutting a release

Cut a release when a set of changes is ready for clients. The first tag meant for clients comes when the client guide is in the README; the next one adds email.

Version numbers:
- **PATCH** (`v1.0.1`): fixes only; nothing to do but the usual backup.
- **MINOR** (`v1.1.0`): new features; settings and variables are optional.
- **MAJOR** (`v2.0.0`): an upgrade needs a manual step, or changes behaviour clients will notice.

Steps:
1. Check that the commit has run on the sales demo and CI passed on it.
2. In `CHANGELOG.md`, rename **Unreleased** to `## vX.Y.Z - YYYY-MM-DD`, complete its **Upgrading** section, and start a new empty **Unreleased** section. Merge that into `main`.
3. Tag the merged commit and push the tag:

   ```bash
   git switch main
   git pull --ff-only
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

---

## Rolling out a release

You deploy each client yourself, from a release tag. Set up every client project so that:
- the **API on Render** builds the `release` branch, with Auto-Deploy and pull request previews off;
- the **website on Vercel** builds only the `release` branch for Production, with previews off, environment variables in the Production environment only, and no Production deploy until you start it.

Steps for each release:

1. **Read the release's Upgrading notes** in `CHANGELOG.md`, and every release's notes in between if a client skipped one.
2. **Back up each client** you are about to upgrade ([Backups](#backups)). Always do this. When the notes say "Backup required: yes", the release rewrites stored data: don't continue for a client without a backup.
3. **Set any environment changes** the notes list, in each client's Production environment (Render for the API, Vercel for the website).
4. **Move `release` to the tag:**

   ```bash
   git fetch origin --tags
   git push origin 'vX.Y.Z^{commit}:refs/heads/release'
   ```

   The first time, this creates `release`. Moving forward from the previous release is a fast-forward. Git refuses any other move, which catches a mistyped tag. Moving back is [Rolling back](#rolling-back).
5. **Deploy each client, API first, then the website:**
   1. **API (Render):** Manual Deploy → Deploy latest commit. Wait until the deploy is live and the client's `https://api.theshop.com/health` answers. Read the deploy log for migration reports and warnings.
   2. **Website (Vercel):** start the Production deployment of `release`.
   3. **Check:** open the website and a booking page, sign in to the admin, and look at today's bookings.
6. **Record** which release each client now runs, in your own client records (never in this repository).

**Why the API goes first.** The two deploy separately. A website newer than its API could call routes that don't exist yet; an API newer than its website still answers the old routes for one release (rule 5). If a client's website ever goes live before its API, deploy the API straight away.

**Check this on the first client.** Vercel builds a project's production branch on every push unless told not to. Before relying on step 5's order, push `release` and confirm that no Production deployment starts on the client's Vercel project until you start it. Host options change, so check the current Render and Vercel docs when you set up the first client.

You can also deploy one client from a checkout of the tag with the host's command-line tool, as long as you keep the order: API, then website.

---

## Backups

Take a backup before every client upgrade, and before any change you make to a client's data by hand.

- **Atlas, paid tier:** keep Cloud Backup on, and take an on-demand snapshot before the upgrade. Restore it from Atlas if needed.
- **Atlas free tier (M0), or any MongoDB:** the free tier has no backups, so use `mongodump`:

  ```bash
  mongodump --uri="<client MONGODB_URI>" --gzip --archive="<client>-vX.Y.Z-$(date +%F).archive.gz"
  ```

- **Restoring** replaces the data, and everything written since the backup is lost: bookings, customers, messages. Use it only when [rolling back](#rolling-back) the code isn't enough.

  ```bash
  mongorestore --uri="<client cluster URI, without the database name>" --gzip \
    --archive="<file>" --nsInclude="<database name>.*" --drop
  ```

- Backups hold the client's customers' personal data. Keep them encrypted and private, and only as long as you need them: until the next release has run without problems.

---

## Rolling back

Releases leave data that the previous release can still read (rule 4), so roll back the code first:

1. Move `release` back to the previous tag:

   ```bash
   git fetch origin --tags
   git push --force-with-lease=release origin 'vPREVIOUS^{commit}:refs/heads/release'
   ```

2. Redeploy in reverse order: **the website first** (on Vercel you can also promote the previous Production deployment), **then the API**. During the gap the older website runs against the newer API, which still answers its routes (rule 5).
3. Record which clients you rolled back, and why, in your own client records. If the release itself is at fault, fix it in a new release and say so in its notes.

Restore a backup only if data is damaged, or the release notes say the previous release can't read what it wrote. Restoring loses everything written since the backup.

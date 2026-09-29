# Work Claude handoff — AIM / Dreamcatcher recommendations

Use this as the first prompt after cloning the Recs repository onto the work computer.

## Objective

Integrate the working recommendation engine and My List into the existing Paul OS Analytics Center → Dashboards Netflix-style front end and Dreamcatcher app registry. Retain the starfield, purposeful previews, thumbnails, mobile browsing, and governed app discovery. Inspect and reuse the actual existing implementation before changing its architecture.

This repository is an executable synthetic reference. It has no company system connections, real employee records, production BigQuery access, or production app launch URLs. The hosted version uses TypeScript/React, server API routes, and Cloudflare D1. The intended work deployment can use the existing backend and shared platform Postgres. Reconcile these choices with the actual environment; do not introduce Supabase.

## First: confirm the environment shape

Read the workspace's applicable instructions and Paul OS skill/Markdown structure. Inventory existing apps, plans, APIs, auth middleware, event collectors, approved dependencies, deployments, and analytics models. Report a mapping with: contract field, actual source field/path, transform, owner, confidence, and missing evidence.

Resolve:
1. Canonical person ID and SSO-to-person mapping. Never accept person_id from a client as authorization.
2. Canonical app ID, app registry, launch URL, thumbnail source, app status, owner, audience, roles, domain/constellation, description, purpose, and dataset lineage.
3. Separate discover permission and launch permission; identify the real enforcement point and how revocations propagate.
4. People attributes and allowed usage signals; BigQuery job attribution, service-account separation, app/job labels, request/user attribution, and deduplication.
5. Existing app usage, impression, save, launch, and meaningful-use event shapes; existing event storage and retention.
6. Existing shared platform Postgres, migration tooling, API framework, scheduler, and secret management.
7. Existing warnings, certification, freshness SLAs, health checks, owner reviews, and the distinction between unknown and healthy.
8. Analytics Center and Dreamcatcher boundaries. The names describe the intended experience, not an assertion about the current service topology.

Keep this inspection read-only. Continue independent integration work with synthetic fixtures when a source is missing. Ask only for decisions that cannot be grounded in the workspace. Do not invent source names or count a missing connection as complete.

## Implementation map

- `lib/domain.ts`: app, profile, and recommendation contracts.
- `lib/catalog.ts`: synthetic app registry, demo personas, and sample eligibility. Replace with the actual registry and policy adapter.
- `lib/recommendations.ts`: deterministic scoring, explanations, 14-day activity decay, and shelf diversity. Keep this baseline until a learned model demonstrates improvement.
- `server/state.ts`: catalog/profile/usage assembly and per-user reads. Replace static sources with repository/service adapters. All personalized responses are private/no-store.
- `server/context.ts`: deployment-specific authentication and database adapter. The DEV-only preview identity is compiled away for production. Work auth must validate the real SSO identity and reject arbitrary headers at the edge.
- `app/api/state/route.ts`: current state and demo profile changes. Remove the profile-switch API in production; employees cannot select their own authorization role.
- `app/api/list/route.ts`: idempotent My List PUT/DELETE with account-scoped persistence.
- `app/api/events/route.ts`: validated, deduplicated interaction ingestion; account scoped IDs, server timestamps, and current eligibility checks.
- `app/aim-app.tsx`: browsing, saved apps, search, filtering, explanations, accessible sheet/dialogs, mobile layout, and structured browser save action.
- `db/schema.ts` / `drizzle/`: runnable demo database. `integrations/postgres.sql` is the proposed work schema to adapt to existing migration tooling.
- `integrations/bigquery-contract.sql`: a contract template for affinity and event inputs. It is deliberately not connected to an assumed project/dataset.

## Deliver the first work release

Implement rules-based relevance and My List first. Integrate with existing source and serving layers rather than introducing duplicate catalogs. Use a platform-level store for lists across apps. Do not create one list store per hosted app.

Keep saves explicit and independent of the ranking algorithm. PUT and DELETE should be safe to retry. Saved records survive recommendation failures. Hide unavailable records without revealing their metadata, and preserve the underlying save so access restoration can recover it. Delete only on deliberate user removal or defined retention policy.

Replace the synthetic Open demo dialog with real app launches. Validate launch destinations against the registry/allowlist, recheck authorization server-side, and preserve the launched app's own data permissions. Demo profile changes are for illustrating ranking only and must never become a production access-control mechanism.

Map thumbnails to owned, approved images or sanitized screenshots. Never capture private dashboard values into a broadly visible thumbnail. The sample thumbnail charts in this repo are synthetic previews.

## Recommendation behavior

Current rule weights: domain affinity up to 25, role 18, dataset overlap up to 20, related saved apps up to 12, team use up to 10, recent launch/use affinity up to 8, certification 5, new app 4; delayed data −12 and advisory warning −4. These are configurable starting assumptions, not calibrated quality estimates. Surface contributions as points, never a probability.

In production:
- Compute candidates in SQL/dbt or the existing orchestration system; materialize scores for serving if request-time scoring becomes slow.
- On every response and launch, apply current policy, retired/critical-health exclusion, and current user dismissals.
- Use recent activity with deduplication, per-session caps, time decay, and attribution confidence. Do not turn query volume into a proxy for employee value.
- BigQuery query jobs are evidence of dataset/domain use. Do not assume a job submitted by a service account identifies the app viewer.
- Use explicit catalog tags and lineage first. Embeddings/BigQuery vector search are optional if description similarity improves discovery.
- Introduce implicit-feedback collaborative filtering only after measuring user–app interaction density. Evaluate BigQuery ML support and compute configuration in the real project before choosing it.
- Later learned ranking needs exposure logs and temporal holdout evaluation. Measure qualified launches, saves, 7-day repeat use, catalog coverage, and warning/permission suppression; do not optimize clicks alone.
- Never display another person's individual usage in recommendation explanations.

## Acceptance checks

Show evidence for: SSO identity mapping; per-user saved-list isolation; save/remove after reload; unknown app rejection; unauthorized candidate/launch exclusion; revoked access without stale-cache leakage; new user fallback; ranking explanation accuracy; dismissal/restore; stale/unknown warnings; small-screen and keyboard access; duplicate event retry; source unavailability with a recoverable state.

Run existing tests, adapt integration tests to the actual work stack, and capture desktop/mobile screenshots. Define a performance target against representative catalog size and record results rather than promising sub-second behavior without measurement.

## Output

1. Environment mapping with actual paths/tables and unresolved gaps.
2. Integrated code and migration changes in the appropriate existing repo/branch.
3. Updated Dreamcatcher/AIM roadmap: current functionality, integration work, later ML, dependencies, and decisions.
4. A clear handoff: what works, what is synthetic, what is connected, what remains blocked, commands to run, and verification evidence.

Complete reversible implementation and verification autonomously. Use the work environment's existing deployment/review policy for release.

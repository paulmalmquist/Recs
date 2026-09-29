# AIM architecture

## Running reference

React browser → authenticated TypeScript API → per-account D1 storage.

The API joins a synthetic catalog and role profiles with durable saves, dismissals, and recent launch/use events. Ranking is a pure TypeScript function. No trained model or external model call is required. All sample people are generic roles; all activity, metric values, asset names, and counts are synthetic.

## Boundaries

| Surface | Implemented | Work adapter |
| --- | --- | --- |
| Identity | Sites authenticated user headers; DEV-only local preview identity | Verified corporate SSO principal and canonical person ID |
| Catalog | TypeScript fixture, 12 active apps + one excluded retired fixture | Dreamcatcher registry with canonical app IDs |
| Profiles | Four synthetic personas | People/profile and activity-affinity views |
| Permissions | Server checks of synthetic audiences | Current discover + launch policy service |
| Persistence | D1 per-account saved apps, dismissals, events, profile selection | Shared platform Postgres |
| Recommendations | Explainable rules, decay, saved-app similarity, role/domain/team use | Same baseline, optionally scheduled BigQuery SQL scores |
| Launch | An interactive synthetic mini-dashboard | Validated real app launch URL plus permission check |
| Thumbnails | Code-native mini charts using synthetic series | Approved images or sanitized app captures |
| ML | None trained | Optional similarity, collaborative filtering, then learned ranking after evaluation |

## API

All data endpoints derive account identity server-side; clients cannot provide a user ID. Production has no anonymous fallback. Identity headers are trustworthy only behind the Sites dispatcher. Standalone work deployments must replace the identity adapter and strip untrusted inbound headers.

- GET `/api/state`: eligible catalog, ranked apps and contribution explanations, My List IDs, dismissed IDs, available demo profiles, current lens, counts.
- PATCH `/api/state`: `{persona: "architect" | "manufacturing" | "quality" | "new"}`. Demo only; never production role assignment.
- PUT `/api/list`: `{appId}`; save idempotently.
- DELETE `/api/list`: `{appId}`; remove idempotently.
- POST `/api/events`: one event or `{events:[...]}` (maximum 30). Each has `id`, `appId`, `type`, optional `requestId`, `position`, `surface`. Types: impression/detail/launch/meaningful_use/dismiss/restore. Server timestamps and identity; event IDs are namespaced by account. Unknown or unauthorized apps are rejected.
- GET `/api/health`: authenticated database availability.

Writes require JSON and reject cross-site origins. Private no-store responses prevent caching personalized state. D1 statements use parameter bindings; schemas are migrated, not created at request time. Storage failures render a recoverable UI; list saves only appear after a successful response.

## Persistence semantics

My List entries are independent of ranking. A lens change may hide saved apps that the new synthetic persona cannot discover. It does not delete those saved records; switch back to see them. Unsave never means a negative rating. Dismiss only suppresses recommendation shelves; All apps and My List can still show the app. Restoring re-enables recommendations.

## Ranking and scale

The modest sample catalog is scored per request. A production catalog should benchmark this against a materialized top-K serving table; do not query BigQuery on every hover. Recommendation contributions are interpretable, hand-set points. They are not probabilities or measured relevance accuracy. Cap and deduplicate meaningful-use signals before large-scale training. Enforce eligibility on every serve and launch, even with precomputed candidates.

## Limitations

No real employee enrichment, actual BigQuery executions, enterprise SSO, production catalog, external application launch, embeddings, collaborative model, scheduled batch pipeline, or trained ranker is connected. Their adapter requirements are documented in WORK-HANDOFF.md. Human job-to-app attribution must be established in the actual environment. No production performance claim is made.

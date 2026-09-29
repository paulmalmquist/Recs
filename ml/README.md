# Actual ML modeling for AIM / Recs

This package trains **implicit-feedback alternating least squares (ALS)** user and app embeddings. It is not the existing hand-weighted UI score. The committed model contains learned factors from synthetic events and an honest offline evaluation report. The deployed dashboard continues to use `rules-v1.0`; this package does not silently switch it to synthetic ML.

## Run

From the repository root, use Python 3.11+ and Node with the app dependencies installed:

```sh
python3 -m venv ml/.venv
ml/.venv/bin/pip install -r ml/requirements.txt
node ml/make_demo.mjs
ml/.venv/bin/python -m ml.train --input ml/demo/input.json --output /tmp/aim-model-runs
ml/.venv/bin/python -m unittest ml.test_model -v
ml/.venv/bin/python -m ml.score --model ml/artifacts/implicit-als-f87e23888e20/model.json --context ml/demo/context.json --output ml/demo/scores.jsonl --allow-synthetic
```

`ml/artifacts/` contains the already-trained demo model and evaluation. Training creates an immutable version directory and refuses to overwrite it. JSON is used for inspectable model weights; no pickle or executable model deserialization. SHA-256 detects accidental changes, not malicious replacement; only load artifacts from a trusted registry.

## Algorithm and evaluation

`model.py:fit` learns latent factors by minimizing weighted squared preference error with L2 regularization. Positive preference is any qualifying historical event; confidence is `1 + alpha * log1p(decayed_interaction_weight)`. Launch/use/save weights are 1/3/4, capped at 8 per user/app/UTC day, with 14-day half-life. Impressions, dismissals, and unmapped BigQuery jobs are not positive labels. A historical save remains an interaction even if later removed; current My List state remains separate.

Reference: [Hu, Koren & Volinsky, Collaborative Filtering for Implicit Feedback Datasets](https://yifanhu.net/PUB/cf.pdf).

Three factor/regularization settings are selected on a chronological validation window. The selected configuration is retrained on train+validation, then evaluated once on untouched test events. Reported metrics are Recall@3, NDCG@3 and recommended-item count, compared with popularity and a Python port of the app's rules-v1.0. Catalog/profile inputs must be point-in-time snapshots; `features_as_of` enforces their declared cutoff, not the upstream truth of that declaration. Static synthetic snapshots are used here. Scores are not probabilities. Evaluation predicts next-window usage **including repeat usage**, not exclusively discovery of unseen apps. Evaluation measures pure ALS, not the serving fallback blend.

The report never automatically approves production. Synthetic lift only verifies this artificial experiment. Sparse users, popularity bias, real permission changes and exposure bias need real-data evaluation and an online experiment. Certification is trusted catalog metadata, not something ML can grant: “certified knowledge” and “certified data” map to your **certified skills** taxonomy upstream.

## Inputs

Training JSON: `synthetic` (boolean), timezone-aware `features_as_of`, `train_end`, `validation_end`, `test_end`, `users`, `apps`, `events`.

- User: `id`, `role`, `team`, `domains` (domain → affinity), `datasets` (canonical IDs).
- App: existing `lib/domain.ts` AppRecord schema, including `status`, `audiences`, `warning`, `certified`, `roles`, `datasets`, `teamUse`.
- Event: `event_id`, `user_id`, `app_id`, `event_type`, `created_at`.

Duplicate IDs are deduplicated within user; conflicting duplicate payloads and unknown user/app IDs fail validation. Export only opted-in/authorized analytics records; pseudonymize IDs, remove bots/service accounts, and avoid SQL text or sensitive query literals. Translate attributable human BigQuery activity into point-in-time dataset affinities; do not pretend every query is an app launch.

## Inference / application boundary

Call `ml.model.recommend(model, user, current_apps, allowed_ids, dismissed)` from a trusted backend, or batch-score:

```sh
python -m ml.score --model ml/artifacts/<version>/model.json \
  --context /trusted/current-context.json --output /trusted/scores.jsonl
```

Context contains current `users`, `apps`, `allowed_app_ids` keyed by user ID, and optional `dismissed_app_ids`. These must come from server-side identity and permission checks, never a browser-provided role or allowlist. Synthetic models fail by default; `--allow-synthetic` is an explicit local/demo-only override. Outputs include user/app IDs, rank, score, reason, source, timestamp and model version. Known users/apps use learned dot products; cold-start users fall back to profile rules; unobserved apps fill slots after learned candidates. All paths reapply active/critical/audience filters, explicit current allowlists and dismissals. Production must additionally enforce its actual row-level/tenant permissions at both recommendation read and app launch.

No Python HTTP server is exposed. The existing Cloudflare-hosted UI cannot run NumPy directly. Run this batch job in your work compute environment and write scores to a serving table, then join scores in `server/state.ts` after auth and before diversification. Preserve My List as user-owned persistence, not model output. Retain rules when scores are absent/stale or the model is disabled. Do not reuse synthetic persona IDs as employee identities.

## Work-environment handoff

1. Inspect actual identity/tenant keys, BigQuery event attribution, catalog permissions and certified-skills taxonomy. Confirm column names before any SQL changes.
2. Export time-correct profiles/catalog and deduplicated human events using the schema above. Define retention and erasure for events, factors and derived scores.
3. Train and compare against actual production rankings with the same eligibility and time windows. Check cold-start cohorts, catalog coverage and popularity concentration. Approve a version only after real-data review.
4. Schedule Python/NumPy training and batch inference on existing work compute. Store model JSON + evaluation in a restricted, versioned object store. Maintain an approved-version pointer and previous version for rollback; do not auto-promote this demo.
5. Write batch rows into the existing backend datastore (unique user/app/model key, score timestamp). Add a server-side adapter with TTL, current authorization, dismissals and fallback. Record model version and exposure position in events. Compare against rules in a small controlled rollout.

Stack used: **Python + NumPy**, no GPU, LLM, vector database or hosted ML API required. BigQuery can supply training exports; your existing scheduler, artifact storage and serving database can host the remainder. This transparent dense reference implementation has O(users × apps) memory and is intended for a small internal catalog; migrate to sparse ALS/two-tower retrieval if scale warrants it.

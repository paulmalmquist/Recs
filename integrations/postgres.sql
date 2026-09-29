-- Proposed shared-platform schema. Reconcile identity and app IDs with existing services.
-- Not automatically applied by the demo. All IDs below refer to canonical work IDs.
CREATE TABLE user_saved_app (
 person_id text NOT NULL,
 app_id text NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (person_id, app_id)
);
CREATE TABLE user_dismissed_app (
 person_id text NOT NULL,
 app_id text NOT NULL,
 dismissed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (person_id, app_id)
);
CREATE TABLE app_interaction (
 person_id text NOT NULL,
 event_id text NOT NULL,
 app_id text NOT NULL,
 event_type text NOT NULL CHECK (event_type IN ('impression','detail','launch','meaningful_use','save','unsave','dismiss','restore')),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 request_id text,
 surface text,
 position integer,
 model_version text NOT NULL,
 PRIMARY KEY (person_id, event_id)
);
CREATE INDEX app_interaction_person_time ON app_interaction(person_id, occurred_at DESC);
CREATE TABLE app_recommendation (
 person_id text NOT NULL,
 app_id text NOT NULL,
 model_version text NOT NULL,
 score double precision NOT NULL,
 reason_codes jsonb NOT NULL,
 computed_at timestamptz NOT NULL,
 PRIMARY KEY (person_id, app_id, model_version)
);
-- Always scope queries by server-resolved person_id and current app policy.
-- Add foreign keys/RLS to the real canonical tables once the environment map is confirmed.

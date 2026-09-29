-- REFERENCE ONLY: replace contracts with reviewed existing views before execution.
-- No actual project IDs, table IDs, credentials, or company data are included.
--
-- person_profile(person_id STRING, role STRING, team STRING, active BOOL)
-- app_registry(app_id STRING, domain STRING, tags ARRAY<STRING>, datasets ARRAY<STRING>,
--              owner STRING, lifecycle_status STRING, certification_status STRING,
--              data_observed_at TIMESTAMP, freshness_sla_minutes INT64)
-- app_usage(person_id STRING, app_id STRING, event_id STRING, event_type STRING,
--           occurred_at TIMESTAMP, app_session_id STRING, source STRING)
-- person_data_usage(person_id STRING, dataset_id STRING, observed_at TIMESTAMP,
--                   attribution_confidence FLOAT64, actor_type STRING)
--
-- Illustrative daily affinity aggregation over mapped HUMAN activity, not raw job count.
-- Use parameterized date bounds and the actual identity attribution view.
WITH daily_usage AS (
  SELECT person_id, dataset_id, DATE(observed_at) AS activity_day,
         MAX(attribution_confidence) AS attribution_confidence
  FROM `YOUR_PROJECT.YOUR_DATASET.person_data_usage`
  WHERE observed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
    AND actor_type = 'human'
    AND person_id IS NOT NULL
    AND attribution_confidence >= 0.8
  GROUP BY person_id, dataset_id, activity_day
)
SELECT person_id, dataset_id,
       SUM(attribution_confidence * POW(0.5, DATE_DIFF(CURRENT_DATE(), activity_day, DAY) / 14.0)) AS affinity,
       MAX(activity_day) AS last_used_date
FROM daily_usage
GROUP BY person_id, dataset_id;
-- Map dataset affinities to app_registry.datasets, then apply policy when serving.
-- Historical jobs without app/user attribution remain unattributed; do not fabricate the join.

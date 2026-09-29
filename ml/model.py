"""CPU implicit ALS. Inputs are trusted, server-side exports, never browser claims."""
import hashlib
import json
import math
from datetime import datetime
from pathlib import Path

import numpy as np

WEIGHTS = {"launch": 1.0, "meaningful_use": 3.0, "save": 4.0}


def timestamp(value):
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("Timestamps must include a timezone")
    return dt.timestamp()


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def eligible(app, user):
    return (app["status"] == "active"
            and app.get("warning", {}).get("level") != "critical"
            and ("all" in app["audiences"] or user["role"] in app["audiences"]))


def validate(data):
    if not isinstance(data.get("synthetic"), bool):
        raise ValueError("Explicit synthetic boolean required")
    for key in ("users", "apps"):
        ids = [x["id"] for x in data[key]]
        if not ids or len(ids) != len(set(ids)):
            raise ValueError(f"{key}: nonempty unique IDs required")
    users = {u["id"]: u for u in data["users"]}
    apps = {a["id"]: a for a in data["apps"]}
    seen = {}
    events = []
    for event in data["events"]:
        timestamp(event["created_at"])
        if event["user_id"] not in users or event["app_id"] not in apps:
            raise ValueError("Unknown event user/app")
        key = (event["user_id"], event["event_id"])
        if key in seen:
            if seen[key] != event:
                raise ValueError("Conflicting duplicate event")
            continue
        seen[key] = event
        events.append(event)
    return sorted(events, key=lambda e: (timestamp(e["created_at"]), e["event_id"]))


def matrix(data, events, cutoff):
    users = {u["id"]: i for i, u in enumerate(data["users"])}
    apps = {a["id"]: i for i, a in enumerate(data["apps"])}
    result = np.zeros((len(users), len(apps)))
    daily = {}
    for e in events:
        t = timestamp(e["created_at"])
        if t >= cutoff or e["event_type"] not in WEIGHTS:
            continue
        u, a = users[e["user_id"]], apps[e["app_id"]]
        if not eligible(data["apps"][a], data["users"][u]):
            continue
        # Cap repeated activity per UTC day; service accounts must be removed upstream.
        key = (u, a, int(t // 86400))
        daily[key] = min(8.0, daily.get(key, 0.0) + WEIGHTS[e["event_type"]])
    for (u, a, day), weight in daily.items():
        age = max(0, cutoff / 86400 - day)
        result[u, a] += weight * 0.5 ** (age / 14)
    return result


def fit(r, factors=6, alpha=10.0, regularization=1.0, iterations=20, seed=42):
    if factors < 1 or regularization <= 0 or alpha <= 0 or iterations < 1:
        raise ValueError("Invalid model parameters")
    if not np.isfinite(r).all() or (r < 0).any():
        raise ValueError("Nonnegative finite interactions required")
    rng = np.random.default_rng(seed)
    x = rng.normal(0, .05, (r.shape[0], factors))
    y = rng.normal(0, .05, (r.shape[1], factors))
    confidence = 1 + alpha * np.log1p(r)
    preference = (r > 0).astype(float)
    losses = []
    for _ in range(iterations):
        for left, right, c, p in ((x, y, confidence, preference),
                                  (y, x, confidence.T, preference.T)):
            for i in range(len(left)):
                lhs = right.T @ (c[i, :, None] * right) + regularization * np.eye(factors)
                left[i] = np.linalg.solve(lhs, right.T @ (c[i] * p[i]))
        loss = np.sum(confidence * (preference - x @ y.T) ** 2)
        loss += regularization * (np.sum(x*x) + np.sum(y*y))
        losses.append(float(loss))
    return x, y, losses


def rules(app, user, apps, events, cutoff):
    """Port of rules-v1.0; training-window events and save state only."""
    allowed = {a["id"]: a for a in apps if eligible(a, user)}
    saved, affinity = set(), 0.0
    for e in events:
        t = timestamp(e["created_at"])
        if e["user_id"] != user["id"] or t >= cutoff or e["app_id"] not in allowed:
            continue
        if e["event_type"] == "save":
            saved.add(e["app_id"])
        elif e["event_type"] == "unsave":
            saved.discard(e["app_id"])
        if e["event_type"] in ("launch", "meaningful_use") and allowed[e["app_id"]]["domain"] == app["domain"]:
            affinity = min(1, affinity + .2 * .5 ** ((cutoff-t)/86400/14))
    related = sum(1 for a in apps if a["id"] in saved and a["id"] != app["id"]
                  and (a["domain"] == app["domain"] or set(a["datasets"]) & set(app["datasets"])))
    rnd = lambda x: math.floor(x + .5)  # Match JavaScript Math.round for positive terms.
    warning = app.get("warning", {}).get("level")
    return max(0, rnd(25 * user.get("domains", {}).get(app["domain"], 0))
               + 18 * (user["role"] in app["roles"])
               + min(20, 10 * len(set(app["datasets"]) & set(user.get("datasets", []))))
               + min(12, related * 6)
               + rnd(10 * min(1, app.get("teamUse", {}).get(user["team"], 0)/40))
               + rnd(8*affinity) + 5*app["certified"] + 4*app.get("newApp", False)
               - (12 if warning == "warning" else 4 if warning else 0))


def evaluate(data, history, holdout, cutoff, x, y, r, k=3):
    scores = x @ y.T
    metrics = {}
    for method in ("als", "rules", "popularity"):
        recalls, ndcgs, coverage = [], [], set()
        for i, user in enumerate(data["users"]):
            candidates = [j for j, a in enumerate(data["apps"]) if eligible(a, user)]
            truth = {e["app_id"] for e in holdout if e["user_id"] == user["id"]
                     and e["event_type"] in ("launch", "meaningful_use", "save")}
            truth &= {data["apps"][j]["id"] for j in candidates}
            if not truth:
                continue
            def score(j):
                if method == "als":
                    return scores[i, j] if r[i].sum() and r[:, j].sum() else -1
                if method == "popularity":
                    return r[:, j].sum()
                return rules(data["apps"][j], user, data["apps"], history, cutoff)
            top = sorted(candidates, key=lambda j: (-score(j), data["apps"][j]["id"]))[:k]
            ids = [data["apps"][j]["id"] for j in top]
            hits = [int(a in truth) for a in ids]
            recalls.append(sum(hits)/len(truth))
            ndcgs.append(sum(h/math.log2(n+2) for n, h in enumerate(hits)) /
                         sum(1/math.log2(n+2) for n in range(min(k, len(truth)))))
            coverage.update(ids)
        metrics[method] = {"recall_at_k": float(np.mean(recalls)) if recalls else 0,
                           "ndcg_at_k": float(np.mean(ndcgs)) if ndcgs else 0,
                           "evaluated_users": len(recalls), "recommended_items": len(coverage)}
    return metrics


def save_model(path, payload):
    envelope = {"sha256": digest(payload), "model": payload}
    Path(path).write_text(json.dumps(envelope, indent=2, allow_nan=False) + "\n")


def load_model(path):
    envelope = json.loads(Path(path).read_text())
    if digest(envelope["model"]) != envelope["sha256"]:
        raise ValueError("Model integrity check failed")
    m = envelope["model"]
    x, y = np.array(m["user_factors"]), np.array(m["item_factors"])
    if x.shape != (len(m["user_ids"]), m["config"]["factors"]) or y.shape != (len(m["app_ids"]), m["config"]["factors"]):
        raise ValueError("Invalid factor shapes")
    if not np.isfinite(x).all() or not np.isfinite(y).all():
        raise ValueError("Invalid factors")
    return m


def recommend(model, user, apps, allowed_ids, dismissed=(), limit=10, production=True):
    """allowed_ids MUST come from current server authorization, never a client body."""
    if production and model["synthetic"]:
        raise ValueError("Synthetic model cannot serve production")
    if not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100")
    users = {u: i for i, u in enumerate(model["user_ids"])}
    items = {a: i for i, a in enumerate(model["app_ids"])}
    u = users.get(user["id"])
    warm = u is not None and model["user_observed"][u]
    result = []
    for app in apps:
        if app["id"] not in allowed_ids or app["id"] in dismissed or not eligible(app, user):
            continue
        j = items.get(app["id"])
        learned = warm and j is not None and model["item_observed"][j]
        baseline = rules(app, user, apps, [], 0)
        raw = float(np.dot(model["user_factors"][u], model["item_factors"][j])) if learned else None
        # Keep learned and fallback score scales separate; fallback fills remaining slots.
        result.append({"app_id": app["id"], "score": raw if learned else baseline,
                       "source": "als" if learned else "rules-fallback",
                       "reason": "Learned from aggregate usage patterns" if learned else "Matches your profile",
                       "model_version": model["version"]})
    return sorted(result, key=lambda a: (a["source"] != "als", -a["score"], a["app_id"]))[:limit]

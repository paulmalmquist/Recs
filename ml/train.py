"""python -m ml.train --input /trusted/export.json --output /model/run"""
import argparse
import json
from pathlib import Path
from .model import digest, evaluate, fit, matrix, save_model, timestamp, validate


def train(data, output):
    events = validate(data)
    train_end, validation_end, test_end = [timestamp(data[k]) for k in
                                         ("train_end", "validation_end", "test_end")]
    if not train_end < validation_end < test_end:
        raise ValueError("Strictly ordered train/validation/test cutoffs required")
    if timestamp(data["features_as_of"]) > train_end:
        raise ValueError("Profile/catalog features must be frozen before training cutoff")
    history = [e for e in events if timestamp(e["created_at"]) < train_end]
    validation = [e for e in events if train_end <= timestamp(e["created_at"]) < validation_end]
    test = [e for e in events if validation_end <= timestamp(e["created_at"]) < test_end]
    if not all((history, validation, test)):
        raise ValueError("Each time window requires events")
    r = matrix(data, history, train_end)
    if not r.any():
        raise ValueError("No eligible positive training interactions")
    trials = []
    for factors, regularization in ((3, 1.0), (6, 1.0), (6, 5.0)):
        config = dict(factors=factors, regularization=regularization, alpha=10, iterations=20, seed=42)
        x, y, losses = fit(r, **config)
        metrics = evaluate(data, history, validation, train_end, x, y, r)
        trials.append((metrics["als"]["ndcg_at_k"], config, metrics))
    _, config, validation_metrics = max(trials, key=lambda t: t[0])
    final_history = history + validation
    r = matrix(data, final_history, validation_end)
    x, y, losses = fit(r, **config)
    test_metrics = evaluate(data, final_history, test, validation_end, x, y, r)
    beats = test_metrics["als"]["ndcg_at_k"] > max(test_metrics[k]["ndcg_at_k"] for k in ("rules", "popularity"))
    report = {"synthetic": data["synthetic"], "k": 3, "task": "next-window usage including repeat use",
              "split": {"train_end": data["train_end"], "validation_end": data["validation_end"], "test_end": data["test_end"]},
              "event_counts": [len(history), len(validation), len(test)],
              "validation_trials": [{"config": c, "metrics": m} for _, c, m in trials],
              "test_metrics": test_metrics, "beats_both_baselines": beats,
              "production_approved": False,
              "note": "Offline results only. Synthetic data is not evidence of production lift; human approval and online test required.",
              "training_loss": losses}
    version = "implicit-als-" + digest({"data": data, "config": config})[:12]
    payload = {"version": version, "synthetic": data["synthetic"], "config": config,
               "data_sha256": digest(data), "trained_before": data["validation_end"],
               "features_as_of": data["features_as_of"],
               "user_ids": [u["id"] for u in data["users"]], "app_ids": [a["id"] for a in data["apps"]],
               "user_observed": (r.sum(axis=1) > 0).tolist(), "item_observed": (r.sum(axis=0) > 0).tolist(),
               "user_factors": x.tolist(), "item_factors": y.tolist()}
    target = Path(output) / version
    target.mkdir(parents=True, exist_ok=False)
    save_model(target / "model.json", payload)
    (target / "evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"model_path": str(target / "model.json"), "test_metrics": test_metrics,
                      "beats_both_baselines": beats, "production_approved": False}, indent=2))
    return payload, report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    train(json.loads(Path(args.input).read_text()), args.output)

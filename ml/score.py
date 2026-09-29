"""Trusted batch serving entrypoint. No HTTP listener or client-supplied permissions."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from .model import load_model, recommend


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--context", required=True, help="Trusted current user/catalog/permissions export")
    parser.add_argument("--output", required=True)
    parser.add_argument("--allow-synthetic", action="store_true")
    args = parser.parse_args()
    model = load_model(args.model)
    context = json.loads(Path(args.context).read_text())
    generated = datetime.now(timezone.utc).isoformat()
    rows = []
    for user in context["users"]:
        recs = recommend(model, user, context["apps"], context["allowed_app_ids"][user["id"]],
                         context.get("dismissed_app_ids", {}).get(user["id"], []),
                         production=not args.allow_synthetic)
        rows.extend({"user_id": user["id"], "position": i+1, "generated_at": generated, **rec}
                    for i, rec in enumerate(recs))
    Path(args.output).write_text("".join(json.dumps(row) + "\n" for row in rows))
    print(f"Wrote {len(rows)} recommendations")

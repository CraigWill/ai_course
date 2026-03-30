from __future__ import annotations

import argparse
import yaml
import subprocess


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, required=True)
    args = parser.parse_args()
    with open(args.config, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    model = raw.get("model", None)
    if model is None or model in ["logreg", "logistic", "logistic_regression", "rf", "random_forest", "randomforest"]:
        subprocess.check_call(["python", "scripts/train_sklearn.py", "--config", args.config])
    elif model in ["mlp", "torch"]:
        subprocess.check_call(["python", "scripts/train_torch.py", "--config", args.config])
    else:
        raise SystemExit("未知模型类型")


if __name__ == "__main__":
    main()


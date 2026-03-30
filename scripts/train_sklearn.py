from __future__ import annotations

import argparse
import csv
import os
import time
from dataclasses import asdict, dataclass
from typing import Any, Dict

import joblib
import numpy as np
import yaml
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)

from src.data import preprocess_breast_cancer


@dataclass
class SklearnConfig:
    seed: int = 42
    model: str = "logreg"
    logreg: Dict[str, Any] | None = None
    random_forest: Dict[str, Any] | None = None
    output_dir: str = "experiments"


def load_config(path: str) -> SklearnConfig:
    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    cfg = SklearnConfig(**raw)
    return cfg


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, required=True)
    args = parser.parse_args()
    cfg = load_config(args.config)

    splits = preprocess_breast_cancer(seed=cfg.seed)
    X_train, y_train = splits.X_train, splits.y_train
    X_val, y_val = splits.X_val, splits.y_val
    X_test, y_test = splits.X_test, splits.y_test

    if cfg.model.lower() in ["logreg", "logistic", "logistic_regression"]:
        params = cfg.logreg or {"max_iter": 200, "C": 1.0, "solver": "lbfgs"}
        model = LogisticRegression(**params)
        model_name = "logreg"
    elif cfg.model.lower() in ["rf", "random_forest", "randomforest"]:
        params = cfg.random_forest or {"n_estimators": 200, "max_depth": None, "random_state": cfg.seed}
        model = RandomForestClassifier(**params)
        model_name = "random_forest"
    else:
        raise ValueError("Unsupported model")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_proba = None
    try:
        y_proba = model.predict_proba(X_test)[:, 1]
    except Exception:
        pass

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred)),
        "recall": float(recall_score(y_test, y_pred)),
        "f1": float(f1_score(y_test, y_pred)),
    }
    if y_proba is not None:
        metrics["roc_auc"] = float(roc_auc_score(y_test, y_proba))
    cm = confusion_matrix(y_test, y_pred)

    ts = time.strftime("%Y%m%d_%H%M%S")
    run_dir = os.path.join(cfg.output_dir, f"{model_name}_{ts}")
    ensure_dir(run_dir)
    model_path = os.path.join(run_dir, f"{model_name}.joblib")
    joblib.dump(model, model_path)
    np.savetxt(os.path.join(run_dir, "confusion_matrix.csv"), cm, delimiter=",", fmt="%d")

    metrics_row = {
        "timestamp": ts,
        "seed": cfg.seed,
        "model": model_name,
        **metrics,
        "model_path": model_path,
    }
    metrics_csv = os.path.join(cfg.output_dir, "metrics.csv")
    ensure_dir(cfg.output_dir)
    write_header = not os.path.exists(metrics_csv)
    with open(metrics_csv, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(metrics_row.keys()))
        if write_header:
            writer.writeheader()
        writer.writerow(metrics_row)

    print(metrics_row)


if __name__ == "__main__":
    main()


from __future__ import annotations

import argparse
import csv
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Sequence, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import yaml
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from torch.utils.data import DataLoader, TensorDataset
from tqdm import tqdm

from src.data import preprocess_breast_cancer
from src.models import MLP


@dataclass
class TorchConfig:
    seed: int = 42
    lr: float = 1e-3
    weight_decay: float = 0.0
    batch_size: int = 64
    epochs: int = 50
    patience: int = 5
    hidden: Sequence[int] = (64, 32)
    dropout: float = 0.2
    output_dir: str = "experiments"


def load_config(path: str) -> TorchConfig:
    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return TorchConfig(**raw)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def seed_everything(seed: int) -> None:
    torch.manual_seed(seed)
    np.random.seed(seed)


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> Tuple[float, Dict[str, float]]:
    model.eval()
    all_logits = []
    all_labels = []
    with torch.no_grad():
        for xb, yb in loader:
            xb = xb.to(device)
            logits = model(xb)
            all_logits.append(logits.cpu())
            all_labels.append(yb)
    logits = torch.cat(all_logits, dim=0)
    y_true = torch.cat(all_labels, dim=0).numpy()
    y_pred = logits.argmax(dim=1).numpy()
    y_proba = torch.softmax(logits, dim=1)[:, 1].numpy()
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred)),
        "recall": float(recall_score(y_true, y_pred)),
        "f1": float(f1_score(y_true, y_pred)),
        "roc_auc": float(roc_auc_score(y_true, y_proba)),
    }
    loss = nn.CrossEntropyLoss()(torch.tensor(logits.numpy()), torch.tensor(y_true)).item()
    return loss, metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, required=True)
    args = parser.parse_args()
    cfg = load_config(args.config)

    seed_everything(cfg.seed)
    splits = preprocess_breast_cancer(seed=cfg.seed)
    X_train, y_train = splits.X_train, splits.y_train
    X_val, y_val = splits.X_val, splits.y_val
    X_test, y_test = splits.X_test, splits.y_test

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = MLP(input_dim=X_train.shape[1], hidden=tuple(cfg.hidden), dropout=cfg.dropout, num_classes=2).to(device)
    optimizer = optim.Adam(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    criterion = nn.CrossEntropyLoss()

    train_loader = DataLoader(TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long)), batch_size=cfg.batch_size, shuffle=True)
    val_loader = DataLoader(TensorDataset(torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.long)), batch_size=cfg.batch_size)
    test_loader = DataLoader(TensorDataset(torch.tensor(X_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.long)), batch_size=cfg.batch_size)

    best_val = float("inf")
    best_state = None
    no_improve = 0
    history = []
    for epoch in range(cfg.epochs):
        model.train()
        running = 0.0
        for xb, yb in tqdm(train_loader, desc=f"epoch {epoch+1}/{cfg.epochs}"):
            xb = xb.to(device)
            yb = yb.to(device)
            optimizer.zero_grad()
            logits = model(xb)
            loss = criterion(logits, yb)
            loss.backward()
            optimizer.step()
            running += loss.item() * xb.size(0)
        train_loss = running / len(train_loader.dataset)
        val_loss, _ = evaluate(model, val_loader, device)
        history.append({"epoch": epoch + 1, "train_loss": train_loss, "val_loss": val_loss})
        if val_loss < best_val - 1e-6:
            best_val = val_loss
            best_state = model.state_dict()
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= cfg.patience:
                break

    if best_state is not None:
        model.load_state_dict(best_state)

    test_loss, test_metrics = evaluate(model, test_loader, device)

    ts = time.strftime("%Y%m%d_%H%M%S")
    run_dir = os.path.join(cfg.output_dir, f"mlp_{ts}")
    ensure_dir(run_dir)
    torch.save(model.state_dict(), os.path.join(run_dir, "mlp.pt"))
    with open(os.path.join(run_dir, "train_history.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["epoch", "train_loss", "val_loss"])
        writer.writeheader()
        for row in history:
            writer.writerow(row)

    metrics_row = {
        "timestamp": ts,
        "seed": cfg.seed,
        "model": "mlp",
        **test_metrics,
        "model_path": os.path.join(run_dir, "mlp.pt"),
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


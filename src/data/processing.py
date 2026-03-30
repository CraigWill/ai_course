from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


def set_seed(seed: int = 42) -> None:
    np.random.seed(seed)


@dataclass
class DatasetSplits:
    X_train: np.ndarray
    y_train: np.ndarray
    X_val: np.ndarray
    y_val: np.ndarray
    X_test: np.ndarray
    y_test: np.ndarray
    scaler: StandardScaler


def load_breast_cancer_dataset(as_frame: bool = False) -> Tuple[np.ndarray, np.ndarray, Dict]:
    data = load_breast_cancer(as_frame=as_frame)
    X = data.data
    y = data.target
    meta = {"feature_names": data.feature_names, "target_names": data.target_names}
    return X, y, meta


def preprocess_breast_cancer(
    seed: int = 42, test_size: float = 0.2, val_size: float = 0.2, standardize: bool = True
) -> DatasetSplits:
    set_seed(seed)
    X, y, _ = load_breast_cancer_dataset(as_frame=False)
    X_train, X_tmp, y_train, y_tmp = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )
    val_rel = val_size / (1.0 - test_size)
    X_val, X_test, y_val, y_test = train_test_split(
        X_tmp, y_tmp, test_size=1 - val_rel, random_state=seed, stratify=y_tmp
    )
    scaler = StandardScaler()
    if standardize:
        X_train = scaler.fit_transform(X_train)
        X_val = scaler.transform(X_val)
        X_test = scaler.transform(X_test)
    return DatasetSplits(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        X_test=X_test,
        y_test=y_test,
        scaler=scaler,
    )


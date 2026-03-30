from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import numpy as np


def test_basic_metrics():
    y_true = np.array([0, 1, 1, 0, 1, 0])
    y_pred = np.array([0, 1, 0, 0, 1, 1])
    y_proba = np.array([0.1, 0.9, 0.4, 0.3, 0.7, 0.6])
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred)
    rec = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    auc = roc_auc_score(y_true, y_proba)
    assert 0 <= acc <= 1
    assert 0 <= prec <= 1
    assert 0 <= rec <= 1
    assert 0 <= f1 <= 1
    assert 0 <= auc <= 1

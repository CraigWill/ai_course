import numpy as np
from src.data import preprocess_breast_cancer


def test_preprocess_shapes_and_reproducibility():
    splits1 = preprocess_breast_cancer(seed=123)
    splits2 = preprocess_breast_cancer(seed=123)
    assert splits1.X_train.shape[1] == splits1.X_val.shape[1] == splits1.X_test.shape[1]
    assert splits1.y_train.ndim == 1
    assert np.allclose(splits1.X_train, splits2.X_train)
    assert np.array_equal(splits1.y_train, splits2.y_train)

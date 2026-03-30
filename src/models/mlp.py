from __future__ import annotations

import math
from typing import Sequence

import torch
import torch.nn as nn


class MLP(nn.Module):
    def __init__(self, input_dim: int, hidden: Sequence[int] = (64, 32), dropout: float = 0.2, num_classes: int = 2):
        super().__init__()
        layers = []
        last = input_dim
        for h in hidden:
            layers.append(nn.Linear(last, h))
            layers.append(nn.ReLU(inplace=True))
            if dropout > 0:
                layers.append(nn.Dropout(dropout))
            last = h
        layers.append(nn.Linear(last, num_classes))
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# 机器学习教学项目（NumPy/Pandas·预处理·ML/DL）

## 快速开始
- 建议使用 Python 3.10+
- 创建虚拟环境并安装依赖

```bash
python -m venv .venv
source .venv/bin/activate  # Windows 使用 .venv\\Scripts\\activate
pip install -U pip
pip install -r requirements.txt
python -m ipykernel install --user --name ml-edu
```

## 目录结构
```
ai_course/
├─ notebooks/                # 学习与演示
├─ src/
│  ├─ data/                  # 数据加载与预处理
│  └─ models/                # 模型封装（ML/MLP）
├─ scripts/                  # 训练、评估、统一运行
├─ configs/                  # 配置文件（YAML）
├─ experiments/              # 运行输出（模型、日志、metrics.csv）
└─ reports/                  # 报告产物
```

## 运行 Notebook
```bash
jupyter notebook  # 或 VS Code 打开 notebooks/
```

## 运行传统 ML 基线
```bash
python scripts/train_sklearn.py --config configs/default_sklearn.yaml
```

## 运行 PyTorch MLP
```bash
python scripts/train_torch.py --config configs/default_torch.yaml
```

## 统一运行入口
```bash
python scripts/run_experiment.py --config configs/default_sklearn.yaml
python scripts/run_experiment.py --config configs/default_torch.yaml
```

## 测试
```bash
pytest -q
```

## 注意
- 默认使用 sklearn 乳腺癌数据集，无需下载外部数据。
- 所有运行结果写入 experiments/，并汇总到 experiments/metrics.csv。


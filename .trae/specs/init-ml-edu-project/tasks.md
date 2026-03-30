# Tasks
- [x] Task 1: 初始化项目结构与环境
  - [x] 创建目录：notebooks/, src/data/, src/models/, scripts/, configs/, experiments/, reports/
  - [x] 添加 requirements.txt 与 README（含快速开始与运行说明）
  - [x] 验证可安装并通过基础导入测试（numpy/pandas/sklearn/torch）

- [x] Task 2: 添加示例数据与数据加载
  - [x] 使用 sklearn.datasets 加载乳腺癌数据，提供导出到 data/raw（可选）
  - [x] 编写数据加载与种子固定逻辑，保证可复现
  - [x] 验证加载后特征/标签形状与类型正确

- [x] Task 3: 编写 NumPy 基础 Notebook
  - [x] 覆盖数组创建、索引切片、广播、向量化、形状变换与常见坑
  - [x] 运行全表，确保无错误并保存

- [x] Task 4: 编写 Pandas 基础 Notebook
  - [x] 覆盖读取/检查、缺失值、类型转换、合并、分组聚合、简单可视化
  - [x] 运行全表，确保无错误并保存

- [x] Task 5: 实现数据预处理模块与演示 Notebook
  - [x] src/data/processing.py：清洗、变换、切分；Docstring 与类型提示
  - [x] 单元测试覆盖关键分支（pytest）
  - [x] notebooks/ 中添加预处理演示并运行无误

- [x] Task 6: 机器学习基线（sklearn）
  - [x] scripts/train_sklearn.py：LogReg 与 RandomForest，支持配置
  - [x] 评估 accuracy/precision/recall/f1/ROC-AUC 与混淆矩阵
  - [x] 保存模型与将指标写入 experiments/metrics.csv
  - [x] 添加针对指标计算的最小单测

- [x] Task 7: 简易 MLP 分类器（PyTorch）
  - [x] scripts/train_torch.py：MLP、早停、可配置超参
  - [x] 评估与指标记录与传统 ML 对齐
  - [x] 保存最佳权重与训练曲线（CSV 或图像）

- [x] Task 8: 实验配置与记录
  - [x] configs/*.yaml：默认与若干对比配置（小网格）
  - [x] 统一 runner 脚本，基于配置运行并落盘到 experiments/
  - [x] 确认 metrics.csv 多条记录可比较

- [x] Task 9: 报告与沟通材料
  - [x] 报告 Notebook：数据、方法、设置、指标与图表、结论/局限
  - [x] 非技术说明：业务语言概述问题、方法、价值与限制
  - [x] 支持导出到 reports/（nbconvert 或保存 HTML/Markdown）

- [x] Task 10: 文档与质量保障
  - [x] 完善 README 与贡献指南（可选）
  - [x] black/isort/flake8 配置（可选启用）
  - [x] 所有单测通过；快速开始路径验证完成

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 2
- Task 6 depends on Task 5
- Task 7 depends on Task 5
- Task 8 depends on Tasks 6 and 7
- Task 9 depends on Task 8
- Task 10 depends on all previous tasks

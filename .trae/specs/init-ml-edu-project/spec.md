# 机器学习教学项目（NumPy/Pandas·预处理·ML/DL）Spec

## Why
为初学者和跨职能团队提供一个结构化、可运行的课程项目，系统理解 NumPy 与 Pandas 基础，掌握数据预处理与清洗方法，完成从传统机器学习到简单深度学习的端到端建模、调试、优化与结果解释，并产出可读报告以便与非技术成员沟通。

## What Changes
- 新建教学型代码仓库结构（notebooks、src、scripts、configs、experiments、reports）
- 提供两个入门 Notebook（NumPy 基础、Pandas 基础）
- 提供数据预处理与清洗模块及演示 Notebook
- 提供基线机器学习模型（LogisticRegression、RandomForest）训练/评估脚本与指标记录
- 提供基于 PyTorch 的简易 MLP 分类器训练/评估脚本与早停机制
- 提供轻量实验配置（YAML）与结果记录（CSV），支持网格搜索
- 提供面向技术与非技术读者的报告模板与导出流程
- 提供基本的单元测试与代码风格建议（MVP 可选开启）
- 不涉及任何破坏性升级或依赖替换

## Impact
- Affected specs: 基础库学习、数据清洗、传统 ML、简单 DL、实验对比、结果报告与沟通
- Affected code: 
  - notebooks/: 学习与演示
  - src/data/: 数据读取/清洗/特征处理
  - src/models/: 传统 ML 与 MLP 模型封装
  - scripts/: 训练、评估、导出报告、运行实验
  - configs/: 实验与训练配置
  - experiments/: 指标与工件输出
  - reports/: 报告与可视化产物

## ADDED Requirements
### Requirement: 基础库学习（NumPy / Pandas）
系统提供两个可运行的入门 Notebook，覆盖：
- NumPy：数组创建、索引切片、广播、形状变换、向量化计算、常见错误排查
- Pandas：数据读取/检查、缺失值处理、类型转换、合并/连接、分组聚合、简单可视化

#### Scenario: 成功运行
- WHEN 学习者按 README 启动环境并运行两个 Notebook
- THEN 所有单元格无报错、产出预期结果与图表

### Requirement: 数据预处理与清洗
提供可复用的数据处理模块与演示：
- 数据集选型：使用 sklearn 自带乳腺癌分类数据集（避免外部下载）
- 模块能力：加载、缺失值与异常值处理、特征缩放/编码、训练集/验证集/测试集切分、随机种子固定
- 提供演示 Notebook 展示常见清洗流程与注意事项

#### Scenario: 成功运行
- WHEN 运行预处理演示 Notebook 或调用模块函数
- THEN 生成划分完毕的特征与标签，形状与数据类型满足后续训练脚本要求

### Requirement: 机器学习基线
提供可复现的传统 ML 基线：
- 模型：LogisticRegression 与 RandomForest（二分类）
- 指标：accuracy、precision、recall、f1、ROC-AUC；输出混淆矩阵
- 能力：训练、验证、测试；保存模型与指标；从配置加载超参；GridSearch 可选
- 产出：experiments/metrics.csv 追加记录，包含配置摘要与随机种子

#### Scenario: 成功训练与评估
- WHEN 使用默认配置运行训练脚本
- THEN 在 experiments 目录生成模型文件与一条包含完整指标的记录

### Requirement: 简易深度学习（PyTorch）
实现一个 MLP 分类器（若无 GPU 则 CPU 可运行）：
- 架构：若干全连接层 + ReLU + Dropout；交叉熵损失
- 训练：mini-batch、学习率与正则化可配；早停基于验证集
- 指标：与传统 ML 对齐；记录训练曲线
- 产出：保存最佳权重与指标，写入 experiments/metrics.csv

#### Scenario: 成功训练与评估
- WHEN 运行 MLP 训练脚本
- THEN 训练过程可见、无报错；最终导出最佳模型与评估指标

### Requirement: 实验与调试/优化
- 配置：configs/*.yaml 描述数据处理、模型与搜索空间（MVP 可先固定若干选项）
- 记录：所有运行在 experiments/ 生成带时间戳的目录；metrics.csv 汇总
- 调试：提供常见问题清单与简易性能分析示例（计时、数据维度检查、过拟合诊断）

#### Scenario: 记录完整
- WHEN 以不同配置多次运行
- THEN metrics.csv 中出现多条可比较记录，目录中包含权重与日志

### Requirement: 报告与沟通
- 技术报告：Jupyter Notebook 模板，包含数据描述、方法、实验设置、指标表、关键图表与结论
- 非技术说明：Markdown 模板，用业务语言解释问题、方法、收益与限制
- 导出：支持将技术 Notebook 导出为 Markdown/PDF（可选 nbconvert）

#### Scenario: 报告产出
- WHEN 执行报告脚本或在 Notebook 内导出
- THEN reports/ 下生成可阅读的技术报告与一份非技术说明

### Requirement: 协作与质量（MVP）
- README 覆盖环境准备、目录结构、快速开始
- 基础测试：对关键数据处理与指标计算提供单元测试
- 代码风格：提供 black/isort/flake8 配置（可选启用）

#### Scenario: 最小质量保障
- WHEN 运行测试命令
- THEN 核心单元测试通过；README 步骤可复现

## MODIFIED Requirements
无

## REMOVED Requirements
无


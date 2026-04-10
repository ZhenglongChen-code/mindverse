# Mindverse

Obsidian 个人 Wiki 自动化整理插件 — 将 Inbox 素材智能结构化为 Wiki 知识库。

## 功能特性

- **多模型支持**：Claude、通义千问、文心一言、GLM、Kimi、DeepSeek
- **三种触发模式**：手动触发、定时自动、保存触发
- **本地索引**：JSON 文件记录处理状态，极致节省 Token
- **双向链接**：自动生成 Wiki 风格双向链接

## 安装方式

### BRAT（推荐）

1. 安装 **BRAT** 插件（社区插件搜索 "BRAT"）
2. BRAT → Add a beta plugin → 输入 `ZhenglongChen-code/mindverse`
3. 等待安装完成后开启插件

### 手动安装

1. 下载 [最新 release](https://github.com/ZhenglongChen-code/mindverse/releases)
2. 解压到 Obsidian 插件目录：`.obsidian/plugins/mindverse/`

## 配置

1. 打开插件设置
2. 选择模型提供商（如 DeepSeek）
3. 填入 API Key

## 目录结构

插件会在你的知识库根目录创建：

```
├── Inbox/              # 原始素材文件夹，放入待处理的笔记
├── Wiki/               # AI 生成的结构化 Wiki 知识库
├── MindverseConfig/    # 配置文件（systemPrompt.txt、config.json）
└── MindverseIndex/     # 处理状态索引（processedIndex.json）
```

## 使用流程

1. 将原始笔记、网页摘抄等内容放入 `Inbox/` 文件夹
2. 触发处理（手动点击 / 定时 / 保存触发）
3. 查看 `Wiki/` 目录中生成的结构化文档

## 开发

```bash
# 安装依赖
npm install

# 构建插件
cd packages/obsidian-plugin
npm install
npm run build
```

## License

MIT

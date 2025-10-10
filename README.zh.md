# BakLab Web 前端

[English](README.md) | 中文

这是 BakLab 的 Web 前端项目，使用 React、TypeScript 和 Vite 构建。

## 前置要求

- Node.js >= 20.16.0
- npm 或 pnpm

## 快速开始

### 1. 克隆仓库

```bash
git clone git@github.com:biliqiqi/baklab-web.git
cd baklab-web
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制示例环境文件并进行配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# API 配置
VITE_API_HOST=http://localhost:3000
VITE_API_PATH_PREFIX=/api/

# 静态文件服务
VITE_STATIC_HOST=https://static.example.com

# 前端服务地址
VITE_FRONTEND_HOST=http://localhost:5173

# 品牌名称
VITE_BRAND_NAME=BakLab

# OAuth 提供商（逗号分隔）
VITE_OAUTH_PROVIDERS=google,github
```

### 4. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 运行。

## 配置说明

### 环境变量

| 变量名                 | 说明                     | 默认值                       |
| ---------------------- | ------------------------ | ---------------------------- |
| `VITE_API_HOST`        | 后端 API 地址            | `http://localhost:3000`      |
| `VITE_API_PATH_PREFIX` | API 路径前缀             | `/api/`                      |
| `VITE_STATIC_HOST`     | 静态文件服务器地址       | `https://static.example.com` |
| `VITE_FRONTEND_HOST`   | 前端服务地址             | `http://localhost:5173`      |
| `VITE_BASE_URL`        | 静态资源基础路径         | `/`                          |
| `VITE_BRAND_NAME`      | 应用品牌名称             | `BakLab`                     |
| `VITE_OAUTH_PROVIDERS` | OAuth 提供商（逗号分隔） | （空）                       |

## 生产环境构建

```bash
npm run build
```

构建文件将输出到 `dist/` 目录。

## Docker 部署

Docker 部署说明请参考 [DOCKER_USAGE.zh.md](DOCKER_USAGE.zh.md)。

## 许可证

本项目采用 Apache License 2.0 许可证 - 详见 [LICENSE](LICENSE) 文件。

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

## 端到端测试

Playwright 用于 e2e 覆盖。`docker-compose.e2e.yml` 会启动一个一次性的后端栈（PostgreSQL + Valkey + `ghcr.io/biliqiqi/baklab:latest`），因此不需要手动运行 Go 服务。相关测试文件（包括密钥）全部放在 `frontend/packages/baklab-web` 下，前端仓库可以独立运行。

1. 首次运行时可以让脚本自动使用 `.env.backend.e2e.example` 复制出 `.env.backend.e2e`，之后按需修改；该文件同时提供 Docker Compose 与 Playwright 所需变量，所以请将 `VITE_API_HOST` 设置为 `http://localhost:3300`（或你自定义的 `E2E_BACKEND_PORT`），并让 `E2E_BASE_URL` 与前端 Dev Server 地址保持一致。
2. 启动后端环境：`npm run test:e2e:setup`
3. 执行 e2e 用例：`npm run test:e2e`
4. 清理环境：`npm run test:e2e:clean`

也可以通过 `npm run test:e2e:ci` 在一条命令里完成「启动 → 测试 → 清理」的完整流程，适合在 CI 场景下使用。（需要更换环境文件时，可设置 `E2E_ENV_FILE`。）

## Docker 部署

Docker 部署说明请参考 [DOCKER_USAGE.zh.md](DOCKER_USAGE.zh.md)。

## 许可证

本项目采用 Apache License 2.0 许可证 - 详见 [LICENSE](LICENSE) 文件。

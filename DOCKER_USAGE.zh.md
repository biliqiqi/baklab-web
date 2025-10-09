# BakLab Frontend Docker 镜像使用说明

[English](DOCKER_USAGE.md) | 简体中文

## 概述

BakLab Frontend Docker 提供打包好的 BakLab Web 前端静态资源，支持运行时环境变量替换和资源清单生成。

## 镜像特性

- **运行时环境变量替换**：支持在容器运行时替换前端代码中的环境变量占位符
- **资源清单生成**：自动生成详细的前端资源清单文件
- **灵活的输出目录**：支持自定义输出目录用于 volume 共享

## 基本用法

### 简单运行

```bash
docker run --rm \
  -v /path/to/output:/output \
  -e API_HOST=https://api.example.com \
  -e BASE_URL=/static/frontend/ \
  baklab-frontend:latest
```

### Docker Compose 集成

```yaml
services:
  frontend-builder:
    image: baklab-frontend:latest
    environment:
      - API_HOST=https://api.example.com
      - BASE_URL=/static/frontend/
      - API_PATH_PREFIX=/api/
      - FRONTEND_HOST=https://frontend.example.com
      - STATIC_HOST=https://cdn.example.com
      - OAUTH_PROVIDERS=google,github
    volumes:
      - ./frontend_dist:/output
    restart: 'no'
```

## 环境变量

### 支持的环境变量

镜像支持以下环境变量，用于运行时替换前端代码中的占位符：

| 环境变量          | 对应构建变量           | 描述                      | 默认值                       | 示例                      |
| ----------------- | ---------------------- | ------------------------- | ---------------------------- | ------------------------- |
| `API_HOST`        | `VITE_API_HOST`        | API 服务器地址            | `http://localhost:3000`      | `https://api.example.com` |
| `API_PATH_PREFIX` | `VITE_API_PATH_PREFIX` | API 路径前缀              | `/api/`                      | `/v1/api/`                |
| `FRONTEND_HOST`   | `VITE_FRONTEND_HOST`   | 前端服务器地址            | `http://localhost:5173`      | `https://app.example.com` |
| `STATIC_HOST`     | `VITE_STATIC_HOST`     | 静态资源服务器地址        | `https://static.example.com` | `https://cdn.example.com` |
| `BASE_URL`        | `VITE_BASE_URL`        | 静态资源基础路径          | `/`                          | `/static/frontend/`       |
| `OAUTH_PROVIDERS` | `VITE_OAUTH_PROVIDERS` | 逗号分隔的OAuth提供商列表 | `''` (空值)                  | `google,github`           |
| `OUTPUT_DIR`      | -                      | 输出目录路径              | `/output`                    | `/custom/output/path`     |

**说明**：对应构建变量列显示了 baklab-web 项目 `.env.example` 中的相应变量名。在构建阶段，Vite 使用 `VITE_*` 前缀变量将占位符嵌入构建结果；在运行阶段，Docker 容器使用无前缀变量替换这些占位符为实际运行时值。

## Volume 挂载

### 必需的 Volume

- **输出目录**：`/output` - 用于存放处理后的前端资源

```bash
-v /host/path:/output
```

## 输出文件

容器运行后会在输出目录生成以下文件：

### 1. 前端静态资源

- `index.html` - 主页面文件（已处理环境变量）
- `assets/` - 静态资源目录
  - `*.js` - JavaScript 文件（已处理环境变量）
  - `*.css` - 样式文件（已处理环境变量）
  - `*.png`, `*.svg` 等 - 图片资源
- 其他静态文件（favicon、manifest 等）

### 2. 资源清单文件

#### `.frontend-manifest.json`

详细的 JSON 格式资源清单：

```json
{
  "createdAt": "2024-09-25T10:46:23Z",
  "baseUrl": "/static/frontend/",
  "assets": {
    "scripts": "/static/frontend/assets/index-abc123.js",
    "styles": "/static/frontend/assets/index-def456.css"
  },
  "envVarsReplaced": {
    "API_HOST": "https://api.example.com",
    "API_PATH_PREFIX": "/api/",
    "FRONTEND_HOST": "https://app.example.com",
    "STATIC_HOST": "https://cdn.example.com",
    "BASE_URL": "/static/frontend/",
    "OAUTH_PROVIDERS": "google,github"
  }
}
```

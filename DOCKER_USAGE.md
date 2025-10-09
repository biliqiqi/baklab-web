# BakLab Frontend Docker Image Usage Guide

English | [简体中文](DOCKER_USAGE.zh.md)

## Overview

BakLab Frontend Docker provides packaged BakLab Web frontend static assets with runtime environment variable replacement and resource manifest generation support.

## Image Features

- **Runtime Environment Variable Replacement**: Supports replacing environment variable placeholders in frontend code at container runtime
- **Resource Manifest Generation**: Automatically generates detailed frontend resource manifest files
- **Flexible Output Directory**: Supports custom output directories for volume sharing

## Basic Usage

### Simple Run

```bash
docker run --rm \
  -v /path/to/output:/output \
  -e API_HOST=https://api.example.com \
  -e BASE_URL=/static/frontend/ \
  baklab-frontend:latest
```

### Docker Compose Integration

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

## Environment Variables

### Supported Environment Variables

The image supports the following environment variables for runtime replacement of placeholders in frontend code:

| Environment Variable | Corresponding Build Variable | Description                         | Default Value                | Example                   |
| -------------------- | ---------------------------- | ----------------------------------- | ---------------------------- | ------------------------- |
| `API_HOST`           | `VITE_API_HOST`              | API server address                  | `http://localhost:3000`      | `https://api.example.com` |
| `API_PATH_PREFIX`    | `VITE_API_PATH_PREFIX`       | API path prefix                     | `/api/`                      | `/v1/api/`                |
| `FRONTEND_HOST`      | `VITE_FRONTEND_HOST`         | Frontend server address             | `http://localhost:5173`      | `https://app.example.com` |
| `STATIC_HOST`        | `VITE_STATIC_HOST`           | Static resource server address      | `https://static.example.com` | `https://cdn.example.com` |
| `BASE_URL`           | `VITE_BASE_URL`              | Static resource base path           | `/`                          | `/static/frontend/`       |
| `OAUTH_PROVIDERS`    | `VITE_OAUTH_PROVIDERS`       | Comma-separated OAuth provider list | `''` (empty)                 | `google,github`           |
| `OUTPUT_DIR`         | -                            | Output directory path               | `/output`                    | `/custom/output/path`     |

**Note**: The "Corresponding Build Variable" column shows the corresponding variable names from the baklab-web project's `.env.example`. During build phase, Vite uses `VITE_*` prefixed variables to embed placeholders into build results; during runtime phase, Docker containers use non-prefixed variables to replace these placeholders with actual runtime values.

## Volume Mounts

### Required Volume

- **Output Directory**: `/output` - Used to store processed frontend assets

```bash
-v /host/path:/output
```

## Output Files

After container execution, the following files will be generated in the output directory:

### 1. Frontend Static Assets

- `index.html` - Main page file (with processed environment variables)
- `assets/` - Static assets directory
  - `*.js` - JavaScript files (with processed environment variables)
  - `*.css` - Style files (with processed environment variables)
  - `*.png`, `*.svg` etc. - Image resources
- Other static files (favicon, manifest, etc.)

### 2. Resource Manifest File

#### `.frontend-manifest.json`

Detailed JSON format resource manifest containing processed resource information:

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

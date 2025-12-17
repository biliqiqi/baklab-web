# BakLab Web Frontend

English | [中文](README.zh.md)

This is the web frontend for BakLab, built with React, TypeScript, and Vite.

## Prerequisites

- Node.js >= 20.16.0
- npm or pnpm

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:biliqiqi/baklab-web.git
cd baklab-web
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```env
# API configuration
VITE_API_HOST=http://localhost:3000
VITE_API_PATH_PREFIX=/api/

# Static file service
VITE_STATIC_HOST=https://static.example.com

# Frontend host
VITE_FRONTEND_HOST=http://localhost:5173

# Brand name
VITE_BRAND_NAME=BakLab

# OAuth providers (comma-separated)
VITE_OAUTH_PROVIDERS=google,github
```

### 4. Start development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Configuration

### Environment Variables

| Variable               | Description                       | Default                      |
| ---------------------- | --------------------------------- | ---------------------------- |
| `VITE_API_HOST`        | Backend API host                  | `http://localhost:3000`      |
| `VITE_API_PATH_PREFIX` | API path prefix                   | `/api/`                      |
| `VITE_STATIC_HOST`     | Static file server                | `https://static.example.com` |
| `VITE_FRONTEND_HOST`   | Frontend host URL                 | `http://localhost:5173`      |
| `VITE_BASE_URL`        | Base URL for assets               | `/`                          |
| `VITE_BRAND_NAME`      | Application brand name            | `BakLab`                     |
| `VITE_OAUTH_PROVIDERS` | OAuth providers (comma-separated) | (empty)                      |

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## End-to-End Testing

Playwright is used for e2e coverage. A disposable backend stack (PostgreSQL + Valkey + `ghcr.io/biliqiqi/baklab:latest`) is bundled via `docker-compose.e2e.yml` so you no longer need to run the Go server manually. Everything lives under `frontend/packages/baklab-web` (including test keys), so the frontend repo remains self-contained.

1. Create `.env.backend.e2e` (the setup script will copy `.env.backend.e2e.example` on first run) and update values if necessary. This single file now feeds both Docker Compose and Playwright—set `VITE_API_HOST` to `http://localhost:3300` (or whatever `E2E_BACKEND_PORT` you pick) and keep `E2E_BASE_URL` aligned with your dev server host.
2. Boot the backend stack: `npm run test:e2e:setup`
3. Run the e2e suite: `npm run test:e2e`
4. Shut everything down: `npm run test:e2e:clean`

You can execute the full cycle (setup → tests → cleanup) with one command via `npm run test:e2e:ci`. (Set `E2E_ENV_FILE` if you need Playwright to load a different env file.)

### Static asset uploads in tests

Site creation flows require uploading a logo. The e2e docker-compose stack now includes a lightweight static service (defined in `docker-compose.e2e.yml`) that runs `npm run test:e2e:static`, listens on `http://localhost:8789`, accepts uploads at `VITE_STATIC_HOST` (defaults to `http://localhost:8789/upload`), and serves files from `/uploads/*`. Sample images for tests live in `e2e/image-samples`.

Uploaded files are stored in `.e2e-static/` and the directory is wiped on every run, so no additional cleanup is needed.

## Docker Deployment

For Docker deployment instructions, see [DOCKER_USAGE.md](DOCKER_USAGE.md).

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

# BakLab Frontend

BakLab is a modern discussion platform similar to Reddit/Hacker News, built for online community discussions and content sharing.

## Prerequisites

- Node.js >= 20.16.0
- npm or pnpm

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
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

## Docker Deployment

For Docker deployment instructions, see [DOCKER_USAGE.md](DOCKER_USAGE.md).

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

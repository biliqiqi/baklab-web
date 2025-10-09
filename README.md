# BakLab Frontend

BakLab is a modern discussion platform similar to Reddit/Hacker News, built for online community discussions and content sharing.

## Features

- **Discussion Forums**: Create and participate in topic-based discussions
- **SEO Optimized**: Search engine friendly with server-side rendering support
- **Real-time Chat**: Live messaging and notifications
- **Category System**: Organize content with customizable bankuai (categories)
- **User Management**: Comprehensive user roles and permissions system
- **OAuth Integration**: Support for third-party authentication
- **Internationalization**: Multi-language support

## Prerequisites

- Node.js >= 20.16.0
- npm or pnpm

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd baklab/frontend
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
```

### 4. Start development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint and TypeScript checks
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run tests with Vitest

## Configuration

### Environment Variables

| Variable               | Description         | Default                      |
| ---------------------- | ------------------- | ---------------------------- |
| `VITE_API_HOST`        | Backend API host    | `http://localhost:3000`      |
| `VITE_API_PATH_PREFIX` | API path prefix     | `/api/`                      |
| `VITE_STATIC_HOST`     | Static file server  | `https://static.example.com` |
| `VITE_FRONTEND_HOST`   | Frontend host URL   | `http://localhost:5173`      |
| `VITE_BASE_URL`        | Base URL for assets | `/`                          |

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

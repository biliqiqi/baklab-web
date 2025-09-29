# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create docker env file with non-shell placeholders
COPY .env.template .env.docker

# Build the application with docker mode (will embed placeholders)
RUN npm run build -- --mode docker

# Production stage - lightweight Alpine for processing only
FROM alpine:latest

# Install sed and other basic utilities
RUN apk add --no-cache sed

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy environment replacement script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Environment variables that can be passed to the container
ENV API_HOST=""
ENV API_PATH_PREFIX=""
ENV FRONTEND_HOST=""
ENV STATIC_HOST=""
ENV BASE_URL=""
ENV OAUTH_PROVIDERS=""

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "echo 'Frontend processing complete' && sleep 5"]

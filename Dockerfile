# Build stage
FROM --platform=$BUILDPLATFORM node:20 AS build

WORKDIR /app

# Install git and configure for HTTPS
# Use single apt-get command to avoid GPG issues
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global url."https://github.com/".insteadOf ssh://git@github.com/

# Copy and install dependencies
COPY package*.json ./
COPY packages/plugin-api/package*.json ./packages/plugin-api/
COPY packages/plugin-api/tsconfig.json ./packages/plugin-api/
COPY packages/plugin-api/src ./packages/plugin-api/src
COPY tsconfig.json ./
RUN npm ci --ignore-scripts || npm i --ignore-scripts
RUN npm run prepare

# Copy source and build
COPY . .
RUN npm run lint && npm run buildFrontend:prodWeb

# Production stage
FROM nginx:1-alpine

ENV PORT=80

# Install runtime dependencies
RUN apk add --no-cache jq

# Copy built app and configs
COPY --from=build /app/dist/browser /usr/share/nginx/html
COPY ./nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE $PORT
WORKDIR /usr/share/nginx/html

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Build stage
FROM --platform=$BUILDPLATFORM node:20 AS build

WORKDIR /app

# Install git and configure for HTTPS
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/* && \
    git config --global url."https://github.com/".insteadOf ssh://git@github.com/

# Copy and install dependencies
COPY package*.json ./
RUN npm ci || npm i

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

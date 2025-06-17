# builds the app and runs the webversion inside a docker container

### build ###

# base image
FROM --platform=$BUILDPLATFORM node:20 AS build

# set working directory
WORKDIR /app

# install dependencies
COPY package*.json /app
RUN (npm ci || npm i) && npm i -g @angular/cli

# add `/app/node_modules/.bin` to $PATH
ENV PATH=/app/node_modules/.bin:$PATH

# add app
COPY . /app

# run linter
RUN npm run lint

# generate build
RUN npm run buildFrontend:prodWeb

### serve ###

# base image
# --platform=$TARGETPLATFORM is redundant and docker will raise a warning,
# but it makes it clearer that the target platform might be different from the
# build platform
FROM --platform=$TARGETPLATFORM nginx:1-alpine

# environmental variables
ENV PORT=80

# install dependencies
RUN apk update \
  && apk add --no-cache jq=1.7.1-r0

# copy artifact build from the 'build environment'
COPY --from=build /app/dist/browser /usr/share/nginx/html

# copy nginx config
COPY ./nginx/default.conf.template /etc/nginx/templates/default.conf.template

# copy our custom entrypoint script
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# expose port: defaults to 80
EXPOSE $PORT

# set working directory
WORKDIR /usr/share/nginx/html

# use our custom entrypoint script, to provide extra steps
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

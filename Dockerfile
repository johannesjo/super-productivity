# builds the app and runs the webversion inside a docker container

### build ###

# base image
FROM --platform=$BUILDPLATFORM node:20 as build

# add app
COPY . /app

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

RUN npm i
RUN npm i -g @angular/cli

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

# copy artifact build from the 'build environment'
COPY --from=build /app/dist/browser /usr/share/nginx/html

# copy nginx config
COPY ./nginx/default.conf.template /etc/nginx/templates/default.conf.template

# expose port: defaults to 80
EXPOSE $PORT

# run nginx
CMD ["nginx", "-g", "daemon off;"]

# builds the app and runs the webversion inside a docker container

### build ###

# base image
FROM node:16 as build

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
FROM nginx:1-alpine

# environmental variables
ENV PORT=80

# copy artifact build from the 'build environment'
COPY --from=build /app/dist /usr/share/nginx/html

# expose port: defaults to 80
EXPOSE $PORT

# run nginx
CMD ["nginx", "-g", "daemon off;"]

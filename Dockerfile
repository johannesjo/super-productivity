# builds the app and runs the webversion inside a docker container

### build ###

# base image
FROM node:12 as build

# install chrome for protractor tests
#RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
#RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
#RUN apt-get update && apt-get install -yq google-chrome-stable

# add app
COPY . /app

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

RUN yarn
RUN yarn global add @angular/cli

# run linter
RUN yarn lint

# generate build
RUN yarn buildFrontend:prodWeb

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

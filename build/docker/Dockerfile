FROM electronuserland/builder:wine

ENV DEBIAN_FRONTEND=noninteractive

# install google chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
  apt-get update -y && apt-get install -y --no-install-recommends xvfb google-chrome-stable libgconf-2-4 && \
  # clean
  apt-get clean && rm -rf /var/lib/apt/lists/*

# replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# add yarn repo
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

# install yarn and clean up
RUN apt-get update && apt-get install -y yarn && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 12.14.1

RUN mkdir $NVM_DIR -p

# install nvm with node and npm
RUN curl -sS -o- https://raw.githubusercontent.com/creationix/nvm/v0.35.2/install.sh | bash

# install node and npm
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# confirm installation
RUN node -v
RUN yarn -v

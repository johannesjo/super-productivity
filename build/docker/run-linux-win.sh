#!/usr/bin/env bash

PWD2=$PWD
# read as arg
PUB=$1

cd "$(dirname "$0")"

echo PUB $PUB
google-chrome --version

docker run $ENVS --rm \
        $(env | \
        grep -Eo '^[^\s=]*(_TOKEN|_KEY)[^\s=]*' | \
        sed '/^$/d;s/^/-e /' | \
        paste -sd ' ' \
        ) \
        -v ${PWD2}:/project \
        -v ~/.cache/electron:/root/.cache/electron \
        -v ~/.cache/electron-builder:/root/.cache/electron-builder \
        $(docker image build -q .) \
        /bin/bash -c "echo '____DOCKER_INNER_START____' && echo $PUB && node -v && npm -v && yarn -v && ls -l && yarn --link-duplicates --pure-lockfile && yarn run dist:linuxAndWin -p ${PUB} && ls -l ./dist"

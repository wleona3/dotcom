#!/bin/bash
set -e
PREFIX=_build/prod/
APP=site
BUILD_TAG=$APP:_build
BUILD_ARTIFACT=$APP-build.zip

# log into docker hub if needed
if [ "x$DOCKER_USERNAME" != x ]; then
    echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
fi

docker build -t $BUILD_TAG --build-arg SENTRY_DSN=$SENTRY_DSN .
CONTAINER=$(docker run -d ${BUILD_TAG} sleep 2000)

docker cp $CONTAINER:/root/${PREFIX}rel/$APP/. rel/
docker cp $CONTAINER:/root/apps/site/react_renderer/dist/app.js rel/app.js

docker kill $CONTAINER

test -f $BUILD_ARTIFACT && rm $BUILD_ARTIFACT || true
pushd rel
zip -r ../$BUILD_ARTIFACT * .ebextensions
rm -fr bin erts* lib releases
popd

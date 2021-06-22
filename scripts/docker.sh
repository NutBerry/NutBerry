#!/bin/sh

set -ex

image='ghcr.io/nutberry/artifacts/node'
tag=$(git tag --points-at HEAD)

if [ -z "$tag" ]; then
  tag='latest'
fi

echo $image:$tag
cd dist/
docker buildx create --name mybuilder --use || echo 'skip'
docker buildx inspect --bootstrap
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6 -t $image:$tag --push .
docker buildx imagetools inspect $image:$tag
cd -

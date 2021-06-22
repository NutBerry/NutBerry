#!/bin/sh

set -xe
trap 'docker-compose down --timeout 1' exit

docker-compose run --rm dev -i

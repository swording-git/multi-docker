#!/bin/bash
echo "$DOCKER_PASS" | docker login -u "$DOCKER_ID" --password-stdin
docker push swording/multi-client
docker push swording/multi-nginx
docker push swording/multi-server
docker push swording/multi-worker

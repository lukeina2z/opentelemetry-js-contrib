#!/bin/bash

npm uninstall  @opentelemetry/api
# npm uninstall  @opentelemetry/auto-instrumentations-node
npm uninstall  @aws/aws-distro-opentelemetry-node-autoinstrumentation

rm -fr ./node_modules
rm ./package-lock.json

npm install --save @opentelemetry/api
# npm install --save @opentelemetry/auto-instrumentations-node

npm install

OTEL_LOG_LEVEL="all" \
OTEL_TRACES_EXPORTER="otlp" \
    OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318" \
    OTEL_NODE_RESOURCE_DETECTORS="env,host,os,process" \
    OTEL_SERVICE_NAME="zOTel-Nodejs" \
    NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register" \
    node index.js






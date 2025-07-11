#!/bin/bash


rm -fr ./node_modules
# rm ./package-lock.json


# npm install
npm ci
npm run compile
npm run lint



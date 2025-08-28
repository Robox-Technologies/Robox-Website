#!/usr/bin/env bash

set -euo pipefail

# Install dependencies
. ~/.nvm/nvm.sh
nvm use node
npm install

# Compile and deploy
npx cross-env NODE_ENV=production npm run prod:build

pm2 delete server 2> /dev/null || true
pm2 start ./build/server/server.js --name "server"
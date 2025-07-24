#!/usr/bin/env bash

set -euo pipefail

# Install dependencies
. ~/.nvm/nvm.sh
nvm use node
npm install

# Compile and deploy
npx tsc -p tsconfig.webpack.json
npx tsc -p tsconfig.server.json
npx webpack --config build/server/webpack.prod.config.js
pm2 delete server 2> /dev/null || true
pm2 start ./build/server/server.js --name "server"
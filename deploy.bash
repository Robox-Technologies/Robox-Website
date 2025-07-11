# Install dependencies
nvm use node
npm install

# Compile and deploy
npx tsc -p tsconfig.server.json
webpack --config build/server/webpack.config.js
pm2 delete server 2> /dev/null || true
pm2 start ./build/server/server.js --name "server"

git pull
FROM node:lts-alpine AS base
WORKDIR /opt/node
COPY bin.js node.js wrapper-node.js options.js package.json /opt/node/
CMD if [[ ! -z "$SWAP" ]]; then fallocate -l $(($(stat -f -c "(%a*%s/10)*7" .))) _swapfile && mkswap _swapfile && swapon _swapfile && ls -hla; fi; /opt/node/wrapper-node.js

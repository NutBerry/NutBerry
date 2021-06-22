[![Coverage Status](https://coveralls.io/repos/github/NutBerry/NutBerry/badge.svg?branch=master)](https://coveralls.io/github/NutBerry/NutBerry?branch=master)
[![Continuous Integration](https://github.com/NutBerry/NutBerry/workflows/Coverage/badge.svg?branch=master)](https://github.com/NutBerry/NutBerry/actions?query=workflow%3ACoverage+branch%3Amaster)

# NutBerry - Offroading Ethereum Transactions
`A NutBerry a day keeps the sunshine your way.`

![Meme](https://nutberry.github.io/assets/minion.jpg)


# About

This repository contains contracts and a node client to power domain specific (optimistic) rollups.
Take a look at the [starter example]().

# Development

Use `docker-compose up --no-deps dev` to bootstrap the environment,
you only need to do this once and if you changed node_modules and/or docker files.

Enter the development container with `./scripts/dev.sh`.
Run the tests with `yarn test` or specific tests with `yarn _test **/bench.test.js`

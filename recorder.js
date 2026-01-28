#!/usr/bin/env node
// Entry point - delegates to packages/cli
const { main } = require('./packages/cli/index.js');
main();

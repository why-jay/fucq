#!/bin/bash

regenerator --include-runtime test.js > test.js.out
6to5 test.js.out > test-out.js
rm test.js.out
node test-out.js
rm test-out.js
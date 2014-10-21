'use strict';

const ITERATIONS = 5000;
const BULK_ADD_COUNT = 50;
const QUEUE_CAPACITY = 100;
const TEST_KEY_NAME = 'fucq_test:10';

const fucq = require('./main');

const _ = require('lodash');
const Bluebird = require('bluebird');
const assert = require('assert');
const redisClient = Bluebird.promisifyAll(require('redis').createClient());

Bluebird.coroutine(function* () {
    const q = Bluebird.promisifyAll(fucq.create({
        client: redisClient,
        key: TEST_KEY_NAME,
        capacity: QUEUE_CAPACITY
    }));

    assert.strictEqual(q.capacity, QUEUE_CAPACITY);

    yield q.emptyAsync();

    console.time(`Adding ${ITERATIONS}*${BULK_ADD_COUNT} items took`);
    for (let i of _.range(ITERATIONS)) {
        assert.strictEqual(yield q.addAsync(..._.range(BULK_ADD_COUNT * i, BULK_ADD_COUNT * (1 + i))), q.OK);
        assert.strictEqual(yield q.sizeAsync(), Math.min(BULK_ADD_COUNT * (1 + i), QUEUE_CAPACITY));
    }
    console.timeEnd(`Adding ${ITERATIONS}*${BULK_ADD_COUNT} items took`);

    const range = _.range(ITERATIONS * BULK_ADD_COUNT);
    assert(_.isEqual(yield q.allAsync(), _(range).last(QUEUE_CAPACITY).reverse().value()));

    for (i of _.last(range, QUEUE_CAPACITY)) {
        assert.strictEqual(yield q.addAsync(i), q.DUP_ENTRY);
        assert.strictEqual(yield q.sizeAsync(), Math.min(BULK_ADD_COUNT * ITERATIONS, QUEUE_CAPACITY));
    }

    assert.strictEqual(yield q.addAsync(-1), q.OK);
    assert.strictEqual(yield q.addAsync(-1), q.DUP_ENTRY);

    console.log('Success');

    yield redisClient.endAsync();
})();
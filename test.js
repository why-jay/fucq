'use strict';

const ITEMS_ADD_COUNT = 100000;
const QUEUE_CAPACITY = 100;
const TEST_KEY_NAME = 'fucq_test:10';

const Fucq = require('./main');

const _ = require('lodash');
const Bluebird = require('bluebird');
const assert = require('assert');
const redisClient = Bluebird.promisifyAll(require('redis').createClient());

Bluebird.coroutine(function* () {
    const q = Bluebird.promisifyAll(Fucq.create({
        client: redisClient,
        key: TEST_KEY_NAME,
        capacity: QUEUE_CAPACITY
    }));

    assert.strictEqual(q.capacity, QUEUE_CAPACITY);

    yield q.emptyAsync();

    const range = _.range(ITEMS_ADD_COUNT);
    for (let i of range) {
        assert.strictEqual(yield q.addAsync(i), Fucq.OK);
        assert.strictEqual(yield q.sizeAsync(), Math.min(i + 1, QUEUE_CAPACITY));
    }

    for (i of _.last(range, QUEUE_CAPACITY)) {
        assert.strictEqual(yield q.addAsync(i), Fucq.DUP_ENTRY);
        assert.strictEqual(yield q.sizeAsync(), QUEUE_CAPACITY);
    }

    assert.strictEqual(yield q.addAsync(-1), Fucq.OK);
    assert.strictEqual(yield q.addAsync(-1), Fucq.DUP_ENTRY);
    assert.strictEqual(yield q.addAsync(0), Fucq.OK);

    console.log('Success');

    yield redisClient.endAsync();
})();

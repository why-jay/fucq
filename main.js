'use strict';

var codes = {
    DUP_ENTRY: 1,
    OK: 0
};

var script = '\
    if redis.call("SISMEMBER", KEYS[1], ARGV[1]) == 1 then\
        return ' + codes.DUP_ENTRY + '\
    else\
        redis.call("SADD", KEYS[1], ARGV[1])\
        redis.call("LPUSH", KEYS[2], ARGV[1])\
        if redis.call("LLEN", KEYS[2]) > tonumber(ARGV[2]) then\
            redis.call("SREM", KEYS[1], redis.call("RPOP", KEYS[2]))\
        end\
        return ' + codes.OK + '\
    end\
';

var create = function (options) {
    var client = options.client;
    var key = options.key;
    var capacity = options.capacity;

    var setKey = key + ':set';
    var listKey = key + ':list';

    var add = function (item, cb) {
        client.eval(
            script,
            2, setKey, listKey, // KEYS[]
            item, capacity, // ARGV[]
            function (err, res) {
                if (err) {
                    cb(err);
                    return;
                }

                cb(null, res);
            }
        );
    };

    var empty = function (cb) {
        client.multi()
            .del(key + ':set')
            .del(key + ':list')
            .exec(function (err) {
                if (err) {
                    cb(err);
                    return;
                }

                cb(null);
            })
    };

    var size = function (cb) {
        client.llen(listKey, function (err, res) {
            if (err) {
                cb(err);
                return;
            }

            cb(null, res);
        });
    };

    return {
        add: add,
        capacity: capacity,
        empty: empty,
        size: size
    };
};

var Fucq = Object.create(codes);

Fucq.create = create;

module.exports = Fucq;
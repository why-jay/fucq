'use strict';

var codes = {
    DUP_ENTRY: 1,
    OK: 0
};

function generateArgvStr(startIndex, endIndex) { // endIndex IS INCLUDED
    var len = endIndex + 1 - startIndex;
    var range = [];
    for (var i = 0; i < len; ++i) {
        range.push('ARGV[' + (startIndex + i) +']');
    }
    return range.join(', ');
}

function defaultSerialize(result) {
    if (result === undefined) {
        return '__fucq_undefined__';
    }
    return JSON.stringify(result);
}

function defaultDeserialize(str) {
    if (str === '__fucq_undefined__') {
        return undefined;
    }
    return JSON.parse(str);
}

var create = function (options) {
    var client = options.client;
    var key = options.key;
    var capacity = options.capacity;

    var serialize = options.serialize || defaultSerialize;
    var deserialize = options.deserialize || defaultDeserialize;

    var setKey = key + ':set';
    var listKey = key + ':list';

    function add() {
        var argsCount = arguments.length - 1;
        var args = [];
        for (var i = 0; i < argsCount; ++i) {
            args.push(arguments[i]);
        }
        var cb = arguments[argsCount];

        var argvStr = generateArgvStr(1, argsCount);
        var subArgvStr = generateArgvStr(1, argsCount - capacity) || '""';

        var script = '\
            local setKey = KEYS[1]\
            local listKey = KEYS[2]\
\
            local argsCount = tonumber(#ARGV - 1)\
            local capacity = tonumber(ARGV[#ARGV])\
\
            for i=1,argsCount do\
                if redis.call("SISMEMBER", setKey, ARGV[i]) == 1 then\
                    return ' + codes.DUP_ENTRY + '\
                end\
            end\
\
            redis.call("SADD", setKey, ' + argvStr + ')\
\
            local emptyCount = capacity - redis.call("LLEN", listKey)\
\
            if argsCount <= emptyCount then\
                redis.call("LPUSH", listKey, ' + argvStr + ')\
                redis.call("SADD", setKey, ' + argvStr + ')\
            elseif argsCount >= capacity then\
                redis.call("DEL", listKey)\
                redis.call("DEL", setKey)\
                redis.call("LPUSH", listKey, ' + subArgvStr + ')\
                redis.call("SADD", setKey, ' + subArgvStr + ')\
            else\
                for i = 1,(argsCount - emptyCount) do\
                    redis.call("SREM", setKey, redis.call("RPOP", listKey))\
                end\
                redis.call("LPUSH", listKey, ' + argvStr + ')\
            end\
\
            return ' + codes.OK + '\
        ';

        var evalArgs = [];
        evalArgs.push(script);
        evalArgs.push(2);
        evalArgs.push(setKey); // KEYS[1]
        evalArgs.push(listKey); // KEYS[2]
        for (i = 0; i < argsCount; ++i) {
            evalArgs.push(serialize(args[i])); // ARGV[1] ... ARGV[argsCount]
        }
        evalArgs.push(capacity); // ARGV[argCnt + 1]
        evalArgs.push(cb);

        client.eval.apply(client, evalArgs);
    }

    function all(cb) {
        client.lrange(listKey, 0, -1, function (err, arr) {
            if (err) {
                cb(err);
                return;
            }

            cb(null, arr.map(function (item) { return deserialize(item); }));
        });
    }

    function empty(cb) {
        client.multi()
            .del(key + ':set')
            .del(key + ':list')
            .exec(cb);
    }

    function size(cb) {
        client.llen(listKey, cb);
    }

    var fucqInstance = Object.create(codes);
    fucqInstance.add = add;
    fucqInstance.all = all;
    fucqInstance.capacity = capacity;
    fucqInstance.empty = empty;
    fucqInstance.size = size;

    return fucqInstance;
};

var fucq = Object.create(codes);
fucq.create = create;

module.exports = fucq;
#FIFO Uniqueness Circular Queue

(acronym intended)

Fixed-capacity FIFO queue that enforces uniqueness among elements, using Redis. Every operation is O(1).

#Install

```
npm install fucq
```

#Example

```
var Fucq = require('fucq');
var assert = require('assert');

var q = Fucq.create({
    client: redisClient,
    key: 'foo:1',
    capacity: 2
});

// sorry for the callback hell, too lazy to write in promises/coroutines
q.empty(function (err) { // "empty" method
    if (err) throw err;
    
    q.add('a', function (err, res) { // queue is now ['a']
        if (err) throw err;
        
        assert.strictEqual(res, Fucq.OK); // status OK
    
        q.add('b', function (err, res) { // queue is now ['b', 'a']
            if (err) throw err;
            
            assert.strictEqual(res, Fucq.OK);
    
            q.add('c', function (err, res) { // queue is now ['c', 'b']
                if (err) throw err;
                
                assert.strictEqual(res, Fucq.OK);
                
                q.add('c', function (err, res) { // duplicate cannot be added
                    if (err) throw err;
                    
                    assert.strictEqual(res, Fucq.DUP_ENTRY); // status DUP_ENTRY
                    
                    q.size(function (err, res) { // "size" method (asynchronous)
                        if (err) throw err;
                        
                        assert.strictEqual(res, q.capacity); // 2 === 2                    
                    })
                });
            });
        });
    });
});
```

#Test

Test is written in ES6, so Regenerator, 6to5 and Bash are being used for transpilation.

```
npm test
```
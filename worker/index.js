const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000            // if no Redis server connection retry it every 1000 ms
});

const sub = redisClient.duplicate();    // sub for subscription

function fib(index) {
  if (index < 2) {
    return 1;
  }

  return fib(index - 1) + fib(index - 2);
}

// with each new value added to Redis we receive a message so it's `sub.on('message', ...)`
// message is the index arg to fib(index). 'values' is the name of hash to store fib(index) values in
sub.on('message', (channel, message) => {
  redisClient.hset('values', message, fib(parseInt(message)));
  console.log('channel:', channel);
  console.log('message:', message);
});
// subscribe to inserting values to Redis. The values is picked up by `sub.on('message', ...)` above
// `sub.subscribe('insert')` subscribes to messages sent by server. See server/index.js, line 68 (`redisPublisher.publish('insert', index)`)
setTimeout(() => sub.subscribe('insert'), 3000);
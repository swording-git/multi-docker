const keys = require('./keys');

// Express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Postgres client setup. To connect to Postgres
const { Pool } = require('pg');

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});

// Postgres connection error
pgClient.on('error', () => console.log('Lost PG connection.'));
// to connect to Postgres DB we need an existing table in it
pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')     // values is table name
  .catch((err) => console.log('Error creating initial Postgres table:', err));

// Redis client setup
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
  res.send('Hi');
});

// values below are the submitted indexes to fib(index)

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * FROM values');    // values table on line 28
  // values.rows carries only the actual data w/o metadata like query duration, what tables we touched etc.
  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {    // Redis doesn't support Promise, we need classic callback
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;   // index arg to fib(index) submitted by user

  if (!index) {
    return res.send('No index submitted');
  }

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  // 3rd arg 'Nothing yet!' is initial value for index. Later worker puts actual values there
  
  redisClient.hset('values', index, 'Nothing yet!', () => redisPublisher.publish('insert', index));
  // send message with index to worker
  // redisPublisher.publish('insert', index);

  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
  // just to let user know the fib value is being calculated
  res.send({ working: true });
});

app.listen(5000, err => err ? console.log('Server\'s app.listen() error:', err) : console.log('Server\'s running Ok.'));
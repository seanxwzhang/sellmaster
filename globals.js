"use strict";
const bluebird = require('bluebird');
var winston = require('winston');
require('winston-loggly-bulk');

winston.add(winston.transports.Loggly, {
   token: "518f1827-da82-41c2-b3f7-afe953817d74",
   subdomain: "sellmaster",
   tags: ["Winston-NodeJS"],
   json:true
});

//connect redis
var redis = require('redis');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
var redisClient = redis.createClient(process.env.REDIS_PORT,process.env.REDIS_HOSTNAME, {password: process.env.REDIS_PASS});

if (process.env.NODE_ENV != 'dev' && process.env.NODE_ENV != 'prod') {
    throw new Error('NODE_ENV not defined');
}

console.log('Connecting to Redis server');
redisClient.on('connect', function() {
    console.log(`Redis server connected to ${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);
});
redisClient.on('error',function(err){
  console.log('Redis server connection error',err);
});

module.exports = {winston, redisClient};

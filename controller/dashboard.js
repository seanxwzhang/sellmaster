"use strict";

const Promise = require("bluebird");
const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey} = require("./utility");
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("./client.js");
var router = require('express').Router();

// this is an example of how to use eBayClient and ShopifyClient
router.get('/ebayexample', (req, res, next) => {
    // instantiate a new client, pass in ebay username
    var ebayclient = new eBayClient('TESTUSER_sellmaster');
    
})

router.get('/shopifyexample', (req, res, next) => {

})

module.exports = router;

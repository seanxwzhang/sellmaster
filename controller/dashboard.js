"use strict";

const Promise = require("bluebird");
const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey} = require("./utility");
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("./client.js");
const checkSession = require("./utility.js").checkSession;
var router = require('express').Router();

router.get('/', checkSession, (req, res, next) => {
    res.render('dashboard',{
        styles: ['css/sidebar.css','css/dashboard.css'],
        js: ['js/sidebar.js','js/dashboard.js']
    });
})

// this is an example of how to use eBayClient and ShopifyClient
router.get('/ebayexample', (req, res, next) => {
    // instantiate a new client, pass in ebay username
    var ebayclient = new eBayClient('TESTUSER_sellmaster');
    // ebayclient.get('buy/browse/v1/item_feed', {feed_type: 'DAILY', category_id: '15032', date: '20170502'})
    // the above and the following are equivalent
    ebayclient.get('buy/browse/v1/item_feed?feed_type=DAILY&category_id=15032&date=20170502')
    .then((result) => {
        console.log(result);
        res.status(200).send(result);
    }).catch((err) => {
        console.log(err);
    })
})

router.get('/shopifyexample', (req, res, next) => {

})

/**
 * user starts synchronize between two stores,
 * 1. perform synchronization with ebayClient and ShopifyClient
 * 2. could render a progress interface
 **/
router.get('/startSynchonize', (req, res, next) => {

})



module.exports = router;

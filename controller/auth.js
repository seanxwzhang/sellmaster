"use strict";

const router = require('express').Router();
const crypto = require('crypto');
const {winston, redisClient} = require("../globals");
const {getStoreName, getScope, getUrl, getNonceKey, getTockenKey} = require("./utility");
var shopifyAPI = require('shopify-node-api');

router.get('/shopify/initiate', (req, res, next) => {
    crypto.randomBytes(48, (err, buf) => {
        var nonce = buf.toString('hex');
        redisClient.setAsync(getNonceKey('shopify', getStoreName(req)), nonce)
        .then((result) => {
            var config = {
                shop: getStoreName(req),
                shopify_api_key: process.env.CLIENT_ID,
                shopify_shared_secret: process.env.APP_TOCKEN,
                shopify_scope: getScope(),
                redirect_uri: getUrl("shopify"),
                nonce: nonce,
                verbose: false
            };
            var Shopify = new shopifyAPI(config);
            var auth_url = Shopify.buildAuthURL();
            res.redirect(auth_url);
        }).catch((err) => {
            if (process.env.NODE_ENV) console.log(err);
            winston.log("error", err);
            res.status(500).send("Server error, please retry");
        });
    });
})

router.get('/ebay/initiate', (req, res, next) => {
    res.send("hello world");
});

router.get('/shopify/callback', (req, res, next) => {
    redisClient.getAsync(getNonceKey('shopify', getStoreName(req)))
    .then((nonce) => {
        var config = {
            shop: getStoreName(req),
            shopify_api_key: process.env.CLIENT_ID,
            shopify_shared_secret: process.env.APP_SECRET,
            shopify_scope: getScope(),
            redirect_uri: getUrl("shopify"),
            nonce: nonce,
            verbose: false
        };
        var Shopify = new shopifyAPI(config),
            query_params = req.query;

        Shopify.exchange_temporary_token(query_params, function(err, data){
            if (err) {
                if (process.env.NODE_ENV) console.log(err);
                res.status(500).send("exchange token wrong");
            } else {
                redisClient.setAsync(getTockenKey("shopify", config.shop), data['access_token'])
                .then((result) => {
                    // console.log(data['access_token']);
                    res.status(200).send("success!");
                })
            }
        });
    });
});

router.get('/ebay/callback', (req, res, next) => {
    res.send("hello world");
});

module.exports = router;

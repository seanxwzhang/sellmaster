"use strict";

const router = require('express').Router();
const crypto = require('crypto');
const rp = require('request-promise');
const request = require('request');
const {winston, redisClient} = require("../globals");
const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey} = require("./utility");
const {eBayClient, ShopifyClient} = require('./client');
const parseString = require('xml2js').parseString;
const jwt = require('jsonwebtoken'); // use JWT for eBay nonce encryption
const fs = require('fs');
var shopifyAPI = require('shopify-node-api');

router.get('/shopify/initiate', (req, res, next) => {
    crypto.randomBytes(48, (err, buf) => {
        var nonce = buf.toString('hex');
        redisClient.setAsync(getNonceKey('shopify', getStoreName(req)), nonce)
        .then((result) => {
            console.log(getCallbackUrl("shopify"));
            var config = {
                shop: getStoreName(req),
                shopify_api_key: process.env.CLIENT_ID,
                shopify_shared_secret: process.env.APP_TOCKEN,
                shopify_scope: getScope(),
                redirect_uri: getCallbackUrl("shopify"),
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
    rp({
        method: 'POST',
        uri: process.env.EBAY_ENV == "sandbox" ? "http://open.api.sandbox.ebay.com/shopping" : "http://open.api.ebay.com/shopping",
        headers: {
            "X-EBAY-API-APP-ID": process.env.EBAY_ENV == "sandbox" ? process.env.EBAY_SANDBOX_CLIENT_ID : process.env.EBAY_PROD_CLIENT_ID,
            "X-EBAY-API-SITE-ID": 0,
            "X-EBAY-API-CALL-NAME": "GetUserProfile",
            "X-EBAY-API-VERSION": 824,
            "X-EBAY-API-REQUEST-ENCODING": "xml"
        },
        body: `<?xml version="1.0" encoding="utf-8"?><GetUserProfileRequest xmlns="urn:ebay:apis:eBLBaseComponents"><UserID>${getStoreName(req)}</UserID></GetUserProfileRequest>`,
        resolveWithFullResponse: true,
        simple: false
    }).then((response) => {
        var flag = response.body.match(/<Ack.*>([^<]*)<\/Ack>/)[1];
        console.log(flag);
        if (flag == "Success") {
            return getStoreName(req);
        } else if (flag == "Failure") {
            throw "no matching userid"
        } else {
            throw "xml parsing error";
        }
    }).catch((err) => {
        if (err == "no matching userid") {
            res.redirect('/?message=No matching eBay userID');
        }
        throw err;
    }).then((userid) => {
        crypto.randomBytes(48, (err, buf) => {
            var nonce = buf.toString('hex');
            var token = jwt.sign({ 'userid': userid, 'nonce': nonce }, process.env.JWT_SECRET, { expiresIn: '1h' });
            console.log("nonce is: " + nonce);
            redisClient.setAsync(getNonceKey('ebay', userid), nonce)
            .then((result) => {
                var url = process.env.NODE_ENV == 'dev' ? process.env.EBAY_SANDBOX_SIGNIN_URL : process.env.EBAY_PROD_SIGNIN_URL;
                url += `&state=${token}`;
                res.redirect(url);
            })
        })
    }).catch((err) => {
        if (err !== "no matching userid") {
            res.status(500).send(err);
        } else {
            return;
        }
    })

});

router.get('/shopify/callback', (req, res, next) => {
    redisClient.getAsync(getNonceKey('shopify', getStoreName(req)))
    .then((nonce) => {
        var config = {
            shop: getStoreName(req),
            shopify_api_key: process.env.CLIENT_ID,
            shopify_shared_secret: process.env.APP_SECRET,
            shopify_scope: getScope(),
            redirect_uri: getCallbackUrl("shopify"),
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
    jwt.verify(req.query.state, process.env.JWT_SECRET, function(err, decoded) {
        if (err) {
            console.log("jwt decode failed, authentication failed");
            res.status(500).send('jwt decode failed, authentication failed');
        }
        var code = req.query.code,
            userid = decoded.userid,
            checkNonce = decoded.nonce;
        redisClient.getAsync(getNonceKey('ebay', userid))
        .then((nonce) => {
            console.log("nonce is: " + nonce);
            if (checkNonce != nonce) throw "Nonce verification failed";
            if (!code) throw "No authorization code";
            if (process.env.NODE_ENV == 'dev') {
                var credential = 'Basic ' + Buffer.from(`${process.env.EBAY_SANDBOX_CLIENT_ID}:${process.env.EBAY_SANDBOX_CLIENT_SECRET}`).toString('base64');
                var RuName = process.env.RUNAME_SANDBOX;
            } else {
                var credential = 'Basic ' + Buffer.from(`${process.env.EBAY_PROD_CLIENT_ID}:${process.env.EBAY_PROD_CLIENT_SECRET}`).toString('base64');
                var RuName = process.env.RUNAME_PROD;
            }
            return rp({
                method: 'POST',
                uri: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': credential
                },
                body: `grant_type=authorization_code&code=${code}&redirect_uri=${RuName}`,
                json: true,
                resolveWithFullResponse: true
            }).then((response) => {
                return redisClient.setAsync(getTockenKey("ebay", userid), response.body.access_token)
                .then((result) => {
                    console.log(result);
                    console.log(getTockenKey("ebay", userid));
                    console.log(response.body.access_token);
                    res.status(200).send("success");
                }).then((result) => {
                    console.log(result);
                    res.status(200).send(result);
                }).catch((err) => {
                    console.log("ebay client error: " + err);
                    res.status(500).send("Sever error: " + err);
                })

            }).catch((err) => {
                console.log("authentication failed, user tocken not obtained: " + err);
                res.status(400).send("Server error: " + err);
            })
        }).catch((err) => {
            if (process.env.NODE_ENV) console.log(err);
            res.status(500).send("Server error: " + err);
        })
    });

});

module.exports = router;

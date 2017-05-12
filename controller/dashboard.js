"use strict";

const Promise = require("bluebird");
const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey} = require("./utility");
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("./client.js");
const checkSession = require("./utility.js").checkSession;
const getAlleBayProducts = require("../models/products.js").getAlleBayProducts;
const AppError = require("../models/error.js");
var router = require('express').Router();

var sessionAuth = function(req, res, next) {
    if (req.session.id) {
        checkSession(req)
        .then((result) => {
            if (result.ebay && result.shopify) {
                next();
            } else {
                res.redirect('/?from_call_back=true');
            }
        })
    } else {
        res.redirect('/');
    }
};


router.get('/', sessionAuth, (req, res, next) => {
    getAlleBayProducts(req)
    .then((data) => {
        var ebayData = {
            id: "ebayProducts",
            data: data
        };
        var shopifyData = {
            id: "shopifyProducts",
            data: data
        }
        res.render('dashboard', {
            styles: ["css/dashboard.css", "https://cdn.datatables.net/1.10.15/css/jquery.dataTables.min.css"],
            js: ["js/dashboard.js", "https://cdn.datatables.net/v/dt/dt-1.10.15/datatables.min.js"],
            eBayList: ebayData
        })
    }).catch((err) => {
        console.log(err);
        if (err instanceof AppError) {
            if (err.type == "authentication") {
                res.redirect("/from_call_back=true");
            } else {
                res.status(500).send(JSON.stringify(err));
            }
        } else {
            res.status(500).send(JSON.stringify(err));
        }
    })
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

"use strict";

const Promise = require("bluebird");
const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey} = require("./utility");
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("./client.js");
const checkSession = require("./utility.js").checkSession;
const getAlleBayProducts = require("../models/products.js").getAlleBayProducts;
const getAllShopifyProducts = require("../models/products.js").getAllShopifyProducts;
const getActiveEbaySellings = require("../models/products.js").getActiveEbaySellings;
const getAllActiveEbaySellings = require("../models/products.js").getAllActiveEbaySellings;
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

router.get('/testapi', sessionAuth, (req, res, next) => {
    getAllActiveEbaySellings(req)
    .then((data) => {
        res.status(200).send({products: data});
    })
})

router.get('/ebaylist', sessionAuth, (req, res, next) => {
    getActiveEbaySellings(req)
    .then((data) => {
        res.status(200).send({products: data});
    }).catch((err) => {
        console.log(err);
        if (err instanceof AppError) {
            if (err.type == "authentication") {
                res.redirect("/?from_call_back=true");
            } else {
                res.status(500).send(JSON.stringify(err));
            }
        } else {
            res.status(500).send(JSON.stringify(err));
        }
    })
});

router.get('/shopifylist', sessionAuth, (req, res, next) => {
    getAllShopifyProducts(req)
    .then((data) => {
        var parsedData = JSON.parse(data);
        res.status(200).send(parsedData);
    }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
    })
})



/**
 * user starts synchronize between two stores,
 * 1. perform synchronization with ebayClient and ShopifyClient
 * 2. could render a progress interface
 **/
router.get('/startSynchonize', (req, res, next) => {

})



module.exports = router;

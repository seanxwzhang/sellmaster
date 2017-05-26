"use strict";

const Promise = require("bluebird");
const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTokenKey} = require("./utility");
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("./client.js");
const checkSession = require("./utility.js").checkSession;
const productModel = require("../models/products.js");
const getAlleBayProducts = require("../models/products.js").getAlleBayProducts;
const getShopifyProducts = require("../models/products.js").getShopifyProducts;
const getActiveEbaySellings = require("../models/products.js").getActiveEbaySellings;
const getAllActiveEbaySellings = require("../models/products.js").getAllActiveEbaySellings;
const postShopifyProduct = require("../models/products.js").postShopifyProduct;
const checkAuthError = require("../controller/utility.js").checkAuthError;
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

router.get('/ebaylist', sessionAuth, (req, res, next) => {
    getAllActiveEbaySellings(req)
    .then((data) => {
        res.status(200).send({products: data});
    })
})

router.get('/requestEbay', sessionAuth, (req, res, next) => {
    res.status(200).send("acquiring info from ebay");
    // req.query.all = true;
    req.query.ifsave = true;
    productModel.getAllActiveEbaySellings(req)
    .then((data) => {
        console.log('done');
    }).catch((err) => {
        console.log(err);
    })
});

router.get('/requestShopify', sessionAuth, (req, res, next) => {
  res.status(200).send('acquiring info from shopify');
  productModel.requestAllShopifyProducts(req)
  .then((data) => {
    console.log('done');
  }).catch((err) => {
    console.log(err);
  })
})

router.get('/requestAll', sessionAuth, (req, res, next) => {
  res.status(200).send('acquiring info from ebay and shopify');
  productModel.requestAll(req)
  .then((data) => {
    console.log('done');
  }).catch((err) => {
    console.log(err);
  })
})

router.get('/getDifferencebyTitle', sessionAuth, (req, res, next) => {
  productModel.getDifferencebyTitle(req)
  .then((data) => {
    res.status(200).send(data);
  }).catch((err) => {
    console.log(err);
  })
})

router.get('/shopifylist', sessionAuth, (req, res, next) => {
    getShopifyProducts(req)
    .then((data) => {
        var parsedData = JSON.parse(data);
        res.status(200).send(parsedData);
    }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
    })
})


router.get('/dumpToShopify', sessionAuth, (req, res, next) => {
  // req.query.limit = 10;
  res.status(200).send("start synchronizing");
  productModel.pushAlleBayProductsToShopify(req);
})



/**
 * user starts synchronize between two stores,
 * 1. perform synchronization with ebayClient and ShopifyClient
 * 2. could render a progress interface
 **/
router.get('/startSynchonize', (req, res, next) => {

})



module.exports = router;

// ebay active request for synchronization
// ebay webhook handler
"use strict";

var router = require('express').Router();
const {eBayClient, ShopifyClient} = require('./client.js');

/**
 * webhook handler for item deletion from shopify
 * 1. should check if the item has been deleted from ebay already
 * 2. if not, delete it from ebay
 **/
router.get('/deleteItemCallback/shopify', (req, res, next) => {
    var ebayClient = new ebayClient('dsadasdasd');
    ebayClient.delete('dasjkdgasjhdgjhasgdhja')
    .then((result) => {
        console.log("yeah, deleted!");
    })
})


/**
 * webhook handler for item deletion from ebay
 * 1. should check if the item has been deleted from shopify already
 * 2. if not, delete it from ebay
 **/
router.get('/deleteItemCallback/ebay', (req, res, next) => {

})




module.exports = router;

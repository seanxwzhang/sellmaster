"use strict";

const rp = require("request-promise");
const bluebird = require("bluebird");
const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey} = require("./utility");
const {winston, redisClient} = require("./globals.js");




/**
 * Ebay http client
 **/
class eBayClient {
    constructor (storename) {
        if (process.env.NODE_ENV == "sandbox") {
            this.base_url = "https://api.sandbox.ebay.com";
        } else {
            this.base_url = "https://api.ebay.com";
        }
    }
}


/**
 * Shopify http client
 **/

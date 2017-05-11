"use strict";

const Promise = require("promise");
const rp = require('request-promise');
const request = require('request');
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("../controller/client.js");
const getTokenBySession = require("../utility.js").getTokenBySession;

var getAlleBayProducts = function(req) {
    
}

var getAllShopifyProducts = function(req) {

}

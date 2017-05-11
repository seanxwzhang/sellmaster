"use strict";
const crypto = require('crypto');
const {winston, redisClient} = require("../globals");
const Promise = require('bluebird');

var getStoreName = function(req) {
    if (req.query.storename && req.query.storename != "undefined") {
        return req.query.storename;
    } else if (req.query.shop) {
        return req.query.shop.split('.')[0];
    }else {
        return process.env.NODE_ENV == 'dev' ? "sell-master" : "safari-cycle-salvage-2";
    }
}

var getScope = function(scope) {
    return scope || "read_content,write_content,read_themes,write_themes,read_products,write_products,read_customers,write_customers,read_orders,write_orders,read_draft_orders,write_draft_orders,read_script_tags,write_script_tags,read_fulfillments,write_fulfillments,read_analytics,read_checkouts,write_checkouts,read_reports,write_reports";
}

var getCallbackUrl = function(channel) {
    return `http://${process.env.NODE_ENV == 'dev' ? 'localhost:' + process.env.UNSECURE_PORT : process.env.PROD_HOSTNAME}/auth/${channel}/callback`;
}

var getNonceKey = function(channel, shop) {
    return `${channel}:${shop}:nonce`;
}

var getTockenKey = function(channel, shop) {
    return `${channel}:${shop}:tocken`;
}

var getSessionKey = function(session) {
    return `session:${session}`;
}

var getTokenFieldName = function(channel) {
    return `${channel}Token`
}

var getIdFieldName = function(channel) {
    return `${channel}Id`
}

// use this method to extract userid/shopname for ebay/shopify based on session
var getIdBySession = function(channel, session) {
    return redisClient.hgetAsync(getSessionKey(session), getIdFieldName(channel));
}

var getTokenBySession = function(channel, session) {
    return redisClient.hgetAsync(getSessionKey(session), getTokenFieldName(channel))
}

var checkTokenValidity = function(channel, token) {
    if (token) {
        return true;
    } else {
        return false;
    }
}

/**
 * method for checking validity of session and the token validity associated with it
 * Shopify token doesn't have a expiration date on their tokens, so not check it
 * TDOO: check if ebay token has expired, it won't after the cron jobs for refreshing tokens are implemented
 **/
var checkSession = function(req) {
    return new Promise((resolve, reject) => {
        var result = {
            ebay: false,
            shopify: false
        };
        if (req.session.id) {
            console.log(req.session.id);
            Promise.join(
                getTokenBySession("shopify", req.session.id),
                getTokenBySession("ebay", req.session.id),
            (res1, res2) => { // TODO: check validity here?
                console.log(`shopify token: ${res1}`);
                console.log(`ebay token: ${res2}`);
                result['shopify'] = checkTokenValidity("shoipfy", res1);
                result['ebay'] = checkTokenValidity("ebay", res2);
                resolve(result);
            })
        } else {
            resolve(result);
        }
    })
}

var setTokenIdBySession = function(channel, session, token, id) {
    return redisClient.hmsetAsync(getSessionKey(session), getTokenFieldName(channel), token, getIdFieldName(channel), id);
}

module.exports = {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey, getTokenBySession, checkSession, setTokenIdBySession};

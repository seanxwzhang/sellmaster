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


var getToeknBySession = function(channel, session) {
    return redisClient.hgetAsync(getSessionKey(session), getTokenFieldName(channel))
}

// middle ware for authentication
var checkSession = function(req, res, next) {
    if (req.session.id) {
        Promise.join(
            getToeknBySession("shopify", req.session.id),
            getTokenBySession("ebay", req.session.id),
        (res1, res2) => { // TODO: check validity here?
            if (res1 === null || res2 === null) {
                res.redirect('/?message=Please log in first');
            } else {
                next();
            }
        })
    } else {
        res.redirect('/?message=Please log in first');
    }
}

module.exports = {getStoreName, getScope, getCallbackUrl, getNonceKey, getTockenKey, getToeknBySession, checkSession};

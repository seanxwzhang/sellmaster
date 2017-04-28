"use strict";

var getStoreName = function(req) {
    if (req.query.storename) {
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

var getUrl = function(channel) {
    return `http://${process.env.NODE_ENV == 'dev' ? 'localhost:' + process.env.PORT : process.env.PROD_HOSTNAME}/auth/${channel}/callback`;
}

var getNonceKey = function(channel, shop) {
    return `${channel}:${shop}:nonce`;
}

var getTockenKey = function(channel, shop) {
    return `${channel}:${shop}:tocken`;
}

module.exports = {getStoreName, getScope, getUrl, getNonceKey, getTockenKey};

"use strict";
const crypto = require('crypto');
const {winston, redisClient} = require("../globals");
const Promise = require('bluebird');
const rp = require('request-promise');
const moment = require('moment');
const AppError = require('../models/error');
// const {eBayClient, ShopifyClient} = require("./client.js");

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
  return `http://${process.env.NODE_ENV == 'dev' ? 'localhost:' + process.env.UNSECURE_PORT : process.env.HOSTNAME}/auth/${channel}/callback`;
}

var getNonceKey = function(channel, shop) {
  return `${channel}:${shop}:nonce`;
}

var getTokenKey = function(channel, shop) {
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

var setTokenIdBySession = function(channel, session, token, id, expires_in, refresh_token, refresh_token_expires_in) {
  if (refresh_token) {
    return redisClient.hmsetAsync(getSessionKey(session), getTokenFieldName(channel), token, getIdFieldName(channel), id, `${channel}expires_in`, expires_in, `${channel}refresh_token`, refresh_token, `${channel}refresh_token_expires_in`, refresh_token_expires_in, `${channel}last_refreshed_at`, moment().format());
  } else {
    return redisClient.hmsetAsync(getSessionKey(session), getTokenFieldName(channel), token, getIdFieldName(channel), id);
  }
}

var removeTokenIdBySession = function(channel, session) {
  return redisClient.hdelAsync(getSessionKey(session), getTokenFieldName(channel));
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
    if (req.session && req.session.id) {
      console.log(req.session.id);
      redisClient.hgetallAsync(getSessionKey(req.session.id))
      .then((obj) => {
        if (!obj) {
          resolve(result);
          return;
        }
        if (getTokenFieldName("shopify") in obj) {
          result['shopify'] = obj['shopifyId'];
        }
        if (getTokenFieldName("ebay") in obj && 'ebaylast_refreshed_at' in obj && 'ebayrefresh_token' in obj && 'ebayexpires_in' in obj) {
          var last_updated_at = moment(obj[`ebaylast_refreshed_at`]);
          var refresh_token = obj[`ebayrefresh_token`];
          var max_difference = obj['ebayexpires_in'] - 120;
          var difference = moment().diff(last_updated_at, 'seconds');
          var ebayid = obj[`ebayId`];
          console.log(last_updated_at.format());
          console.log(moment().format());
          // console.log(obj['ebayToken']);
          if (difference >= max_difference) { // refresh the token
          // if (true) {
            console.log("refreshing tocken!");
            if (process.env.NODE_ENV == 'dev') {
              var credential = 'Basic ' + Buffer.from(`${process.env.EBAY_SANDBOX_CLIENT_ID}:${process.env.EBAY_SANDBOX_CLIENT_SECRET}`).toString('base64');
              var RuName = process.env.RUNAME_SANDBOX;
            } else {
              var credential = 'Basic ' + Buffer.from(`${process.env.EBAY_PROD_CLIENT_ID}:${process.env.EBAY_PROD_CLIENT_SECRET}`).toString('base64');
              var RuName = process.env.RUNAME_PROD;
            }
            rp({
              method: 'POST',
              uri: `https://api${process.env.EBAY_ENV == 'prod' ? '' : '.sandbox'}.ebay.com/identity/v1/oauth2/token`,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': credential
              },
              body: `grant_type=refresh_token&refresh_token=${refresh_token}&scope=${process.env.EBAY_FULL_SCOPE}`,
              json: true,
              resolveWithFullResponse: true
            }).then((response) => {
              console.log(response.body);
              if (response.statusCode >= 200 && response.statusCode < 300) {
                Promise.join(
                  redisClient.hmsetAsync(getSessionKey(req.session.id), getTokenFieldName("ebay"), response.body.access_token, 'ebayexpires_in', response.body.expires_in,  `ebaylast_refreshed_at`, moment().format()),
                  redisClient.setAsync(getTokenKey("ebay", ebayid), response.body.access_token),
                  (ans1, ans2) => {
                    console.log("token refreshed");
                    result['ebay'] = ebayid;
                    resolve(result);
                  }
                )
              } else {
                result['ebay'] = false;
                resolve(result);
              }
            })
          } else {
            // console.log("not expired!");
            result['ebay'] = obj['ebayId'];
            resolve(result);
          }
        } else {
          result['ebay'] = false;
          resolve(result);
        }
      })
    } else {
      resolve(result);
    }
  })
}

var checkAuthError = function(response) {
  for (let key in response) {
    if ('Ack' in response[key] && response[key]['Ack'][0] == 'Failure' && response[key]['Errors'][0]['ShortMessage'][0].toLowerCase().indexOf('expire') > -1) {
      throw new AppError("expired", "authentication");
    }
  }
}

var getStores = function(req) {
  return redisClient.hgetallAsync(getSessionKey(req.session.id))
  .then((obj) => {
    // console.log("obj here", obj);
    var result = {};
    if ('shopifyId' in obj) {
      result['shopifyId'] = obj['shopifyId'];
    }
    if ('ebayId' in obj) {
      result['ebayId'] = obj['ebayId'];
    }
    return result;
  })
}

var getRoomName = function(ids) {
  return `room-${ids.ebayId}-${ids.shopifyId}`;
}

module.exports = {getStoreName, getScope, getCallbackUrl, getNonceKey, getTokenKey, getTokenBySession, checkSession, setTokenIdBySession, getIdBySession, removeTokenIdBySession, checkAuthError, getStores, getRoomName};

module.exports.test = 1;
// console.log(module.exports);

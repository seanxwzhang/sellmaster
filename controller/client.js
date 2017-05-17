"use strict";

const getStoreName = require("./utility").getStoreName;
const getScope = require("./utility").getScope;
const getCallbackUrl = require("./utility").getCallbackUrl;
const getNonceKey = require("./utility").getNonceKey;
const getTokenKey = require("./utility").getTokenKey;
const rp = require("request-promise");
const Promise = require("bluebird");
const {winston, redisClient} = require("../globals.js");
const fs = require("fs");

/**
* Ebay http client, mode is 'REST' or 'SOAP'
**/
class eBayClient {
  constructor(username, mode) {
    this.mode = mode || 'REST';
    if (this.mode == 'REST') {
      if (process.env.EBAY_ENV == "sandbox") {
        this.baseUrl = "https://api.sandbox.ebay.com";
      } else {
        this.baseUrl = "https://api.ebay.com";
      }
      this.username = username;
      this.authKey = undefined;
      this.headers = {
        'Authorization': '',
        'User-Agent': 'SellMaster Ebay Client',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US'
      };
      this.get = this.REST_request('GET');
      this.post = this.REST_request('POST');
      this.put = this.REST_request('PUT');
      this.delete = this.REST_request('DELETE');
    } else if (this.mode == 'SOAP') {
      if (process.env.EBAY_ENV == "sandbox") {
        this.baseUrl = "https://api.sandbox.ebay.com/ws/api.dll";
      } else {
        this.baseUrl = "https://api.ebay.com/ws/api.dll";
      }
      this.username = username;
      this.authKey = undefined;
      this.headers = {
        'X-EBAY-API-SITEID': 0,
        'X-EBAY-API-COMPATIBILITY-LEVEL':967,
        'X-EBAY-API-CALL-NAME': '',
        'X-EBAY-API-IAF-TOKEN': ''
      };
      this.get = this.SOAP_request('GET');
      this.post = this.SOAP_request('POST');
      this.put = this.SOAP_request('PUT');
      this.delete = this.SOAP_request('DELETE');
    }
  }

  SOAP_request(method) {
    let client = this;
    return (apicall, data) => {
      return new Promise((res, rej) => {
        if (typeof client.authKey !== "undefined") {
          res(client.headers);
        } else {
          console.log(getTokenKey("ebay", client.username));
          return redisClient.getAsync(getTokenKey("ebay", client.username))
          .then((token) => {
            client.authKey = token.replace(/\"/g, '');
            client.headers['X-EBAY-API-IAF-TOKEN'] = client.authKey;
            client.headers['X-EBAY-API-CALL-NAME'] = apicall;
            res(client.headers);
          }).catch((err) =>{
            rej("Error occured in acquiring ebay access token, please have the store login first: " + err);
          })
        }
      }).then((headers) => {
        console.log(`${method}  ${client.baseUrl} ${apicall}`);
        return rp({
          method: method,
          uri: client.baseUrl,
          headers: headers,
          body: data,
          resolveWithFullResponse: true,
          simple: false
        }).then((response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            return response.body;
          } else {
            throw response.body;
          }
        }).catch((err) => {
          throw err;
        })
      })
    }
  }

  REST_request(method) {
    let client = this;
    return (url, qs, data) => {
      let uri = [client.baseUrl, url].join('/');
      console.log(`${method}  ${uri}`);
      return new Promise((res, rej) => {
        if (typeof client.authKey !== "undefined") {
          res(client.headers);
        } else {
          return redisClient.getAsync(getTokenKey("ebay", client.username))
          .then((token) => {
            client.authKey = token.replace(/\"/g, '');
            if (!client.authKey.startsWith('Bearer ')) {
              client.authKey = 'Bearer ' + client.authKey;
            }
            client.headers['Authorization'] = client.authKey;
            res(client.headers);
          }).catch((err) => {
            rej("Error occured in acquiring ebay access token, please have the store login first: " + err);
          })
        }
      }).then((headers) => {
        return rp({
          method: method,
          uri: uri,
          qs: qs,
          headers: headers,
          body: data,
          resolveWithFullResponse: true,
          simple: false,
          json: true
        }).then((response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            return response.body;
          } else {
            throw response.body;
          }
        }).catch((err) => {
          throw err;
        })
      })

    }

  }
}


/**
* Shopify http client
**/
class ShopifyClient {
  constructor(storename) {
    this.storename = storename;
    this.baseUrl = `https://${storename}.myshopify.com`;
    this.headers = {
      'X-Shopify-Access-Token': ''
    };
    this.authKey = undefined;

    this.get = this._request('GET');
    this.post = this._request('POST');
    this.put = this._request('PUT');
    this.delete = this._request('DELETE');
  }

  _request(method) {
    let client = this;
    return(url, qs, data) => {
      let uri = [client.baseUrl, url.replace(/^\//, '')].join('/');
      console.log(`${method}  ${uri}`);
      return new Promise((res, rej) => {
        if (typeof client.authKey !== "undefined") {
          res(client.headers);
        } else {
          return redisClient.getAsync(getTokenKey("shopify", client.storename))
          .then((token) => {
            client.authKey = token.replace(/\"/g, '');
            client.headers['X-Shopify-Access-Token'] = client.authKey;
            res(client.headers);
          }).catch((err) => {
            rej("Error occured in acquiring ebay access token, please have the store login first: " + err);
          })
        }
      }).then((headers) => {
        // console.log(data);
        return rp({
          method: method,
          uri: uri,
          qs: qs,
          headers: headers,
          body: data,
          resolveWithFullResponse: true,
          simple: false,
          json: data ? true:false
        }).then((response) => {
          var fs = require('fs');
          fs.writeFileSync('/tmp/fs.json', JSON.stringify(response));
          // console.log(response)
          if (response.statusCode >= 200 && response.statusCode < 300) {
            return response.body;
          } else {
            return response.body;
          }
        }).catch((err) => {
          throw err;
        })
      })
    }
  }
}

module.exports = {eBayClient, ShopifyClient};

"use strict";

module.exports = function(io) {
  const Promise = require("bluebird");
  const {getStoreName, getScope, getCallbackUrl, getNonceKey, getTokenKey} = require("./utility");
  const _ = require('lodash');
  const {winston, redisClient} = require("../globals.js");
  const {eBayClient, ShopifyClient} = require("./client.js");
  const checkSession = require("./utility.js").checkSession;
  const {getAlleBayProducts, getShopifyProducts, getActiveEbaySellings, getAllActiveEbaySellings, postShopifyProduct, requestAll, requestAllShopifyProducts, getDifferencebyTitle, pushAlleBayProductsToShopify} = require("../models/products.js")(io);
  const {checkAuthError,getStores,getRoomName, getEbayFromShopify} = require("../controller/utility.js");
  const AppError = require("../models/error.js");
  const {Progress} = require('./socket')(io);
  const {WebHook, Agent, manager, TRANS_TYPE} = require('../models/manager')(io);
  var router = require('express').Router();

  var sessionAuth = function(req, res, next) {
    if (req.session.id) {
      checkSession(req)
      .then((result) => {
        if (result.ebay && result.shopify) {
          req.query.ebayId = result.ebay;
          req.query.shopifyId = result.shopify;
          let roomName = getRoomName({shopifyId: req.query.shopifyId, ebayId: req.query.ebayId});
          req.query.progress =  new Progress(roomName);
          req.agent = new Agent(result.ebay, result.shopify, req.query.progress);
          next();
        } else {
          res.redirect('/?from_call_back=true');
        }
      })
    } else {
      res.redirect('/');
    }
  };

  router.get('/mystores', sessionAuth, (req, res, next) => {
    getStores(req).then((data) => {
      console.log(data);
      res.status(200).send(data);
    })
  })

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
    getAllActiveEbaySellings(req)
    .then((data) => {
      console.log('done');
    }).catch((err) => {
      console.log(err);
    })
  });

  router.get('/requestShopify', sessionAuth, (req, res, next) => {
    res.status(200).send('acquiring info from shopify');
    requestAllShopifyProducts(req)
    .then((data) => {
      console.log('done');
    }).catch((err) => {
      console.log(err);
    })
  })

  router.get('/requestAll', sessionAuth, (req, res, next) => {
    res.status(200).send('acquiring info from ebay and shopify');
    requestAll(req)
    .then((data) => {
      console.log('done');
    }).catch((err) => {
      console.log(err);
    })
  })

  router.get('/getDifferencebyTitle', sessionAuth, (req, res, next) => {
    getDifferencebyTitle(req)
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
    pushAlleBayProductsToShopify(req);
  })



  /**
  * user starts synchronize between two stores,
  * 1. perform synchronization with ebayClient and ShopifyClient
  * 2. could render a progress interface
  **/
  router.get('/startSynchonize', sessionAuth, (req, res, next) => {
    res.status(200).send('acquiring info from ebay and shopify');
    if (req.query.debug) return;
    req.query.all = true;
    req.query.ifsave = true;
    req.query.csv = true;
    console.log("===================requesting info from eBay and Shopify======================");
    requestAll(req)
    .then((data) => {
      console.log("=======synching eBay producsts to Shopify, skipping existing shopify products=========");
      return pushAlleBayProductsToShopify(req)
    }).catch((err) => {
      console.log(err);
    }).then((response) => {
      req.query.progress.incr(25, `Upload complete!`);
      console.log("===================synchronization complete======================");
    })
  })

  router.get('/whatsmyebay', sessionAuth, (req, res, next) => {
    console.log(req.query.shopifyId);
    getEbayFromShopify(req.query.shopifyId)
    .then((results) => {
      res.send(results);
    })

  })

  /**
  * return auto-update status
  **/
  router.get('/autoUpdateStatus', sessionAuth, (req, res, next) => {
    req.agent.getRegistry()
    .then((registry) => {
      console.log('registry', registry)
      res.send(registry);
    })
  })

  /**
  * user indicates auto updated
  * 1. register shopify webhooks
  * 2. schedule one cronjob
  **/
  router.get('/startAutoUpdate', sessionAuth, (req, res, next) => {
    let whkevents = req.query.whkevents.split(',');
    let crjtypes = req.query.crjtypes.split(',');
    let increment = 100 / (whkevents.length + crjtypes.length);
    console.log('whkevents', whkevents);
    console.log('crjtypes', crjtypes);
    try {
      whkevents.forEach((event) => {
        req.agent.register(event)
        .then((msg) => {
          req.query.progress.incr(increment, msg);
        })
      });
      crjtypes.forEach((type) => {
        req.agent.register(type)
        .then((msg) => {
          req.query.progress.incr(increment, msg);
        })
      });
      res.status(200).send('register success');
    } catch(err) {
      // console.log(err.body);
      res.status(400).send('failing to register event');
    }
  })

  /**
  * user cancles auto update
  * 1. cancel shopify webhook
  * 2. cancel cronjob
  **/
  router.get('/cancelAutoUpdate', sessionAuth, (req, res, next) => {
    try {
      req.agent.cancelAll(req.query.progress)
      .then((msg) => {
        res.status(200).send('cancel success');
      })
    } catch(err) {
      console.log('failing to cancel auto update ', err);
      res.status(200).send('failing to cancel auto update ' + JSON.stringify(err));
    }

  })

  /**
   * webhook callback
   **/
  router.post('/webhook/callback/:shopifyID/:ebayID', WebHook.callback);

  /**
   * cronjob status
   **/
  router.get('/cronjobs', (req, res, next) => {
    
  })


  return router;

}

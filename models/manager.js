"use strict";
const _ = require('lodash');
const Promise = require('bluebird');
const Cron = require('cron').CronJob;
const parserp = require('xml2js-es6-promise');
const builder = require('xmlbuilder');
const {eBayClient, ShopifyClient} = require('../controller/client');
const {winston, redisClient} = require("../globals");
const {checkSession, getRoomName} = require('../controller/utility');
const {Progress} = require('../controller/socket');
const {getKeys, findCorrespondingID} = require('./utility');
const TRANS_TYPE = {
  'shopify_webhook_product_update': 'products/update',
  'shopify_webhook_product_delete': 'products/delete',
  'ebay_cronjob_sync_delete': 'sync&delete',
  'ebay_cronjob_sync':'sync'
};
const defaultTime = '00 59 23 * * *'; // every night at 11:59:00 p.m.
const defaultTTT = 4; // time to try ebay api

module.exports = function(io) {
  const {getAlleBayProducts, getShopifyProducts, getActiveEbaySellings, getAllActiveEbaySellings, postShopifyProduct, requestAll, requestAllShopifyProducts, getDifferencebyTitle, pushAlleBayProductsToShopify} = require("./products.js")(io);
  const {Progress} = require('../controller/socket')(io);

  class Manager {
    constructor() {
      this.cronjobs = [];
    }

    startAllCrons() {

    }

    /* start a new cronjob */
    addCronjob(cronjob) {
      console.log(`test3`);
      let job = new Cron({
        cronTime: cronjob.time,
        onTick: cronjob.callback,
        start: false,
        timeZone: cronjob.timeZone
      });
      cronjob.job = job;
      cronjob.index = this.cronjobs.length;
      this.cronjobs.push(cronjob);
      return redisClient.setAsync(`cronjob:${cronjob.ebayID}:${cronjob.shopifyID}:${cronjob.type}`, `${cronjob.time}-${cronjob.timeZone}`).then((res) => {
        cronjob.job.start();
        console.log(`cronjob ${cronjob.type} for ${cronjob.ebayID} and ${cronjob.shopifyID} started`)
        return `cronjob ${cronjob.type} for ${cronjob.ebayID} and ${cronjob.shopifyID} started`;
      })
    }
    /* cancel a cronjob that has the same ebayID, shopifyID, type, time, timeZone */
    cancelCronjob(cronjob) {
      let attrs = ['ebayID', 'shopifyID', 'type', 'time', 'timeZone'];
      let helperComp = (a, b) => {
        for (let i = 0; i < attrs.length; i++) {
          if (a[attrs[i]] != b[attrs[i]]) return false;
        }
        return true;
      };
      let matchedJobs = this.cronjobs.filter((managedCron) => {
        return helperComp(cronjob, managedCron);
      });
      let promises = matchedJobs.map((matchedJob) => {
        return redisClient.delAsync(`cronjob:${matchedJob.ebayID}:${matchedJob.shopifyID}:${matchedJob.type}`).then((res) => {
          matchedJob.job.stop();
          return `cronjob ${matchedJob.type} for ${matchedJob.ebayID} and ${matchedJob.shopifyID} cancelled`;
        })
      });
      return Promise.all(promises)
      .then((msg) => {
        for (let j = this.cronjobs.length - 1; j >= 0; j--) {
          if (helperComp(this.cronjobs[j], cronjob)) this.cronjobs.splice(j, 1);
        }
        return `cronjobs cancelled`;
      })
    }

  }
  /* This singleton class manages all users */
  const manager = new Manager();

  /* A transaction could be either a webhook or a cronjob */
  class Transaction {
    constructor(ebayID, shopifyID) {
      this.ebayID = ebayID;
      this.shopifyID = shopifyID;
    }
  }

  class WebHook extends Transaction {
    constructor(ebayID, shopifyID, event) {
      super(ebayID, shopifyID);
      this.event = event;
      if (_.findKey(TRANS_TYPE, (o)=> {return o == event}) == undefined) {
        throw new Error("unsupported event: " + event);
      }
    }

    register() {
      let client = new ShopifyClient(this.shopifyID);
      let data = {
    		"webhook": {
    			"topic": this.event.replace(/\//g, '/'),
    			"address": `https:\/\/${process.env.HOSTNAME}\/api\/webhook\/callback\/${this.shopifyID}\/${this.ebayID}`,
    			"format": "json"
    		}
    	};
      console.log('data', data);
      return client.post('admin/webhooks.json', '', data)
        .then((result) => {
          return `webhook ${this.event} for ${this.shopifyID} and ${this.ebayID} registered`;
        })
    }

    /* cancel certain type of webhook, does nothing if not exist */
    cancle() {
      let client = new ShopifyClient(this.shopifyID);
      let nums = 0;
      return client.get('admin/webhooks.json')
      .then((body) => {
        return JSON.parse(body);
      }).then((body) => {
        let whks = body.webhooks.filter((webhook) => {
          return (webhook.topic == this.event && webhook.address.includes(process.env.HOSTNAME));
        })
        return whks.map((whk) => {return whk.id});
      }).then((ids) => {
        nums = ids.length;
        return Promise.all(ids.map((id)=>{
          return client.delete(`admin/webhooks/${id}.json`)
        }));
      }).then(() => {
        return `${nums} webhooks deleted`;
      })
    }

    static ebay_modItem(ebayID, itemID, ttt, config) {
      if (ttt == 0) {
        console.error(`ebay_modItem:${config.type} No more time to try on item ${itemID}`);
        return new Promise((resolve, reject) => {
          resolve(`ebay_modItem:${config.type} failed, no more time to try on item ${itemID}`);
        })
      }
      let xmlbody;
      switch(config.type) {
        case 'endItem':
          xmlbody = {
      			'EndItemRequest' : {
      				'@xmlns':  "urn:ebay:apis:eBLBaseComponents",
      				'ErrorLanguage' : 'en_US',
      				'WarningLevel' : 'High',
      				'ItemID' : itemID,
      				'EndingReason' : 'NotAvailable'
      			}
      		};
          break;
        case 'ReviseItem':
          xmlbody = {
            'ReviseItemRequest':{
              '@xmlns':  "urn:ebay:apis:eBLBaseComponents",
              'ErrorLanguage' : 'en_US',
              'WarningLevel' : 'High',
              'item' :{
                'ItemID': itemID,
                'Quantity': config.quantity
              }
            }
          };
          break;
      }
      let xml = builder.create(xmlbody,{encoding: 'utf-8'});
  		let str = xml.end({pretty:true});
      let client = new eBayClient(ebayID,'SOAP');
      return client.post(config.type, str)
      .then((result) => {
        return parserp(result)
      }).then((resdata) => {
        console.log('resdata', JSON.stringify(resdata));
        if(resdata[config.type + 'Response'].Ack[0]=="Success" || resdata[config.type + 'Response'].Ack[0]=="Warning"){
          return `eBay item ${itemID} ${config.type} success`;
        } else {
          console.log(`eBay item ${itemID} ${config.type} failed, retrying...`);
          return WebHook.ebay_modItem(ebayID, itemID, ttt - 1, config);
        }
      })
    }


    static callback(req, res, next) {
      try {
        if (req.get('x-kotn-webhook-verified') == '200') {
          res.status(200).send('ok');
          let roomName = getRoomName({shopifyId: req.params.shopifyID, ebayId: req.params.ebayID});
          console.log(`roomName`, roomName);
          let progress = new Progress(roomName);
          console.log('webhook received');
          progress.incr(25, 'webhookEvent: received');
          console.log('1');
          let shopifyclient = new ShopifyClient(req.params.shopifyID);
          let ebayclient = new eBayClient(req.params.ebayID);
          let ShopifyProductID = req.body.id.toString();
          let config = {};
          console.log('2');
          let ebayProductIDpromise = new Promise((resolve, reject) => {
            console.log('3.6', req.get('X-Shopify-Topic'))
            if (req.get('X-Shopify-Topic') == 'products/delete') {
              console.log('3');
              config.type = 'endItem';
              progress.incr(25, `webhookEvent: deleting product ${ShopifyProductID}`);
              return findCorrespondingID('shopify', req.params.shopifyID, 'ebay', req.params.ebayID, ShopifyProductID).then((id) => {
                console.log('5');
                resolve(id);
              });
            } else if (req.get('X-Shopify-Topic') == 'products/update') {
              console.log('4');
              config.type = 'ReviseItem';
              if (typeof req.body.variants[0].inventory_quantity != 'number') {
                throw "wrong data type for inventory_quantity"
              }
              config.quantity = req.body.variants[0].inventory_quantity;
              progress.incr(25, `webhookEvent: updating product ${ShopifyProductID}`);
              // console.log('body is', req.body);
              console.log('tag is ', req.body.tags);
              resolve(req.body.tags);
            }
          })
          console.log('3.5')
          ebayProductIDpromise.then((ebayProductID) => {
            return WebHook.ebay_modItem(req.params.ebayID, ebayProductID, defaultTTT, config);
            // return 'ok';
          }).then(() => {
            console.log('7');
            progress.incr(50, `webhookEvent: webhook process completed`);
          })
        } else {
          res.status(400).send('unverified');
          console.error('webhook not verified\nrawBody:', req.rawBody, '\nx-shopify-hmac-sha256:', req.get('x-shopify-hmac-sha256'));
        }
      } catch(err) {
        console.error('error occured in callback', err);
      }
    }
  }

  class CronJob extends Transaction {
    constructor(ebayID, shopifyID, type, time, timeZone) {
      super(ebayID, shopifyID);
      this.type = type;
      this.time = time || defaultTime;
      this.timeZone = timeZone || 'America/Los_Angeles';
      if (_.findKey(TRANS_TYPE, (o)=> {return o == type}) == undefined) {
        throw new Error("unsupported type: " + type);
      }
    }

    register() {
      console.log("regitsering myself", this);
      return manager.addCronjob(this);
    }

    cancel() {
      return manager.cancelCronjob(this);
    }

    callback() {

    }
  }

  class Agent {
    constructor(ebayID, shopifyID, progress) {
      this.ebayID = ebayID;
      this.shopifyID = shopifyID;
      this.progress = progress;
    }

    register(transaction) {
      switch(transaction) {
        case TRANS_TYPE.shopify_webhook_product_update:
        case TRANS_TYPE.shopify_webhook_product_delete:
          let wh = new WebHook(this.ebayID, this.shopifyID, transaction);
          return wh.register();
        case TRANS_TYPE.ebay_cronjob_sync:
        case TRANS_TYPE.ebay_cronjob_sync_delete:
          let cron = new CronJob(this.ebayID, this.shopifyID, transaction);
          return cron.register();
      }
    }

    cancel(transaction) {
      switch(transaction) {
        case TRANS_TYPE.shopify_webhook_product_update:
        case TRANS_TYPE.shopify_webhook_product_delete:
          let wh = new WebHook(this.ebayID, this.shopifyID, transaction);
          return wh.cancle();
        case TRANS_TYPE.ebay_cronjob_sync:
        case TRANS_TYPE.ebay_cronjob_sync_delete:
          let cron = new CronJob(this.ebayID, this.shopifyID, transaction);
          return cron.cancel();
      }
    }

    getWebhooks() {
      let client = new ShopifyClient(this.shopifyID);
      return client.get('admin/webhooks.json')
      .then((body) => {
        return JSON.parse(body);
      })
      .then((body) => {
        console.log('webhooks ', body.webhooks);
        let whks = body.webhooks.filter((webhook) => {
          return ((_.findKey(TRANS_TYPE, (o)=> {return o == webhook.topic}) != undefined)  && webhook.address.includes(process.env.HOSTNAME));
        });
        return whks.map((whk) => {return whk.topic});
      });
    }

    getCronjobs() {
      return getKeys(`cronjob:${this.ebayID}:${this.shopifyID}:*`)
      .then((keys) => {
        return keys.map((key) => {return key.replace(/^.*:([^:]*)/g, '$1')});
      })
    }

    getRegistry() {
      // get webhook registry
      // get cronjob registry
      return Promise.join(this.getWebhooks(), this.getCronjobs(), (events, types) => {
        console.log('events', events);
        console.log('types', types);
        return {
          webhookEvents: events,
          cronjobTypes: types
        }
      })
    }

    cancelAll(progress) {
      return this.getRegistry()
      .then((res) => {
        let increment = 100 / (res.webhookEvents.length + res.cronjobTypes.length);
        let cancelWebhooks = res.webhookEvents.map((event) => {
          this.cancel(event)
          .then((msg) => {progress.incr(increment, msg)});
        })
        let cancelCronjobs = res.cronjobTypes.map((type) => {
          this.cancel(type)
          .then((msg) => {progress.incr(increment, msg)});
        })
        return Promise.all(cancelWebhooks.concat(cancelCronjobs));
      })
    }
  }
  manager.startAllCrons();

  return {WebHook, CronJob, Agent, manager, TRANS_TYPE};
}

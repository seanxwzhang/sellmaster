"use strict";
const _ = require('lodash');
const {winston, redisClient} = require("../globals.js");
module.exports.getProductName = (channel, storeid, itemID) => {
  return `products:${channel}:${storeid}:${itemID}`;
}

module.exports.getMappingKey = (baseChannel, basestore, targetChannel, targetstore, baseID) => {
  return `mappings:${baseChannel}:${basestore}:${targetChannel}:${targetstore}:${baseID}`;
}

module.exports.escapeTitle = (title) => {
  return title.replace(/:/g, ';;');
}

module.exports.getTitleIndexName = (channel, storeid) => {
  return `index:title:${channel}:${storeid}`;
}

module.exports.findCorrespondingID = (baseChannel, basestore, targetChannel, targetstore, baseID) => {
  return redisClient.getAsync(exports.getMappingKey(baseChannel, basestore, targetChannel, targetstore, baseID))
    .then((result) => {
      if (result) {
        return result;
      } else { // if no direct id mapping, find mapping by title
        return redisClient.getAsync(exports.getProductName(baseChannel, basestore, baseID))
        .then((productstr) => {
          var product = JSON.parse(productstr);
          if (baseChannel == 'shopify') {
            var title = exports.escapeTitle(product.title);
          } else if (baseChannel == 'ebay') {
            // console.log(product);
            var titkle = exports.escapeTitle(product.Title[0]);
          } else {
            var title = '';
          }
          return redisClient.zrangebylexAsync(exports.getTitleIndexName(baseChannel, basestore), `[${title}`, `[${title}`);
        }).then((results) => {
          if (results && results.length) {
            if (results.length > 1) {console.log(`WARNING: duplicate title on ${results[0].split(':')[0]}`);}
            return results[0].split(':')[1];
          } else {
            return null;
          }
        })
      }
    })
}

module.exports.getKeys = function(pattern, limit) {
  return new Promise((resolve, reject) => {
    let cursor = '0';
    let results = new Set();
    let count = limit || 10000;
    let wrapper = () => {
      return redisClient.scanAsync(cursor, 'MATCH', pattern, 'COUNT', count.toString())
        .then((reply) => {
          cursor = reply[0];
          let keys = reply[1];
          keys.forEach(function(key,i){
              results.add(key);
          });
          if (cursor == '0' || limit) {
            console.log(`Got ${results.size} keys`);
            resolve(Array.from(results));
          } else {
            return wrapper();
          }
        }).catch((err) => {
          console.log("Error happend during acquiring keys: ", err);
          reject(err);
        })
    }
    wrapper();
  }).then((keys) => {
    return _.flattenDeep(keys);
  })
}
// exports.findCorrespondingID("ebay", "shopify", "123")
// .then((res) => {console.log(res == null)});

"use strict";

const {winston, redisClient} = require("../globals.js");
module.exports.getProductName = (channel, storeid, itemID) => {
  return `products:${channel}:${storeid}:${itemID}`;
}

module.exports.getMappingKey = (baseChannel, targetChannel, baseID) => {
  return `mappings:${baseChannel}:${targetChannel}:${baseID}`;
}

module.exports.findCorrespondingID = (baseChannel, targetChannel, baseID) => {
  return redisClient.getAsync(exports.getMappingKey(baseChannel, targetChannel, baseID));
}

module.exports.escapeTitle = (title) => {
  return title.replace(/:/g, ';;');
}

module.exports.getTitleIndexName = (channel, storeid) => {
  return `index:title:${channel}:${storeid}`;
}

// exports.findCorrespondingID("ebay", "shopify", "123")
// .then((res) => {console.log(res == null)});

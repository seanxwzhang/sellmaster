"use strict";

const {winston, redisClient} = require("../globals.js");
module.exports.getProductName = (channel, ebayid, itemID) => {
  return `products:${channel}:${ebayid}:${itemID}`;
}

module.exports.getMappingKey = (baseChannel, targetChannel, baseID) => {
  return `mappings:${baseChannel}:${targetChannel}:${baseID}`;
}

module.exports.findCorrespondingID = (baseChannel, targetChannel, baseID) => {
  return redisClient.getAsync(exports.getMappingKey(baseChannel, targetChannel, baseID));
}

// exports.findCorrespondingID("ebay", "shopify", "123")
// .then((res) => {console.log(res == null)});

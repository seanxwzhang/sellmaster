module.exports.getProductName = (channel, ebayid, itemID) => {
  return `products:${channel}:${ebayid}:${itemID}`;
}

module.exports.getMappingKey = (baseChannel, targetChannel, baseID) => {
  return `mappings:${baseChannel}:${targetChannel}:${baseID}`;
}

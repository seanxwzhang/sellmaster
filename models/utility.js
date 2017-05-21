export function getProductName({channel, ebayid, itemID}) {
  return `products:${channel}:${ebayid}:${itemID}`;
}

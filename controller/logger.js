var request = require('request');
var winston = require('winston');
require('winston-loggly-bulk');




 winston.add(winston.transports.Loggly, {
    token: "54942095-7161-4f8c-a199-229c540f6343",
    subdomain: "liuchang2872",
    tags: ["Winston-NodeJS"],
    json:true
});


//need to call LogOperation whenever the program wants to modify the commodity list
// logging format :
// Dont need time, loggly has its own timestamp
// example:
          //var log_data = 
          // {
          //     eBayUserName: 'testuser_shuangzhang',
          //     shopifyUserName: 'sellmaster3',
          //     operation: 'change_quantity',
          //     itemid: itemid,
          //     store: 'eBay',
          //     new_quantity: 8
          // };

// example call:        
// LogOperation("Item with id " +itemid + "has been ended in eBay store", log_data);
var LogOperation = function(logMessage, logData){
  winston.log('info', logMessage, logData);
}

// need to call this function whenever we get notification from eBay or shopify
// logmessage can be "get notification from eaby"
var LogOperation_nodata = function(logMessage) {
   winston.log('info', logMessage, logData);
}

// in the current version of the program, the only place that we need to call LogOperation is 
//ebay_changeQuantity
//shopify_changeQuantity
//shopify_endItem
//ebay_endItem

// in the current version of the program, the only place that we need to call LogOperation_nodata is 
// /testShopifyWebhook
// /testeBayWebhook


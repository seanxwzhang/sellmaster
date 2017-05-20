var request = require('request');
var winston = require('winston');
require('winston-loggly-bulk');

// logging format :
// Dont need time, loggly has its own timestamp
var data =
{
  eBayUserName: 'abc',
  shopifyUserName: 'def',
  operation: 'post',
  itemName: 'Mac book',
  store: 'eBay'
};



 winston.add(winston.transports.Loggly, {
    token: "54942095-7161-4f8c-a199-229c540f6343",
    subdomain: "liuchang2872",
    tags: ["Winston-NodeJS"],
    json:true
});

winston.log('info',"Message Here!", data);


var LogOperation = function(logMessage, logData){
  winston.log('info', logMessage, logData);
}

https://account.loggly.com/apiv2/search?q=json.responseTime:"288" tag:apache json.treatment.order:"up" NOT json.location.pathname:*&from=2013-10-17T21%3A24%3A18.007Z&until=2013-10-18T21%3A24%3A18.007Z

var requestData =  request.get("https://liuchang2872.loggly.com/apiv2/search?q=json.responseTime:\"288\" json.treatment.order:\"up\" NOT json.location.pathname:* json.context.terms:\"rock n roll\"&from=-1d&until=now").auth('liuchang2872', 'ABC123!!!', false);
console.log("data is: ", requestData);
module.exports.LogOperation = LogOperation;

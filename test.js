var querystring = require('querystring');
var http = require('http');
const builder = require('xmlbuilder');
var formdata = builder.create('GetUserProfileRequest',{'xmlns': 'urn:ebay:apis:eBLBaseComponents'}).dec('1.0', 'UTF-8').ele('UserID', 'safaricycle').end({ pretty: true});;
var data = JSON.stringify({formdata});

var options = {
    host: 'http://open.api.ebay.com"',
    port: 80,
    path: '/shopping',
    method: 'POST',
    headers: {
        "X-EBAY-API-APP-ID": "XiaowenZ-xiaowent-PRD-769e0185b-9a335295",
        "X-EBAY-API-SITE-ID": 0,
        "X-EBAY-API-CALL-NAME": "GetUserProfile",
        "X-EBAY-API-VERSION": 824,
        "X-EBAY-API-REQUEST-ENCODING": "xml",
        "Content-Type": "application/xml",
        'Content-Length': Buffer.byteLength(formdata)
    }
};

var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log("body: " + chunk);
    });
});

req.write(formdata);
req.end();

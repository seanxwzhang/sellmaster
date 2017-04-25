"use strict";

var winston = require('winston');
require('winston-loggly-bulk');

winston.add(winston.transports.Loggly, {
   token: "518f1827-da82-41c2-b3f7-afe953817d74",
   subdomain: "sellmaster",
   tags: ["Winston-NodeJS"],
   json:true
});

module.exports = {winston};

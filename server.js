"use strict";

// dot env for environment variables
require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require("express");
const bluebird = require("bluebird");
const exphbs  = require('express-handlebars');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const {winston, redisClient} = require("./globals.js");
const favicon = require('serve-favicon');

if (process.env.NODE_ENV == 'prod') {
    var ca_bundle = fs.readFileSync('sslcert/ca_bundle.crt', 'utf8');
    var privateKey  = fs.readFileSync('sslcert/private.key', 'utf8');
    var certificate = fs.readFileSync('sslcert/certificate.crt', 'utf8');
    var credentials = {ca: ca_bundle, key: privateKey, cert: certificate};
} else {
    var privateKey  = fs.readFileSync('sslcert/localhost.key', 'utf8');
    var certificate = fs.readFileSync('sslcert/localhost.crt', 'utf8');
    var credentials = {key: privateKey, cert: certificate};
}



var app = express();
// serve favicon
app.use(favicon(__dirname + '/public/favicon.ico'));
// add body parser middle ware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
// set view engine
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
// use morgan for logging
app.use(morgan('short'));
// set static serving
app.use(express.static('public'));
// delegate routing to routes.js
app.use('/', require('./routes.js'));

// define error handler
app.use((err, req, res, next) => {
    console.log(err);
    res.status(err.status || 500);
    res.send({
        "msg": "Server error",
        "data": err
    });
    if (process.env.NODE_ENV == 'env') {
        console.log(err);
    }
})

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(process.env.UNSECURE_PORT);
httpsServer.listen(process.env.SECURE_PORT);
console.log(`Express started at port:${process.env.UNSECURE_PORT}`);
console.log(`Express started at port:${process.env.SECURE_PORT}`);
module.exports = {app};

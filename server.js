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
const compression = require('compression');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);


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
// use session middleware
app.use(session({
    store: new RedisStore({
        host: process.env.REDIS_HOSTNAME,
        port: process.env.REDIS_PORT,
        pass: process.env.REDIS_PASS
    }),
    secret: process.env.SESSION_SECRET,
    name: 'sellmaster.sid',
    resave: true,
    saveUninitialized: true
}));
// serve favicon
app.use(favicon(__dirname + '/public/favicon.ico'));
// compression
app.use(compression());
// add body parser middle ware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
// set view engine
var hbs = exphbs.create({
    defaultLayout: 'main',
    helpers: {
        linkhref: function(source) {
            return '<link rel="stylesheet" href="' + source + '" type="text/css">';
        },
        ifCond: function (v1, operator, v2, options) {
            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '!==':
                    return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&':
                    return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||':
                    return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        }
    }
})
app.engine('handlebars', hbs.engine);
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

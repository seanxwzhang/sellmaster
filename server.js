"use strict";

// dot env for environment variables
require('dotenv').config();

const express = require("express");
const bluebird = require("bluebird");
const exphbs  = require('express-handlebars');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const {winston, redisClient} = require("./globals.js");
const favicon = require('serve-favicon');

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
    res.status(err.status || 500);
    res.send({
        "msg": "Server error",
        "data": err
    });
    if (process.env.NODE_ENV == 'env') {
        console.log(err);
    }
})

app.listen(process.env.PORT);
console.log(`Express started at port:${process.env.PORT}`);
module.exports = {app};

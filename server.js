"use strict";

const express = require("express");
const bluebird = require("bluebird");
const {winston} = require("./globals.js");
const exphbs  = require('express-handlebars');
const morgan = require('morgan');
const bodyParser = require('body-parser');

var app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

require('dotenv').config();


app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(morgan('combined'))

app.use(express.static('public'));
app.get('/', function (req, res) {
    res.render('home');
});

app.listen(3000);
console.log("Express started at port:3000");
module.exports = {app};

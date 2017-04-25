"use strict";

const express = require("express");
const {winston} = require("./globals.js");
const exphbs  = require('express-handlebars');
const morgan = require('morgan');
var app = express();


app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(morgan('combined'))

app.get('/', function (req, res) {
    res.render('home');
});

app.listen(3000);

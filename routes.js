"use strict";
const router = require('express').Router();
const {winston} = require("./globals.js");
const generateCookie = require("./controller/utility.js").generateCookie;
const crypto = require('crypto');


// home controller
router.get('/', (req, res, next) => {
    res.render('home',{
        styles: ["css/bootstrap-material-design.min.css", "css/ripples.min.css", "css/home.css"],
        js: ["js/material.min.js","js/home.js"]
    });
});

router.use('/auth', require('./controller/auth.js'));

router.use('/dashboard', require('./controller/dashboard.js'));

router.use('/webhook', require('./controller/webhooks.js'));

module.exports = router;

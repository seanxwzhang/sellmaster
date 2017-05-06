"use strict";
const router = require('express').Router();
const {winston} = require("./globals.js");

// home controller
router.get('/', (req, res, next) => {
    res.render('home',{
        style: "css/home.css",
        js: "js/home.js"
    });
})

router.use('/auth', require('./controller/auth.js'));

router.use('/dashboard', require('./controller/dashboard.js'));

router.use('/webhook', require('./controller/webhooks.js'));

module.exports = router;

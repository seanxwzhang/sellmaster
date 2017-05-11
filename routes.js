"use strict";
const router = require('express').Router();
const {winston} = require("./globals.js");
const checkSession = require("./controller/utility.js").checkSession;

// home controller
router.get('/', (req, res, next) => {
    if (req.query.from_call_back) {
        checkSession(req)
        .then((result) => {
            var message = `Now, please login to your `;
            var messageStyle = "success";
            if (!result['shopify'] && result['ebay']) {
                message += "shopify account";
            } else if (result['shopify'] && !result['ebay']) {
                message += "ebay account";
            } else if (!result['shopify'] && !result['ebay']){
                message += "shopify and ebay account";
            } else {
                message = "You are good to go!";
            }
            console.log(message);
            res.render('home',{
                styles: ["css/bootstrap-material-design.min.css", "css/ripples.min.css", "css/home.css"],
                js: ["js/material.min.js","js/home.js"],
                message: message,
                messageStyle: messageStyle
            });
        })
    } else {
        checkSession(req)
        .then((result) => {
            if (result.ebay && result.shopify) {
                res.render('home',{
                    styles: ["css/bootstrap-material-design.min.css", "css/ripples.min.css", "css/home.css"],
                    js: ["js/material.min.js","js/home.js"],
                    message: "Welcome back!",
                    messageStyle: "success",
                    topbar: {
                        text: "<a href='/dashboard'>Go to My Dashboard</a>"
                    }
                });
            } else {
                res.render('home',{
                    styles: ["css/bootstrap-material-design.min.css", "css/ripples.min.css", "css/home.css"],
                    js: ["js/material.min.js","js/home.js"]
                });
            }
        })

    }


});

router.use('/auth', require('./controller/auth.js'));

router.use('/dashboard', require('./controller/dashboard.js'));

router.use('/webhook', require('./controller/webhooks.js'));

module.exports = router;

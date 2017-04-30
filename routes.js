"use strict";
const router = require('express').Router();
const {winston} = require("./globals.js");

// home controller
router.get('/', (req, res, next) => {
    res.render('home',{
        style: "css/home.css"
    });
})

router.use('/auth', require('./controller/auth.js'));



module.exports = router;

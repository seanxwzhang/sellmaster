"use strict";
module.exports = function(io) {
  const router = require('express').Router();
  const fs = require('fs');
  const {winston} = require("./globals.js");
  const checkSession = require("./controller/utility.js").checkSession;
  var encoding = 'utf8';
  var storeDir = __dirname + '/store/';

  if (!fs.existsSync(storeDir)){
    console.log("could not find store directory at %s", storeDir);
    process.exit(1);
  }


  // home controller
  router.get('/', (req, res, next) => {
    if (req.query.from_call_back) {
      checkSession(req)
      .then((result) => {
        var message = `Please login to your `;
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
        res.render('home',{
          styles: ["css/bootstrap-material-design.min.css", "css/ripples.min.css", "css/home.css"],
          js: ["js/material.min.js","js/home.js"],
          message: message,
          messageStyle: messageStyle,
          shopifyLogin: !result.shopify,
          eBayLogin: !result.ebay,
          authenticated: result.shopify && result.ebay,
          hosturl: process.env.HOSTNAME
        });
      })
    } else {
      checkSession(req)
      .then((result) => {
        if (result.ebay || result.shopify) {
          res.render('home',{
            styles: ["css/bootstrap-material-design.min.css", "css/ripples.min.css", "css/home.css"],
            js: ["js/material.min.js","js/home.js"],
            message: "Welcome back!",
            messageStyle: "success",
            shopifyLogin: !result.shopify,
            eBayLogin: !result.ebay,
            authenticated: result.shopify && result.ebay,
            hosturl: process.env.HOSTNAME
          });
        } else {
          res.render('home',{
            styles: ["css/bootstrap-material-design.min.css", "css/ripples.min.css", "css/home.css"],
            js: ["js/material.min.js","js/home.js"],
            shopifyLogin: true,
            eBayLogin: true,
            hosturl: process.env.HOSTNAME
          });
        }
      })
    }
  });

  router.use('/auth', require('./controller/auth.js'));

  router.get('/v1/store', function(req, res, next){
    fs.readdir(storeDir, function(err, files){
      if (err) {
        return next(err);
      }
      var boards = [];
      files.forEach(function(file){
        var json = JSON.parse(fs.readFileSync(storeDir + file, encoding));
        boards.push({
          id: file.replace('.json', ''),
          title: json.title
        });
      });
      // send response
      res.json({
        dashboards: boards
      });
    });
  });

  router.get('/v1/store/:id', function(req, res, next){
    fs.readFile(storeDir + req.params.id + '.json', encoding, function(err, data){
      if (err) {
        return next(err);
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(data);
    });
  });

  router.post('/v1/store/:id', function(req, res, next){
    fs.writeFile(
      storeDir + req.params.id + '.json',
      JSON.stringify(req.body, undefined, 2),
      function(err){
        if (err) {
          return next(err);
        }
        res.status(204).end();
      }
    );
  });

  router.delete('/v1/store/:id', function(req, res, next){
    fs.unlink(storeDir + req.params.id + '.json', function(err){
      if (err) {
        return next(err);
      }
      res.status(204).end();
    });
  });

  router.use('/api', require('./controller/api.js')(io));

  router.use('/webhook', require('./controller/webhooks.js')(io));

  router.get('/.well-known/acme-challenge/g7PsNOh399BvgojzsXaU7GSVKNFZLy2Aw5-Mog9vZfo', (req, res, next) => {
    res.status(200).send('g7PsNOh399BvgojzsXaU7GSVKNFZLy2Aw5-Mog9vZfo.aG_WKQxfcOcFeU1OhVj_1uyPFASnclI63p5z50hIOS4');
  })
  return router;
}

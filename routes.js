"use strict";
const router = require('express').Router();
const fs = require('fs');
const {winston} = require("./globals.js");

var encoding = 'utf8';
var storeDir = __dirname + '/store/';

if (!fs.existsSync(storeDir)){
  console.log("could not find store directory at %s", storeDir);
  process.exit(1);
}


// home controller
router.get('/', (req, res, next) => {
    res.render('home',{
        style: "css/home.css",
        js: "js/home.js"
    });
})

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

module.exports = router;

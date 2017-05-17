"use strict";

const Promise = require("bluebird");
const rp = require('request-promise');
const request = require('request');
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("../controller/client.js");
const getTokenBySession = require("../controller/utility.js").getTokenBySession;
const getIdBySession = require("../controller/utility.js").getIdBySession;
const removeTokenIdBySession = require("../controller/utility.js").removeTokenIdBySession;
const checkAuthError = require("../controller/utility.js").checkAuthError;
const AppError = require("../models/error.js");
const moment = require('moment');
const builder = require('xmlbuilder');
const parser = require('xml2js');
const maximum_gap_days = 119;

var xmlbdyGenerator = function(request, epp, pn) {
  switch(request) {
    case 'GetMyeBaySellingRequest':
    return  {
      'GetMyeBaySellingRequest':{
        '@xmlns':  'urn:ebay:apis:eBLBaseComponents',
        'ActiveList' :{
          'Include': true,
          'IncludeNotes': true,
          'Pagination' :{
            'EntriesPerPage' : epp,
            'PageNumber' : pn
          }
        },
        'ErrorLanguage' : 'en_US',
        'WarningLevel' : 'High',
        'DetailLevel': 'ReturnAll',
      }
    };
    case 'GetSellerListRequest':
    var startTime = moment().subtract(maximum_gap_days, 'days');
    return {
      'GetSellerListRequest':{
        '@xmlns':  'urn:ebay:apis:eBLBaseComponents',
        'ErrorLanguage' : 'en_US',
        'WarningLevel' : 'High',
        'GranularityLevel' : 'Fine',
        'StartTimeFrom' : startTime.format('YYYY-MM-DDTHH:mm:ss.SSS'),
        'StartTimeTo' : moment().format('YYYY-MM-DDTHH:mm:ss.SSS'),
        'IncludeWatchCount' : true,
        'Pagination' :{
          'PageNumber': pn,
          'EntriesPerPage' : epp
        }
      }
    };
    default:
    return {};
  }

}

module.exports.getAlleBayProducts = function(req) {
  return Promise.join(getTokenBySession("ebay", req.session.id), getIdBySession("ebay", req.session.id), (token, id) => {
    var ebayclient = new eBayClient(id, 'SOAP');
    var requestBody = xmlbdyGenerator('GetSellerListRequest', 200, 1);
    var xml = builder.create(requestBody, {encoding: 'utf-8'});
    var str = xml.end({pretty:true, indent: ' ', newline: '\n'});
    console.log(str);
    return ebayclient.post('GetSellerList', str)
    .then((result) => {
      // console.log(result);
      return new Promise((resolve, reject) => {
        parser.parseString(result, (err, data) => {
          if (err) {
            reject(err);
          } else {
            if (data.GetSellerListResponse && data.GetSellerListResponse.Errors && data.GetSellerListResponse.Errors.length && data.GetSellerListResponse.Errors[0].ErrorCode && data.GetSellerListResponse.Errors[0].ErrorCode.length && data.GetSellerListResponse.Errors[0].ErrorCode[0] == '21917053') {
              removeTokenIdBySession("ebay", req.session.id)
              .then((val) => {
                reject("token expired");
              })
            } else {
              resolve(data.GetSellerListResponse.ItemArray[0].Item);
            }
          }
        })
      }).catch((err) => {
        console.log(err);
        if (err == "token expired") {
          throw new AppError("token expired", "authentication");
        } else {
          throw err;
        }
      })
    })
  })
}

module.exports.getAllShopifyProducts = function(req) {
  return Promise.join(getTokenBySession("shopify", req.session.id), getIdBySession("shopify", req.session.id), (token, id) => {
    var shopifyclient = new ShopifyClient(id);
    return shopifyclient.get('admin/products.json');
  });
}

module.exports.getActiveEbaySellings = function(req) {
  return Promise.join(getTokenBySession("ebay", req.session.id), getIdBySession("ebay", req.session.id), (token, id) => {
    var ebayclient = new eBayClient(id, 'SOAP');
    var xmlbdy = xmlbdyGenerator('GetMyeBaySellingRequest', 200, 1);
    var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
    var str = xml.end({pretty:true,indent: ' ',newline : '\n'});
    console.log(str);
    return ebayclient.post('GetMyeBaySelling',str)
    .then((result) => {
      return new Promise((resolve, reject) => {
        parser.parseString(result,function(err,resdata){
          // console.log(resdata);
          if (err) {
            reject(err);
          } else {
            // checkAuthError(resdata);
            resolve(resdata);
          }
        });
      })
    }).catch((err) => {
      console.log(err);
      if (err instanceof AppError) {
          if (err.type == "authentication") {
          }
        }
    });
  });
}

module.exports.getNumberofActiveEbayListings = function(id) {
  var ebayclient = new eBayClient(id, 'SOAP');
  var xmlbdy = xmlbdyGenerator('GetMyeBaySellingRequest', 1, 1);
  var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
  var str = xml.end({pretty:true,indent: ' ',newline : '\n'});
  return ebayclient.post('GetMyeBaySelling',str)
  .then((result) => {
    return new Promise((resolve, reject) => {
      parser.parseString(result, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.GetMyeBaySellingResponse.ActiveList[0].PaginationResult[0].TotalNumberOfEntries[0]);
        }
      })
    })
  })
}



module.exports.getAllActiveEbaySellings = function(req) {
  return Promise.join(getTokenBySession("ebay", req.session.id), getIdBySession("ebay", req.session.id), (token, id) => {
    return exports.getNumberofActiveEbayListings(id)
  }).then((number) => {
    var ebayclient = new eBayClient(id, 'SOAP');
    var strs = [];
    var epp = 200;
    var np = Math.ceil(number / 200);
    for (let i = 1; i <= np; i++) {
      let xmlbdy = xmlbdyGenerator('GetMyeBaySellingRequest', epp, i);
      let xml = builder.create(xmlbdy,{encoding: 'utf-8'});
      strs.push(xml.end({pretty:true,indent: ' ',newline : '\n'}));
    }


  })
}

module.exports.postShopifyProduct = function(data) {
  return new Promise((resolve, reject) => {
    var shopifyclient = new ShopifyClient('sellmaster1');
    shopifyclient.post('admin/products.json', "", data)
    .then((response) => {
      resolve(response);
    }).catch((err) => {
      reject(err);
    })
  })
}

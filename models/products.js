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
const parserp = require('xml2js-es6-promise');
const _ = require('lodash');
const maximum_gap_days = 119;
const epp = 10;

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
          'WarningLevel' : 'High'
          // 'DetailLevel': 'ReturnAll',
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
    case 'GetItemRequest':
      return {
    		'GetItemRequest' : {
    			'@xmlns':  "urn:ebay:apis:eBLBaseComponents",
    			'ErrorLanguage' : 'en_US',
    			'WarningLevel' : 'High',
    			'ItemID' : epp,
    			'IncludeItemSpecifics' : true
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

var getNumberofActiveEbayListings = function(id) {
  console.log('getting number of active ebay listings');
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
          console.log(`There are ${data.GetMyeBaySellingResponse.ActiveList[0].PaginationResult[0].TotalNumberOfEntries[0]} listings`);
          resolve(data.GetMyeBaySellingResponse.ActiveList[0].PaginationResult[0].TotalNumberOfEntries[0]);
        }
      })
    })
  })
}

/**
* helper function to get ids of all ebay products
**/
var getAllEbayItemsIds = function(req) {
  return Promise.join(getTokenBySession("ebay", req.session.id), getIdBySession("ebay", req.session.id), (token, id) => {
    return getNumberofActiveEbayListings(id)
    .then((number) => {
      var ebayclient = new eBayClient(id, 'SOAP');
      var strs = [];
      var np = Math.ceil(number / epp);
      // var chunkSize = 10; // 10 requests per chunk
      console.log('Getting only one page of items');
      for (let i = 1; i <= 1; i++) {
        let xmlbdy = xmlbdyGenerator('GetMyeBaySellingRequest', epp, i);
        let xml = builder.create(xmlbdy,{encoding: 'utf-8'});
        strs.push(xml.end({pretty:true,indent: ' ',newline : '\n'}));
      }
      console.log(`Getting all item ids...`);
      var allRequests = strs.map((str, index) => {
        console.log(`Getting ${index * epp} to ${Math.min((index+1) * epp, number)} item ids`);
        return ebayclient.post('GetMyeBaySelling', str)
        .then((response) => {
          return parserp(response);
        }).then((response) => {
          if (response.GetMyeBaySellingResponse.Ack[0] == "Success") {
            console.log(`Got ${index * epp} to ${Math.min((index+1) * epp, number)} item ids`);
            return response.GetMyeBaySellingResponse.ActiveList[0].ItemArray[0].Item.map((eachItem) => {
              return eachItem.ItemID[0];
            })
          } else {
            throw new AppError("Error occured in requesting item ids", "operation");
          }
        })
      });
      return Promise.all(allRequests);
    }).then((itemIdArrays) => {
      return _.flattenDeep(itemIdArrays);
    })
  })
}


module.exports.getAllActiveEbaySellings = function(req) {
  var ifSave = req.query.ifsave;
  var ebayId = null;
  return Promise.join(getIdBySession("ebay", req.session.id), getAllEbayItemsIds(req), (id, ids) => {
    ebayId = id;
    console.log(ids);
    var ebayclient = new eBayClient(id, 'SOAP');
    var strs = [];
    for (let i = 1; i <= ids.length; i++) {
      let xmlbody = xmlbdyGenerator('GetItemRequest', ids[i]);
      let xml = builder.create(xmlbody,{encoding: 'utf-8'});
              // console.log(xml.end({pretty: true}));
      strs.push(xml.end({pretty:true,indent: ' ',newline : '\n'}));
    }
    console.log(`Getting all item information`);
    var allRequests = strs.map((str, index) => {
      console.log(`Getting ${index}th item info`);
      return ebayclient.post('GetItemRequest', str)
      .then((xmlres) => {
        return parserp(xmlres);
      }).then((response) => {
        // return response;
        if (response.GetItemResponse.Ack[0] == 'Success') {
          console.log(`Got ${index}th item info`);
          return response.GetItemResponse.Item[0];
        } else {
          console.log(`Failed on getting ${index}th item info`);
          return null;
        }
      })
    })
    return Promise.all(allRequests);
  }).then((products) => {
    return products;
    return products.map((product) => {
      if (product) {
        return {
          ItemId: product.ItemID ? product.ItemID[0] : null,
          Title: product.Title ? product.Title[0] : null,
          SKU: product.SKU ? product.SKU[0] : null,
          Category: (product.PrimaryCategory && product.PrimaryCategory[0] && product.PrimaryCategory[0].CategoryName) ? product.PrimaryCategory[0].CategoryName[0] : null,
          Quantity: product.Quantity ? product.Quantity[0] : null,
          ConvertedCurrentPrice: (product.SellingStatus[0].ConvertedCurrentPrice && product.SellingStatus[0].ConvertedCurrentPrice[0]) ? product.SellingStatus[0].ConvertedCurrentPrice[0]._ + ' ' + product.SellingStatus[0].ConvertedCurrentPrice[0]['$'].currencyID : null,
          StartPrice: (product.StartPrice && product.StartPrice[0]) ? product.StartPrice[0]._ + ' ' + product.StartPrice[0]['$'].currencyID : null,
          PictureDetails: product.PictureDetails ? product.PictureDetails[0] : null,
          ItemSpecifics: product.ItemSpecifics ? product.ItgiemSpecifics[0] : null,
          ConditionID: product.ConditionID ? product.ConditionID[0] : null,
          ConditionDescription: product.ConditionDescription ? product.ConditionDescription[0] : null,
          ConditionDisplayName: product.ConditionDisplayName ? product.ConditionDisplayName[0] : null
        }
      }
      return null;
    })
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

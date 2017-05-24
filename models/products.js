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
const epp_default = 200;
const {getProductName, getMappingKey, findCorrespondingID} = require('./utility');
// var redis_scanner = require('redis-scanner');
// redis_scanner.bindScanners(redisClient);

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
var getAllEbayItemsIds = function(req, sampleSize) {
  return Promise.join(getTokenBySession("ebay", req.session.id), getIdBySession("ebay", req.session.id), (token, id) => {
    return getNumberofActiveEbayListings(id)
    .then((number) => {
      var ebayclient = new eBayClient(id, 'SOAP');
      var strs = [];
      var epp = sampleSize == "all" ? epp_default : 10;
      var np = sampleSize == "all" ? Math.ceil(number / epp) : 3;
      // var chunkSize = 10; // 10 requests per chunk
      console.log('Getting only one page of items');
      for (let i = 1; i <= np; i++) {
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
  var sampleSize = req.query.all ? "all" : 35;
  const chunkSize = 20;
  return Promise.join(getIdBySession("ebay", req.session.id), getAllEbayItemsIds(req, sampleSize), (id, ids) => {
    ebayId = id;
    var ebayclient = new eBayClient(id, 'REST');
    var idChunks = _.chunk(ids, chunkSize);
    var allRequests = idChunks.map((idchunk, index) => {
      return ebayclient.get(`shopping`, {
        callname: "GetMultipleItems",
        responseencoding: "XML",
        appid: process.env.EBAY_PROD_CLIENT_ID,
        version: 967,
        IncludeSelector: 'Details,Description,ItemSpecifics,Variations',
        ItemID: idchunk.join(',')
      }, '').then((response) => {
        console.log(`Obtained ${index * chunkSize}th to ${Math.min((index + 1) * chunkSize, ids.length)}th items`);
        return parserp(response);
      }).then((resObject) => {
        return resObject.GetMultipleItemsResponse.Item;
      }).then((Items) => {
        return _.flatten(Items);
      }).then((products) => {
        return Promise.all(products.map((product, index) => {
          console.log(getProductName("ebay", ebayId, product.ItemID));
          if (ifSave) {
            return redisClient.setAsync(getProductName("ebay", ebayId, product.ItemID), JSON.stringify(product))
              .then((result) => {
                console.log(`saved ${index}/${products.length} product info`)
                return `${product.ItemID} ok`;
              }).catch((err) => {
                return `${product.ItemID} bad`;
              })
          } else {
            return product;
          }
        }))
      })
    })
    return Promise.all(allRequests);
  }).then((responses) => {
    return _.flatten(responses);
  })
}


module.exports.getAllProductKeys = function(redisClient, channel, id, limit) {
  return new Promise((resolve, reject) => {
    var cursor = '0';
    var results = new Set();
    var count = limit || 10000;
    var wrapper = () => {
      return redisClient.scanAsync(cursor, 'MATCH', `products:${channel}:${id}:*`, 'COUNT', count.toString())
        .then((reply) => {
          cursor = reply[0];
          let keys = reply[1];
          keys.forEach(function(key,i){
              results.add(key);
          });
          if (cursor == '0' || limit) {
            console.log(`Got ${results.size} keys`);
            resolve(Array.from(results));
          } else {
            return wrapper();
          }
        }).catch((err) => {
          console.log("Error happend during acquiring keys: ", err);
          reject(err);
        })
    }
    wrapper();
  }).then((keys) => {
    return _.flattenDeep(keys);
  })
}

var generateHTMLfromSpecifics = function(ItemSpecifics, ConditionDisplayName, ConditionDescription, Description) {
  var specifics = {};
  if (ItemSpecifics && ItemSpecifics.length > 0 && ItemSpecifics[0].NameValueList && ItemSpecifics[0].NameValueList.length > 0) {
    ItemSpecifics[0].NameValueList.forEach((pair) => {
      specifics[pair.Name[0]] = pair.Value[0];
    })
  }
  if (_.isEmpty(specifics)) {
    return Description[0];
  }
  return `<div class="section"><p class="secHd">Item specifics</p><table style="table-layout: auto !important;" id="itmSellerDesc" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><th>Condition:</th><td style="width: 92%;"><b>${ConditionDisplayName}</b></td></tr><tr><th>Seller Notes:</th><td class="sellerNotesContent"><span class="viDescQuotes">“</span><span class="viSNotesCnt">${ConditionDescription}</span><span class="viDescQuotes">”</span></td></tr></tbody></table><table style="table-layout: auto !important;" width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td class="attrLabels">Brand:</td><td width="50.0%"><p itemprop="brand" itemscope="itemscope" itemtype="http://schema.org/Brand"><span itemprop="name">${specifics['Brand']}</span></p></td><td class="attrLabels">Part Type:</td><td width="50.0%"><span>${specifics['Part Type']}</span></td></tr><tr><td class="attrLabels">Manufacturer Part Number:</td><td width="50.0%"><p itemprop="mpn">${specifics['Manufacturer Part Number']}</p></td></tr><!-- Added for see review link --></tbody></table></div>`
}

module.exports.pushAlleBayProductsToShopify = function(req) {
  var limit = req.query.limit;
  return getIdBySession("ebay", req.session.id).then((ebayID) => {
    return Promise.join(exports.getAllProductKeys(redisClient, "ebay", ebayID, limit), getIdBySession("shopify", req.session.id), (keys, shopifyID) => {
      var shopifyclient = new ShopifyClient(shopifyID);
      var pushRequest = keys.map((key, index) => {
        return redisClient.getAsync(key)
        .then((productStr) => {
          var product = JSON.parse(productStr);
          var shopifyData = {
            product: {
              vendor: shopifyID,
              title: product.Title ? product.Title[0] : null,
              tags: product.ItemID,
              body_html: generateHTMLfromSpecifics(product.ItemSpecifics, product.ConditionDisplayName, product.ConditionDescription, product.Description),
              product_type: product.PrimaryCategoryName[0].replace(/eBay /g, ''),
              options: [{name: "Title", position: "1"}],
              images: product.PictureURL.map((url) => {return {src: url};}),
              variants: [
                {
                  price: product.CurrentPrice[0]['_'],
                  fullfillment_service: "manual",
                  inventory_management: "shopify",
                  sku: product.SKU ? product.SKU[0] : null
                }
              ]
            }
          };
          return findCorrespondingID("ebay", "shopify", product.ItemID)
          .then((shopifyProductID) => {
            if (shopifyProductID == null) { // if not exists, then post
              return shopifyclient.post('admin/products.json', "", shopifyData);
            } else { // else, then put
              return shopifyclient.put(`admin/products/${shopifyProductID}`, "", shopifyData)
            }
          });
        }).catch((err) => {
          console.log("Post data to shopify error:", err);
        }).then((response) => {
          if (response && response.product) {
              console.log(`${index}/${keys.length} product ${response.product.id} has been posted, creating mapping for it`);
              return Promise.join(
                redisClient.setAsync(getMappingKey("ebay", "shopify", response.product.tags), response.product.id),
                redisClient.setAsync(getMappingKey("shopify", "ebay", response.product.id), response.product.tags),
                (res1, res2) => {
                  console.log("mapping created");
                  return 'ok';
                }
              );
          } else {
              console.log(response);
          }
        })
      });
      return Promise.all(pushRequest);
    });
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

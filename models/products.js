"use strict";

const Promise = require("bluebird");
const rp = require('request-promise');
const request = require('request');
const {winston, redisClient} = require("../globals.js");
const {eBayClient, ShopifyClient} = require("../controller/client.js");
const getTokenBySession = require("../controller/utility.js").getTokenBySession;
const getIdBySession = require("../controller/utility.js").getIdBySession;
const removeTokenIdBySession = require("../controller/utility.js").removeTokenIdBySession;
const AppError = require("../models/error.js");
const moment = require('moment');
const builder = require('xmlbuilder');
const parser = require('xml2js');
const maximum_gap_days = 119;


module.exports.getAlleBayProducts = function(req) {
    return Promise.join(getTokenBySession("ebay", req.session.id), getIdBySession("ebay", req.session.id), (token, id) => {
        var ebayclient = new eBayClient(id, 'SOAP');
        var startTime = moment().subtract(maximum_gap_days, 'days'); // TODO: not sure if this will get all products
        var requestBody = {
            'GetSellerListRequest':{
                '@xmlns':  'urn:ebay:apis:eBLBaseComponents',
                'ErrorLanguage' : 'en_US',
                'WarningLevel' : 'High',
                'GranularityLevel' : 'Fine',
                'StartTimeFrom' : startTime.format('YYYY-MM-DDTHH:mm:ss.SSS'),
                'StartTimeTo' : moment().format('YYYY-MM-DDTHH:mm:ss.SSS'),
                'IncludeWatchCount' : true,
                'Pagination' :{
                    'PageNumber': 1,
                    'EntriesPerPage' : 200
                }
            }
        };
        var xml = builder.create(requestBody, {encoding: 'utf-8'});
        var str = xml.end({pretty:true, indent: ' ', newline: '\n'});
        // console.log(str);
        return ebayclient.post('GetSellerList', str)
        .then((result) => {
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
        var xmlbdy = {
            'GetMyeBaySellingRequest':{
                '@xmlns':  'urn:ebay:apis:eBLBaseComponents',
                'ErrorLanguage' : 'en_US',
                'WarningLevel' : 'High',
                'ActiveList' :{
                    'Pagination' :{
                        'EntriesPerPage' : 200,
                        'PageNumber' : 1
                    }
                }
            }
        };
        var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
        var str = xml.end({pretty:true,indent: ' ',newline : '\n'});
        return ebayclient.post('GetMyeBaySelling',str)
        .then((result) => {
            return new Promise((resolve, reject) => {
                parser.parseString(result,function(err,resdata){
                    // console.log(resdata);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resdata);
                    }
                });
            })
        }).catch((err) => {
            console.log(err);
        });
    });
}

module.exports.getNumberofActiveEbayListings = function(req) {
    var ebayclient = new eBayClient(id, 'SOAP');
    var xmlbdy = {
        'GetMyeBaySellingRequest':{
            '@xmlns':  'urn:ebay:apis:eBLBaseComponents',
            'ErrorLanguage' : 'en_US',
            'WarningLevel' : 'High',
            'ActiveList' :{
                'Pagination' :{
                    'EntriesPerPage' : 1,
                    'PageNumber' : 1
                }
            }
        }
    };
    var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
    var str = xml.end({pretty:true,indent: ' ',newline : '\n'});
    return ebayclient.post('GetMyeBaySelling',str)
    .then((result) => {
        return new Promise((resolve, reject) => {
            parse.parseString(result, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.GetMyeBaySellingResponse.ActiveList[0].PaginationResult[0]);
                }
            })
        })
    })
}

module.exports.getAllActiveEbaySellings = function(req) {
    return Promise.join(getTokenBySession("ebay", req.session.id), getIdBySession("ebay", req.session.id), (token, id) => {
        return exports.getNumberofActiveEbayListings(id)
    })
}

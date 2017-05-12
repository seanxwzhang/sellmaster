// ebay active request for synchronization
// ebay webhook handler
"use strict";

var builder = require('xmlbuilder');
var parser = require('xml2js');
var router = require('express').Router();
const {eBayClient, ShopifyClient} = require('./client.js');

/**
 * webhook handler for item deletion from shopify
 * 1. should check if the item has been deleted from ebay already
 * 2. if not, delete it from ebay
 **/
router.get('/deleteItemCallback/shopify', (req, res, next) => {
    var ebayClient = new ebayClient('dsadasdasd');
    ebayClient.delete('dasjkdgasjhdgjhasgdhja')
    .then((result) => {
        console.log("yeah, deleted!");
    })
})

function ebay_changeQuantity(itemid,quantity,res){
	//var res; 
	var xmlbdy = {
		'ReviseItemRequest':{
			'@xmlns':  "urn:ebay:apis:eBLBaseComponents",
			'ErrorLanguage' : 'en_US',
			'WarningLevel' : 'High',
			'item' :{
				'ItemID': itemid,
				'Quantity': quantity
			}
		}
	};
	
	var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
	var str = xml.end({pretty:true});
	console.log(str);
	var ebayclient = new eBayClient('testuser_shuangzhang','SOAP');
	
	return ebayclient.post('ReviseItem',str)
	.then((result) => {
        //console.log(result);
		parser.parseString(result,function(err,resdata){
			console.dir(resdata);
			if(resdata.ReviseItemResponse.Ack[0]=="Success"||resdata.ReviseItemResponse.Ack[0]=="Warning"){console.log("Item revision succeeded");
				res.status(200).send("Item with id " +itemid + " revision succeeded. New quantity is now " + quantity);
			}
			else{res.status(200).send("Item with id " +itemid + " revision failed.");}
			//res=resdata.ReviseItemResponse.Ack[0];
			
		});
        
    }).catch((err) => {
        console.log(err);
    }); 
	//return res;
	
}

function ebay_getItem(itemid,res){
	var xmlbdy = {
		'GetItemRequest' : {
			'@xmlns':  "urn:ebay:apis:eBLBaseComponents",
			'ErrorLanguage' : 'en_US',
			'WarningLevel' : 'High',
			'ItemID' : itemid
		}
	};
	var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
	var str = xml.end({pretty:true});
	console.log(str);
	var ebayclient = new eBayClient('testuser_shuangzhang','SOAP');
	return ebayclient.post('GetItem',str)
	.then((result) => {
        
		parser.parseString(result,function(err,resdata){
			console.dir(resdata);
			if(resdata.GetItemResponse.Ack[0]=="Success"||resdata.GetItemResponse.Ack[0]=="Warning"){console.log("Item retrieve succeeded");
				res.status(200).send("Item with id " +itemid + " retrieve succeeded. Quantity is now " + resdata.GetItemResponse.Item[0].Quantity[0] );
				//console.dir(resdata.GetItemResponse.Item[0].Quantity[0]);
				//can do something with the quantity here call to revise the quantity on shopify for example
			}
			else{res.status(200).send("Item with id " +itemid + " retrieve failed.");}
			
			
		});
        
    }).catch((err) => {
        console.log(err);
    }); 
}

function ebay_endItem(itemid,res){
	var xmlbdy = {
		'EndItemRequest' : {
			'@xmlns':  "urn:ebay:apis:eBLBaseComponents",
			'ErrorLanguage' : 'en_US',
			'WarningLevel' : 'High',
			'ItemID' : itemid,
			'EndingReason' : 'NotAvailable'
		}
	};
	var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
	var str = xml.end({pretty:true});
	console.log(str);
	var ebayclient = new eBayClient('testuser_shuangzhang','SOAP');
	return ebayclient.post('EndItem',str)
	.then((result) => {
        
		parser.parseString(result,function(err,resdata){
			console.dir(resdata);
			if(resdata.EndItemResponse.Ack[0]=="Success"||resdata.EndItemResponse.Ack[0]=="Warning"){console.log("Item retrieve succeeded");
				res.status(200).send("Item with id " + itemid + " ended successfully." );
				//console.dir(resdata.GetItemResponse.Item[0].Quantity[0]);
				//can do something with the quantity here call to revise the quantity on shopify for example
			}
			else{res.status(200).send("Item with id " +itemid + " failed to end.");}
			
			
		});
        
    }).catch((err) => {
        console.log(err);
    });
	
}

router.get('/testEndItemQuantity/ebay/:itemid',(req,res,err) =>{
	var itemid = req.params.itemid;
	ebay_endItem(itemid,res);
});

router.get('/testGetItemQuantity/ebay/:itemid',(req,res,err) =>{
	var itemid = req.params.itemid;
	ebay_getItem(itemid,res);
});

router.get('/testReviseItemQuantity/ebay/:itemid/:newquantity',(req,res,err) =>{
	var itemid = req.params.itemid;
	var newquantity = req.params.newquantity;
	
	ebay_changeQuantity(itemid,newquantity,res);
/* 	.then((result)=>{
		console.log(result);
		if(result=="Success"||result=="Warning"){
				res.status(200).send("Item revision succeeded.");
		}
		else{
				res.status(200).send("Item revision failed.");		
		}
		
	}); */
	
});

router.get('/testInventoryItem/ebay',(req,res,err) => {
	var ebayclient = new eBayClient('testuser_shuangzhang','SOAP');
	
var test = {
	'GetSellerListRequest':{
		'@xmlns':  'urn:ebay:apis:eBLBaseComponents',
		'ErrorLanguage' : 'en_US',
		'WarningLevel' : 'High',		
		'GranularityLevel' : 'Coarse',
		'StartTimeFrom' : '2017-05-01T21:59:59.005Z',
		'StartTimeTo' : '2017-05-10T21:59:59.005Z',
		'IncludeWatchCount' : true,
		'Pagination' :{
			'EntriesPerPage' : 2
		}
	}
};
	var xml = builder.create(test,{encoding: 'utf-8'});
	//console.log(JSON.stringify(xml.end({pretty:true,indent: ' ',newline : '\n'})));
	var str = xml.end({pretty:true,indent: ' ',newline : '\n'});
	//str = str.substring(1,str.length-1);	
	//str.replace(/\\"/g, '\"');
	console.log(str);
	//ebayclient.get('sell/inventory/v1/inventory_item')
    ebayclient.post('GetSellerList',str)
	.then((result) => {
        //console.log(result);
		parser.parseString(result,function(err,resdata){
			console.dir(resdata);
			res.status(200).send(resdata);
			
		});
        
    }).catch((err) => {
        console.log(err);
    }); 
	
});






/**
 * webhook handler for item deletion from ebay
 * 1. should check if the item has been deleted from shopify already
 * 2. if not, delete it from ebay
 **/
router.get('/deleteItemCallback/ebay', (req, res, next) => {

})




module.exports = router;

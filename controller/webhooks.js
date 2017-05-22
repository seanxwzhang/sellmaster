// ebay active request for synchronization
// ebay webhook handler
"use strict";

var builder = require('xmlbuilder');
var parser = require('xml2js');
var router = require('express').Router();
var util = require('util');
var http = require('http');
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

function shopify_changeQuantity(itemid,quantity,res){
	var shopifyclient = new ShopifyClient('sellmaster1');
	shopifyclient.get('admin/products/'+ itemid +'.json','','')
	.then((result) => {
		var json_obj = JSON.parse(result);
		var my_id = json_obj.product.variants[0].id;
		var new_product =
		{
  			"variant": 
  				{
    			"id": my_id,
    			"inventory_management": "shopify",
    			"inventory_quantity": quantity
  				}
		}
		console.log(new_product);
		return shopifyclient.put('admin/variants/'+ my_id +'.json','',new_product)
		.then((result) => {
		console.log(result);
        res.status(200).send(result);
    	}).catch((err) => {
        	console.log(err);
    	});
    }).catch((err) => {
        console.log(err);
    });
}

function ebay_getItem(itemid,res){
	var xmlbdy = {
		'GetItemRequest' : {
			'@xmlns':  "urn:ebay:apis:eBLBaseComponents",
			'ErrorLanguage' : 'en_US',
			'WarningLevel' : 'High',
			'ItemID' : itemid,
			'IncludeItemSpecifics' : true
		}
	};
	var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
	var str = xml.end({pretty:true});
	console.log(str);
	var ebayclient = new eBayClient('testuser_shuangzhang','SOAP');
	return ebayclient.post('GetItem',str)
	.then((result) => {
        
		parser.parseString(result,function(err,resdata){
			console.log(util.inspect(resdata,false,null));
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

function shopify_getItem(itemid,res){
	var shopifyclient = new ShopifyClient('sellmaster1');
	return shopifyclient.get('admin/products/'+ itemid +'.json','','')
	.then((result) => {
		console.log(result);
        res.status(200).send(result);
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
			console.log(util.inspect(resdata,false,null));
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

function shopify_endItem(itemid,res){
	var shopifyclient = new ShopifyClient('sellmaster1');
	return shopifyclient.delete('admin/products/'+ itemid +'.json','','')
	.then((result) => {
		console.log(result);
        res.status(200).send(result);
    }).catch((err) => {
        console.log(err);
    });
}

router.get('/testEndItemQuantity/shopify/:itemid',(req,res,err) =>{
	var itemid = req.params.itemid;
	shopify_endItem(itemid,res);
});

router.get('/testGetItemID/shopify/:itemid',(req,res,err) =>{
	var itemid = req.params.itemid;
	shopify_getItem(itemid,res);
});

router.get('/testReviseItemQuantity/shopify/:itemid/:newquantity',(req,res,err) =>{
	var itemid = req.params.itemid;
	var newquantity = req.params.newquantity;
	shopify_changeQuantity(itemid,newquantity,res)
});

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

//get active selling item only
router.get('/testActiveItem/ebay',(req,res,err) => {
	var ebayclient = new eBayClient('testuser_shuangzhang','SOAP');
	
	var xmlbdy = {
		'GetMyeBaySellingRequest':{
			'@xmlns':  'urn:ebay:apis:eBLBaseComponents',
			'ErrorLanguage' : 'en_US',
			'WarningLevel' : 'High',		
			'ActiveList' :{
				'Pagination' :{
					'EntriesPerPage' : 200,
					'PageNumber' : 1
				},
				'IncludeNotes' : true
			}
			
		}
	};
	var xml = builder.create(xmlbdy,{encoding: 'utf-8'});
	
	var str = xml.end({pretty:true,indent: ' ',newline : '\n'});

	console.log(str);
	
    ebayclient.post('GetMyeBaySelling',str)
	.then((result) => {
        
		parser.parseString(result,function(err,resdata){
			console.log(util.inspect(resdata,false,null));
			res.status(200).send(JSON.stringify(resdata,null,2));
			
		});
        
    }).catch((err) => {
        console.log(err);
    }); 
	
});


router.get('/testInventoryItem/ebay',(req,res,err) => {
	var ebayclient = new eBayClient('testuser_shuangzhang','SOAP');
	
var test = {
	'GetSellerListRequest':{
		'@xmlns':  'urn:ebay:apis:eBLBaseComponents',
		'ErrorLanguage' : 'en_US',
		'WarningLevel' : 'High',		
		'DetailLevel' : 'ReturnAll',
		'StartTimeFrom' : '2017-05-01T21:59:59.005Z',
		'StartTimeTo' : '2017-05-20T21:59:59.005Z',
		'IncludeWatchCount' : true,
		'IncludeVariations' : true,
		'Pagination' :{
			'EntriesPerPage' : 200
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
			console.log(util.inspect(resdata,false,null));
			res.status(200).send(JSON.stringify(resdata,null,2));
			
		});
        
    }).catch((err) => {
        console.log(err);
    }); 
	
});

//skeleton respond to ebay webhook, respond with 200 and empty message
//use req.body.nameofattribute to access attributes
router.post('/testeBayWebhook',(req,res,err) =>{
	res.status(200).end();
	console.log(util.inspect(req.body, false, null));
	//console.log(req.body.GetSellerListResponse.Ack[0]);
	//TODO security check
	
	//get id and quantity
	var response = req.body['soapenv:Envelope']['soapenv:Body'][0].GetItemResponse[0];
	//console.log(util.inspect(response,false,null));
	var notificationName = response.NotificationEventName[0];
	console.log("notification is "+notificationName);
	if(notificationName == "ItemSold"){
		var eBay_id = response.Item[0].ItemID[0];
		var eBay_quantity = response.Item[0].Quantity[0];
		console.log("eb id: "+eBay_id);
		console.log("eb quan: "+eBay_quantity);
		
		//update Shopify by first finding corresponding id and then do the update
		
	}
	else if (notificationName == "ItemListed"){
		//get all necessary attribute
		
		//update database for id mapping by creating a new entry
		
		//Use Shopify API to create a listing
		
	}
	
});

//skeleton respond to shopify webhook, respond with 200 and empty message
router.post('/testShopifyWebhook',(req,res,err) =>{
	res.status(200).end();
	console.log(util.inspect(req.body, false, null));
	//TODO security check

	//get_id and quantity
	var Shopify_id = [];
	var Shopify_quantity = [];
	for(var i = 0; i < req.body.variants.length;i++){
		Shopify_id.push(req.body.variants[i].id);
		console.log("Sh id: "+ req.body.variants[i].id);
		Shopify_quantity.push(req.body.variants[i].inventory_quantity);
		console.log("Sh quan: "+ req.body.variants[i].inventory_quantity);		
	}
	for(var i = 0; i< Shopify_id.length; i++){
		//retreive ebay corresponding id
		
		//update quantity
		if(Shopify_quantity[i]==0){
			//Call enditem function			
		}
		else{
			//Call reviseitem quantity function			
		}
		
	}
	
});



function findItembyTitle(title,quantity){
	//console.log(process.env.EBAY_SANDBOX_CLIENT_ID);
	var resStr = '';
	
	var securityID = process.env.EBAY_SANDBOX_CLIENT_ID; //may change to official
	var sellerConstraint = '&itemFilter.name=Seller&itemFilter.value=testuser_shuangzhang'; //seller name can subject to change
	var opParam = 'OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=XML&SECURITY-APPNAME=';
	var payloadParam = 'REST-PAYLOAD&keywords=' + title.replace(/ /g,'%20') + sellerConstraint + '&paginationInput.entriesPerPage=200';
	
	
	var options = {
		host: 'svcs.sandbox.ebay.com',
		path: '/services/search/FindingService/v1?' + opParam + securityID + '&' + payloadParam		
	};
	var req = http.request(options, function(response){
		response.on('data', function(chunk){
			resStr += chunk;
		});
		
		response.on('end',function(){
			parser.parseString(resStr,function(err,resdata){
				console.log(util.inspect(resdata,false,null));
				if(resdata.findItemsByKeywordsResponse.ack[0]=='Success'){
					var itemID = resdata.findItemsByKeywordsResponse.searchResult[0].item[0].itemId[0];
					console.log('itemid is '+itemID);
					console.log(quantity);
					//do something with the item and quantity.
				}
			});
		});
		
	}).end();
	
	
}


/**
 * webhook handler for item deletion from ebay
 * 1. should check if the item has been deleted from shopify already
 * 2. if not, delete it from ebay
 **/
router.get('/deleteItemCallback/ebay', (req, res, next) => {
	//findItembyTitle('00-03 Honda Shadow Ace 750 Vt750 Vt750cd Front Forks Clamp Lower Triple Tree',2);
})




module.exports = router;

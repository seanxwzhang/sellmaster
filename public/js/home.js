"use strict";

$(document).ready(function () {
    var shopifyButton = $("#oauth-button-shopify");
    var ebayButton = $("#oauth-button-ebay");
    var shopifyName = $("#i1").value;
    var ebayName = $("#i2").value;
    shopifyButton.on('click', (e) => {window.location.href = "/auth/shopify/initiate?storename=" + shopifyName;});
    ebayButton.on('click', (e) => {window.location.href = "/auth/ebay/initiate?storename=" + ebayName;});
    console.log(shopifyButton);
});

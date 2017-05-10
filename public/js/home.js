"use strict";

$(document).ready(function () {
    $.material.init();
    var shopifyButton = $("#oauth-button-shopify");
    var ebayButton = $("#oauth-button-ebay");
    shopifyButton.on('click', (e) => {window.location.href = "/auth/shopify/initiate?storename=" + $("#i1")[0].value;});
    ebayButton.on('click', (e) => {window.location.href = "/auth/ebay/initiate?storename=" + $("#i2")[0].value;});
    var query = {};
    if (window.location.href.indexOf('?') > -1) {
        window.location.href.split('?')[1].split('&').map((q) => {query[q.split('=')[0]] = decodeURIComponent(q.split('=')[1]);});
    }
    if (query.message) {
        $.notify({
            icon: 'glyphicon glyphicon-warning-sign',
        	message: query.message
        },{
        	type: 'warning',
            element: 'body',
            offset: 20,
        	spacing: 10,
        	z_index: 1031,
        	delay: 5000,
        	timer: 1000,
            allow_dismiss: true,
            animate: {
        		enter: 'animated fadeInDown',
        		exit: 'animated fadeOutUp'
        	},
            template: '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
        		'<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
        		'<span data-notify="icon"></span> ' +
        		'<span data-notify="title">{1}</span> ' +
        		'<span data-notify="message">{2}</span>' +
        		'<div class="progress" data-notify="progressbar">' +
        			'<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
        		'</div>' +
        		'<a href="{3}" target="{4}" data-notify="url"></a>' +
        	'</div>'
        });
    }
});

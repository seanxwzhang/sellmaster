/*
 * The MIT License
 *
 * Copyright (c) 2014, Sebastian Sdorra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

angular.module('adfDynamicSample', [
    'adf', 'ngRoute', 'adf.structures.base',
    'adf.widget.clock', 'adf.widget.github', 'adf.widget.iframe',
    'adf.widget.linklist', 'adf.widget.markdown', 'adf.widget.news',
    'adf.widget.randommsg', 'adf.widget.version', 'adf.widget.weather','adf.widget.clock',
    'adf.widget.table', 'ng-mfb', 'ngLodash'
  ])
  .config(function($routeProvider){
    $routeProvider
      .when('/boards/:id', {
        controller: 'dashboardCtrl',
        controllerAs: 'dashboard',
        templateUrl: 'partials/dashboard.html',
        resolve: {
          data: function($route, idService, storeService, $q, socket){
            // return storeService.get($route.current.params.id);
            return $q.all([storeService.get($route.current.params.id), idService.getId()])
              .then((values) => {
                var ids = values[1];
                console.log("assign me a room", ids);
                socket.emit("assign me a room", ids);
                // replace hardcode url with true iframe url
                var storeStr = JSON.stringify(values[0]).replace(/https:\/\/\w+.\w+.com/g, `https://${ids.shopifyId}.myshopify.com`);
                console.log(ids.shopifyId);
                var store = JSON.parse(storeStr);
                return store;
              })
          },
          autoUpdateStatus: function(autoUpdateService) {
            return autoUpdateService.getStatus();
          }
        }
      })
      .otherwise({
        redirectTo: '/boards/_1494796694507'
      });
  })
  .factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  })
  .filter('prependWidth', function() {
    return function(input) {
      return `width: ${input}%`;
    }
  })
  .service('notificationService', function() {
    return {
      notify: function(message, type) {
        $.notify({
            icon: 'glyphicon glyphicon-warning-sign',
            message: message
        },{
            type: type || 'success',
            element: 'body',
            offset: 20,
            spacing: 10,
            z_index: 1031,
            delay: 5000,
            timer: 1000,
            allow_dismiss: true,
            newest_on_top: true,
            placement: {
          		from: "top",
          		align: "right"
          	},
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
    }
  })
  .service('idService', function($http, $q) {
    return {
      getId: function() {
        var deferred = $q.defer();
        $http.get('/api/mystores')
          .success(function(data){
            console.log(data);
            deferred.resolve(data);
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      }
    }
  })
  .service('autoUpdateService', function($http, $q) {
    return {
      getStatus: function() {
        var deferred = $q.defer();
        $http.get('/api/autoUpdateStatus')
          .success(function(data){
            deferred.resolve(data)
          })
        return deferred.promise;
      },
      halfAutoUpdate: function() {
        var deferred = $q.defer();
        $http.get('/api/startAutoUpdate?whkevents=products/update&crjtypes=sync')
          .success(function(data){
            deferred.resolve(data)
          })
        return deferred.promise;
      },
      fullAutoUpdate: function() {
        var deferred = $q.defer();
        $http.get('/api/startAutoUpdate?whkevents=products/update,products/delete&crjtypes=sync%26delete')
          .success(function(data){
            deferred.resolve(data)
          })
        return deferred.promise;
      },
      cancel: function() {
        var deferred = $q.defer();
        $http.get('/api/cancelAutoUpdate')
          .success(function(data){
            deferred.resolve(data)
          })
        return deferred.promise;
      }
    }
  })
  .service('storeService', function($http, $q){
    return {
      getAll: function(){
        var deferred = $q.defer();
        $http.get('/v1/store')
          .success(function(data){
            deferred.resolve(data.dashboards);
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      },
      get: function(id){
        var deferred = $q.defer();
        $http.get('/v1/store/' + id)
          .success(function(data){
            deferred.resolve(data);
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      },
      set: function(id, data){
        var deferred = $q.defer();
        $http.post('/v1/store/' + id, data)
          .success(function(data){
            deferred.resolve();
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      },
      delete: function(id){
        var deferred = $q.defer();
        $http.delete('/v1/store/' + id)
          .success(function(data){
            deferred.resolve(data);
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      }
    };
  })
  .controller('navigationCtrl', function($scope, $q, $location, storeService){
    var nav = this;
    nav.navCollapsed = true;

    this.toggleNav = function(){
      nav.navCollapsed = ! nav.navCollapsed;
    };

    this.navClass = function(page) {
      var currentRoute = $location.path().substring(1);
      return page === currentRoute || new RegExp(page).test(currentRoute) ? 'active' : '';
    };

    this.create = function(){
      var id = '_' + new Date().getTime();
      var q = storeService.set(id, {
        "title": "New Sample",
        "structure": "4-8",
        "rows": [{
          "columns": [{
            "styleClass": "col-md-4",
            "widgets": []
          },{
            "styleClass": "col-md-8",
            "widgets": []
          }]
        }]
      });

      $q.all([q, storeService.getAll()]).then(function(values){
        nav.items = values[1];
      });
    };

    storeService.getAll().then(function(data){
      nav.items = data;
    });

    $scope.$on('navChanged', function(){
      storeService.getAll().then(function(data){
        console.log("data ", data);
        nav.items = data;
      });
    });
  })
  .factory('trans_type', function() {
    return {
      'shopify_webhook_product_update': 'products/update',
      'shopify_webhook_product_delete': 'products/delete',
      'ebay_cronjob_sync_delete': 'sync&delete',
      'ebay_cronjob_sync':'sync'
    };
  })
  .controller('dashboardCtrl', function($location, $rootScope, $scope, $routeParams, storeService, data, socket, notificationService, autoUpdateStatus, trans_type, lodash, autoUpdateService){
    $rootScope.labels = [];
    console.log('autoUpdateStatus', autoUpdateStatus);
    this.name = $routeParams.id;
    this.model = data;
    $rootScope.progressbar = false;

    this.delete = function(id){
      storeService.delete(id);
      $location.path('/');
      $rootScope.$broadcast('navChanged');
    };

    $scope.NumProducts = 0;
    $scope.NumFetched = 0;
    $scope.NumProcessed = 0;
    $scope.NumUpdated = 0;
    $scope.NumCreated = 0;
    $scope.autoUpdateFull = false;
    $scope.autoUpdateHalf = false;
    if (lodash.indexOf(autoUpdateStatus.webhookEvents, 'products/update') > -1 && lodash.indexOf(autoUpdateStatus.cronjobTypes, 'sync') > -1) {
      $scope.autoUpdateHalf = true;
    }
    if (lodash.indexOf(autoUpdateStatus.webhookEvents, 'products/update') > -1
    && lodash.indexOf(autoUpdateStatus.webhookEvents, 'products/delete') > -1 && lodash.indexOf(autoUpdateStatus.cronjobTypes, 'sync&delete') > -1) {
      $scope.autoUpdateFull = true;
      $scope.autoUpdateHalf = false;
    }
    if (lodash.indexOf(autoUpdateStatus.cronjobTypes, 'sync&delete') > -1 && lodash.indexOf(autoUpdateStatus.cronjobTypes, 'sync') > -1) {
      console.error('invalid state!');
    }
    if ($scope.autoUpdateFull) {
      $rootScope.labels.push({title: 'Auto-update on (with delete)', class: 'label-warning'});
    } else if ($scope.autoUpdateHalf){
      $rootScope.labels.push({title: 'Auto-update on (conservative)', class: 'label-success'});
    }


    $scope.$on('adfDashboardChanged', function(event, name, model) {
      storeService.set(name, model);
    });

    socket.on('test', function(data) {
      console.log("test socket trigger: ", data);
    })
    socket.on('progress', function(data) {
      if (!data.noshow) {
        $rootScope.progressPercent = data.percentage;
        notificationService.notify(data.msg, data.msg.includes('webhookEvent') ? 'primary':'success');
        console.log(data.msg);
        if (data.msg == `Upload complete!`) {
          $rootScope.progressbar = false;
          $scope.showSpinner = false;
        }
      }
    })

    $scope.showSpinner = false;

    $scope.buttons = [{
      label: 'upload products to shopify',
      icon: 'ion-ios-cloud-upload',
      click: function() {
          if (!$rootScope.progressbar) {
            $scope.showSpinner = true;
            $scope.NumProducts = 0;
            $scope.NumFetched = 0;
            $scope.NumProcessed = 0;
            $scope.NumUpdated = 0;
            $scope.NumCreated = 0;
            $rootScope.progressbar = true;
            $rootScope.progressPercent = 0;
            notificationService.notify('Upload starts!');
            axios.get('/api/startSynchonize')
            .then(function (response) {
              console.log(response);
            })
            .catch(function (error) {
              console.log(error);
            });
          } else {
              notificationService.notify('Uploading ongoing, it could take up to 3 hours for a full synchronization for a store with 20,000+ products')
          }
      }
    }, {
      label: 'Toggle auto-update, delete unmatched product',
      icon: 'ion-android-sync',
      click: function() {
        if (!$scope.autoUpdateFull) {
          if ($scope.autoUpdateHalf) {
            notificationService.notify("You must turn off ther other Auto-Update option first", 'warning');
            return;
          }
          autoUpdateService.fullAutoUpdate()
          .then((message) => {
            $scope.autoUpdateFull = true;
            console.log(message);
            notificationService.notify("Auto update turned on, any product changes will be recorded and synchronized, unmatched products will be deleted");
            $rootScope.labels = []
            $rootScope.labels.push({title: 'Auto-update on (with delete)', class: 'label-warning'});
          })
        } else {
          autoUpdateService.cancel()
          .then((message) => {
            $scope.autoUpdateFull = false;
            notificationService.notify("Auto update (with delete) turned off");
            $rootScope.labels = [];
            console.log(message);
          })
        }
      }
    }, {
      label: 'Toggle auto-update, keep unmatched product',
      icon: 'ion-refresh',
      click: function() {
        if (!$scope.autoUpdateHalf) {
          if ($scope.autoUpdateFull) {
            notificationService.notify("You must turn off ther other Auto-Update option first", 'warning');
            return;
          }
          autoUpdateService.halfAutoUpdate()
          .then((message) => {
            $scope.autoUpdateHalf= true;
            console.log(message);
            notificationService.notify("Auto update turned on, any product changes will be recorded and synchronized, unmatched products will be kept");
            $rootScope.labels = []
            $rootScope.labels.push({title: 'Auto-update on (conservative)', class: 'label-success'});
          })
        } else {
          autoUpdateService.cancel()
          .then((message) => {
            $scope.autoUpdateHalf = false;
            notificationService.notify("Auto update (conservative) turned off");
            $rootScope.labels = [];
            console.log(message);
          })
        }
      }
    }];


  });

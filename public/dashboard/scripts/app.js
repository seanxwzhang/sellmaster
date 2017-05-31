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
    'adf.widget.table', 'ng-mfb'
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
                console.log(JSON.stringify(values[0]));
                var storeStr = JSON.stringify(values[0]).replace(/https:\/\/\w+.\w+.com/g, `https://${ids.shopifyId}.myshopify.com`);
                console.log(ids.shopifyId);
                var store = JSON.parse(storeStr);
                return store;
              })
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

        // return axios.get('/api/mystores')
        //   .then(function (response) {
        //     // console.log(response);
        //     return response;
        //   })
        //   .catch(function (error) {
        //     console.log(error);
        //     throw error;
        //   });
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
  .controller('dashboardCtrl', function($location, $rootScope, $scope, $routeParams, storeService, data, socket, notificationService){
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

    $scope.$on('adfDashboardChanged', function(event, name, model) {
      storeService.set(name, model);
    });

    socket.on('test', function(data) {
      console.log("test socket trigger: ", data);
    })
    socket.on('progress', function(data) {
      if (!data.noshow) {
        $rootScope.progressPercent = data.percentage;
        notificationService.notify(data.msg);
        console.log(data.msg);
        if (data.msg == `Synchronization complete!`) {
          $rootScope.progressbar = false;
          $scope.showSpinner = false;
        }
      }
    })
    // socket.on('startCounting', function (data) {
    //   $scope.progress = "counting number of products in eBay";
    // });
    // socket.on('startFetching', function (data) {
    //   $scope.NumProducts = data;
    //   $scope.progress = "start fetching products from eBay";
    // });
    // socket.on('fetched', function (data) {
    //   $scope.NumFetched += data;
    //   $scope.progress = `fetched ${$scope.NumFetched}/${$scope.NumProducts} products`;
    // });
    // socket.on('doneFetching', function (data) {
    //   $scope.progress = `fetching finished, obtained ${$scope.NumFetched} products`;
    // });
    // socket.on('startProcessing', function (data) {
    //   $scope.NumProducts = data;
    //   $scope.progress = `start formatting and uploading ${$scope.NumProducts} products information`;
    // });
    // socket.on('processed', function (data) {
    //   $scope.NumProcessed += data.num;
    //   if (data.type == 'POST') {
    //     $scope.NumCreated += data.num;
    //   } else {
    //     $scope.NumUpdated += data.num;
    //   }
    //   $scope.progress = `processed ${$scope.NumProcessed}/${$scope.NumProducts} products`;
    // });
    // socket.on('doneProcess', function (data) {
    //   $scope.progress = `Finished synchronization, created ${$scope.NumCreated} products, updated ${$scope.NumUpdated} products`;
    // });


    $scope.showSpinner = false;

    $scope.buttons = [{
      label: 'synchronize products',
      icon: 'ion-android-sync',
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
            notificationService.notify('Synchronization starts!');
            axios.get('/api/startSynchonize')
            .then(function (response) {
              console.log(response);
            })
            .catch(function (error) {
              console.log(error);
            });
          } else {
              notificationService.notify('Synchronizaion ongoing, it could take up to 3 hours for a full synchronization for a store with 20,000+ products')
          }
      }
    }];


  });

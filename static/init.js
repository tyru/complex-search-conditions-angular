(function () {
  'use strict';

  angular.module('complex-search-conditions', ['ngRoute', 'ngResource', 'ui.bootstrap'])
    .config(function($routeProvider, $locationProvider) {
      // Disable HTML5 mode for static files only environment like GitHub pages.
      // $locationProvider.html5Mode(true);
      $routeProvider.otherwise({
        redirectTo: '/'
      });
    });
})();

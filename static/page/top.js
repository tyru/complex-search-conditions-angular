(function () {
  'use strict'

  angular.module('complex-search-conditions')
    .config(function($routeProvider, $locationProvider) {
      $routeProvider
        .when('/', {
          templateUrl: '/page/top.html',
          controller: 'topCtrl as $ctrl'
        })
    })

    .controller('topCtrl', [
        '$scope', 'searchService',
    function topCtrl($scope, searchService) {
      // ng-model-options='{getterSetter: true}'
      function makeJsonInputText(initialValue) {
        var inputFn; inputFn = function (value) {
          if (angular.isUndefined(value)) {
            return angular.toJson(inputFn.json)
          } else {
            try {
              inputFn.json = angular.fromJson(value)
            } catch (e) {
              console.error(e)
            }
          }
        }
        inputFn.json = initialValue
        return inputFn
      }

      var $ctrl = this
      $ctrl.conditions = makeJsonInputText(["and", ["or", "A", "B", "C"], "D"])
      $ctrl.alerts = []

      // Search
      // $ctrl.search = function search(query) {
      //   searchService.search(query).then(function onSuccess(res) {
      //     $ctrl.sql = res.sql
      //   }, function onError(res) {
      //     $ctrl.alerts.push({
      //       type: 'danger',
      //       msg: res.statusText + ' (' + res.data.trim() + ')'
      //     })
      //   })
      // }
      //
      // $ctrl.closeAlert = function(index) {
      //   $ctrl.alerts.splice(index, 1)
      // }
    }])

    .factory('searchService', ['$http', '$q', function Search($http, $q) {
      var deferred = $q.defer()
      $http.get('/api/v1/search').then(function onSuccess(res) {
        deferred.resolve(res)
      }, function onError(res) {
        deferred.reject(res)
      })
      return deferred.promise
    }])

    .directive('cscConditions', [
        '$interpolate', '$compile', '$rootScope',
    function cscConditions($interpolate, $compile, $rootScope) {
      return {
        restrict: 'A',
        scope: {
          cscConditions: '='
        },
        link: function (scope, element, attr) {
          function exprElement(expr) {
            var $expr = angular.element('<div class="condition-expr"></div>')
            if (angular.isArray(expr)) {
              $expr.append(makeTreeHTML(expr))
            } else {
              $expr.text(expr)
            }
            return $expr
          }
          function operatorElement(op) {
            return angular.element('<div class="condition-operator"></div>')
                          .text(op)
          }
          function conditionElement(op) {
            return angular.element(
              '<div class="condition condition-' + op + '"></div>'
            )
          }
          function rootElement() {
            return angular.element(
              '<div class="csc-conditions-root"></div>'
            )
          }
          function makeTreeHTML(conditions) {
            if (!angular.isArray(conditions)) {
              throw new Error('Error: \'conditions\' is not Array ' +
                              '(' + conditions + ')')
            }
            if (conditions[0] === 'or' || conditions[0] === 'and') {
              // "OR" group element:
              //   <div class='condition condition-or'>
              //     <div class='condition-expr'>{expr}</div>
              //     <div class='condition-operator'>OR</div>
              //     <div class='condition-expr'>{expr}</div>
              //     ...
              //   </div>
              //
              // "AND" group element:
              //   <div class='condition condition-and'>
              //     <div class='condition-expr'>{expr}</div>
              //     <div class='condition-operator'>AND</div>
              //     <div class='condition-expr'>{expr}</div>
              //     ...
              //   </div>

              var $div = conditionElement(conditions[0])
              var initialValue = [exprElement(conditions[1])]
              conditions.slice(2).reduce(function (list, expr) {
                return list.concat(
                  operatorElement(conditions[0].toUpperCase()),
                  exprElement(expr)
                )
              }, initialValue).map(function ($innerDiv) {
                $div.append($innerDiv)
              })
              return $div
            }
            throw new Error('Error: invalid expression! (' + conditions + ')')
          }

          scope.$watch(function watchIt() {
            return scope.cscConditions.json
          }, function doIt() {
            var tree = makeTreeHTML(scope.cscConditions.json)
            element.html(rootElement().append(tree).prop('outerHTML'))
          }, true)
        }
      }
    }])
})()

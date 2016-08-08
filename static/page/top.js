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
      $ctrl.conditions = makeJsonInputText(
        ["AND",
          ["OR",
            {id: 1, value: "A"},
            {id: 2, value: "B"},
            {id: 3, value: "C"}
          ],
          {id: 4, value: "D"}
        ]
      )
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
      '$window',
      function cscConditions($window) {
        return {
          restrict: 'A',
          scope: {
            cscConditions: '='
          },
          link: function (scope, element, attr) {
            function exprElement(expr) {
              var $expr = angular.element('<div class="condition-expr col-sm-12"></div>')
              if (angular.isArray(expr)) {
                $expr.append(makeTreeHTML(expr))
              } else if (angular.isObject(expr) && angular.isNumber(expr.id)) {
                var $el = angular.element(
                  `<div class='input-group'>
                    <input type='text' value='${expr.value}' class='form-control'
                    data-expr-input-id='${expr.id}' id='expr-input-${expr.id}' aria-describedby='expr-addon-${expr.id}'>
                    <span class='input-group-addon' id='expr-addon-${expr.id}'><i class='glyphicon glyphicon-remove'></i></span>
                  </div>`
                )
                $expr.append($el)
              } else {
                throw new Error('invalid expression! (' + angular.toJson(expr) + ')')
              }
              return $expr
            }
            function operatorElement(op) {
              return angular.element('<div class="col-sm-12 text-center condition-operator"></div>')
                            .text(op)
            }
            function conditionElement(op) {
              return angular.element(
                '<div class="row condition condition-' + op + '"></div>'
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
              if (conditions[0] === 'OR' || conditions[0] === 'AND') {
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

                var $div = conditionElement(conditions[0].toLowerCase())
                var initialValue = [exprElement(conditions[1])]
                conditions.slice(2).reduce(function (list, expr) {
                  return list.concat(
                    operatorElement(conditions[0]),
                    exprElement(expr)
                  )
                }, initialValue).map(function ($innerDiv) {
                  $div.append($innerDiv)
                })
                return $div
              }
              throw new Error('Error: invalid expression! (' + conditions + ')')
            }
            function traverseById(expr, id, foundFn) {
              function traverseByIdLocal(expr) {
                if (angular.isObject(expr) && angular.isNumber(expr.id)) {
                  if (expr.id === id) {
                    foundFn(expr)
                  }
                } else if (angular.isArray(expr)) {
                  expr.slice(1).map(traverseByIdLocal)
                } else {
                  throw new Error('Error: invalid expression! (' + conditions + ')')
                }
              }
              traverseByIdLocal(expr)
            }

            scope.$watch(function watchIt() {
              return scope.cscConditions.json
            }, function doIt() {
              // (user inputs) -> scope.cscConditions.json
              element.bind('change', function (event) {
                var $input = angular.element(event.target)
                if (!/^expr-input-/.test($input.attr('id'))) {
                  return
                }
                scope.$apply(function () {
                  // Change condition in 'scope.cscConditions.json' specified by id.
                  var found = false
                  var id = +$input.attr('data-expr-input-id')
                  traverseById(
                    scope.cscConditions.json, id,
                    function found(expr) {
                      expr.value = $input.val()
                      found = true
                    }
                  )
                  if (!found) {
                    $window.alert('[Internal Error] Condition[id=' + id + '] was not found')
                  }
                })
              })
              // scope.cscConditions.json ->  (user inputs)
              var tree = makeTreeHTML(scope.cscConditions.json)
              element.html(rootElement().append(tree).prop('outerHTML'))
            }, true)
          }
        }
      }]
    )
})()

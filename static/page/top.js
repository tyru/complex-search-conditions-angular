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
        'searchService',
    function topCtrl(searchService) {
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
      $ctrl.conditions = undefined // see $ctrl.setDefault()
      $ctrl.alerts = []

      $ctrl.setDefault = function setDefault() {
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
      }
      $ctrl.setDefault()

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
      '$compile', '$window',
      function cscConditions($compile, $window) {
        return {
          restrict: 'A',
          scope: {},
          bindToController: {
            cscConditions: '='
          },
          controllerAs: '$ctrl',
          controller: function cscConditionsCtrl() {
            var $ctrl = this

            $ctrl.removeById = function removeById(id) {
              var found = false
              $ctrl.traverseById(
                $ctrl.cscConditions.json, id,
                function foundFn(expr, index, array, parentArray, parentIndex) {
                  if (array.length <= 2) {
                    if (angular.isUndefined(parentArray)) {
                      // Remove the last element of the root
                      $ctrl.cscConditions.json = []
                    } else {
                      // Remove the last element of current node
                      parentArray.splice(parentIndex, 1)
                    }
                  } else {
                    // Others
                    array.splice(index, 1)
                  }
                  found = true
                }
              )
              if (!found) {
                $window.alert('[Internal Error] Condition[id=' + id + '] was not found')
              }
            }

            // (user inputs) -> $ctrl.cscConditions.json
            $ctrl.updateExprByEvent = function updateExprByEvent($event) {
              var $input = angular.element($event.currentTarget)
              var found = false
              var id = +$input.attr('data-expr-input-id')
              $ctrl.traverseById(
                $ctrl.cscConditions.json, id,
                function foundFn(expr) {
                  expr.value = $input.val()
                  found = true
                }
              )
              if (!found) {
                $window.alert('[Internal Error] Condition[id=' + id + '] was not found')
              }
            }

            // Change condition in '$ctrl.cscConditions.json' specified by id.
            $ctrl.traverseById = function traverseById(expr, id, foundFn) {
              var parentArray = undefined
              var parentIndex = -1

              function traverseByIdLocal(expr, index, array) {
                if (index === 0) {
                  return    // Skip sexp operator
                } else if (angular.isObject(expr) && angular.isNumber(expr.id)) {
                  if (expr.id === id) {
                    foundFn(expr, index, array, parentArray, parentIndex)
                  }
                } else if (angular.isArray(expr)) {
                  parentArray = array
                  parentIndex = index
                  expr.map(traverseByIdLocal)
                } else {
                  throw new Error('Error: invalid expression! (' + conditions + ')')
                }
              }

              if (!angular.isArray(expr)) {
                throw new Error('Error: invalid expression! (' + conditions + ')')
              }
              expr.map(traverseByIdLocal)
            }
          },
          link: function (scope, element, attr, $ctrl) {
            function exprElement(expr) {
              var $expr = angular.element('<div class="condition-expr col-sm-12"></div>')
              if (angular.isArray(expr)) {
                if (expr.length === 0) {
                  throw new Error('exprElement() takes only non-empty sexp!')
                }
                $expr.append(makeTreeHTML(expr))
              } else if (angular.isObject(expr) && angular.isNumber(expr.id)) {
                var $el = angular.element(
                  `<div class='input-group'>
                    <input type='text' value='${expr.value}' class='form-control expr-input' id='expr-input-${expr.id}'
                           aria-describedby='expr-remove-${expr.id}'
                           data-expr-input-id='${expr.id}'
                           ng-blur='$ctrl.updateExprByEvent($event)'>
                    <span class='input-group-btn'>
                      <button class='btn btn-secondary' id='expr-remove-${expr.id}'
                              ng-click='$ctrl.removeById(${expr.id})'>
                        <i class='glyphicon glyphicon-remove'></i>
                      </button>
                    </span>
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
              if (conditions.length === 0) {
                throw new Error('makeTreeHTML() takes only non-empty sexp!')
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

            scope.$watch(function watchIt() {
              return $ctrl.cscConditions.json
            }, function doIt() {
              // $ctrl.cscConditions.json ->  <input> tags
              if (angular.isArray($ctrl.cscConditions.json) &&
                  $ctrl.cscConditions.json.length > 0) {
                var tree = makeTreeHTML($ctrl.cscConditions.json)
                element.html(rootElement().append(tree).prop('outerHTML'))
                $compile(element.contents())(scope);
              } else {
                element.empty()
              }
            }, true)
          }
        }
      }]
    )
})()

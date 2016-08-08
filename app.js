var express = require('express')
var app = express()

// Front-end (Angular)
app.use('/', express.static('static'))
app.use('/lib/angular', express.static('node_modules/angular'))
app.use('/lib/angular-route', express.static('node_modules/angular-route'))
app.use('/lib/angular-resource', express.static('node_modules/angular-resource'))
app.use('/lib/angular-animate', express.static('node_modules/angular-animate'))
app.use('/lib/angular-ui-bootstrap', express.static('node_modules/angular-ui-bootstrap/dist'))
app.use('/lib/bootstrap', express.static('node_modules/bootstrap/dist'))

// Back-end
app.get('/api/v1/search', function (req, res) {
  // TODO
  res.json({
    response: {
      status: 200
    },
    result: [
    ]
  })
})

var server; server = app.listen(8000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Listening at http://%s:%s', host, port)
})

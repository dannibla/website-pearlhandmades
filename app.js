const express = require('express');
const path = require('path');

var app = express();
var route = express.Router();
var baseUrl = '/node/website-pearlhandmades/';
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(baseUrl, express.static(path.join(__dirname, 'public')));

route.get('/home', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).render('_layout.ejs', {
        page: 'pages/_home.ejs',
        base: baseUrl
    });
});


route.get('/shop', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).render('_layout.ejs', {
        page: 'pages/_shop.ejs',
        base: baseUrl
    });
});

app.use(baseUrl, route);
app.listen(process.env.PORT);
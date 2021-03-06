const express = require('express');
const session = require('express-session');
const rateLimit = require("express-rate-limit");
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const { check, validationResult } = require('express-validator/check');
const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');

var sequelize = new Sequelize('postgres', 'postgres', 'postgres', {
    host: 'localhost',
    dialect: 'postgres'
});


var app = express();
var route = express.Router();
var baseUrl = '/node/website-pearlhandmades/';
var MemoryStore = session.MemoryStore;

app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(baseUrl, express.static(path.join(__dirname, 'public')));

app.use(cookieParser());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));

app.use(session({
    key: 'user_sid',
    secret: 'catchthecat',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore(),
    expires: new Date(Date.now() + (30 * 86400 * 1000)) 
}));

//  apply to all requests
app.use(rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 420 // limit each IP to 420 requests per windowMs
}));

app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});

var User = sequelize.define('users', {
    autoId: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, unique: true, allowNull: false, primaryKey: true },
    username: { type: Sequelize.STRING, unique: true, allowNull: false },
    email: { type: Sequelize.STRING, unique: true, allowNull: false },
    password: { type: Sequelize.STRING, allowNull: false }
}, {
    hooks: {
        beforeCreate: (user) => {
            const salt = bcrypt.genSaltSync();
            user.password = bcrypt.hashSync(user.password, salt);
        }
    }
});


var Feedback = sequelize.define('feedbacks', {
    autoId: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, unique: true, allowNull: false, primaryKey: true },
    name: { type: Sequelize.STRING, unique: true, allowNull: false },
    email: { type: Sequelize.STRING, unique: true, allowNull: false },
    subject: {type: Sequelize.STRING, unique: true, allowNull: false },
    message: {type: Sequelize.STRING, unique: true, allowNull: false }
});


sequelize.sync()
    .then(() => console.log('Tables has been successfully created !'))
    .catch(error => console.log('This error occured', error))

User.prototype.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password)
};

route.get('/', function(req, res) {
    res.redirect(baseUrl+'home');
});

route.get('/home', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).render('_layout.ejs', {
        page: 'pages/_home.ejs',
        base: baseUrl,
        user: req.session.user,
        alert: req.session.alert
    });
});


route.get('/shop', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).render('_layout.ejs', {
        page: 'pages/_shop.ejs',
        base: baseUrl,
        user: req.session.user,
        alert: req.session.alert
    });
});

route.get('/contact', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).render('_layout.ejs', {
        page: 'pages/_contact.ejs',
        base: baseUrl,
        user: req.session.user,
        alert: req.session.alert
    });
});

route.get('/login', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).render('_layout.ejs', {
        page: 'pages/_login.ejs',
        base: baseUrl,
        user: req.session.user,
        alert: req.session.alert
    });
});

route.get('/register', function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).render('_layout.ejs', {
        page: 'pages/_register.ejs',
        base: baseUrl,
        user: req.session.user,
        alert: req.session.alert
    });
});

route.post('/login', function(req, res) {
    User.findOne({
        where: Sequelize.or({ username: req.body.user }, { email: req.body.user })
    }).then(function(user) {
            if (!user || !user.validPassword(req.body.password)) {
                req.session.alert = [{ "msg": "Please check your username and password and try again." }]
                res.redirect(baseUrl + 'login');
            } else {
                req.session.user = user.dataValues;
                req.session.alert = [{ "msg": "Signed in successfully." }]
                res.redirect(baseUrl);
            }
        });
});

route.post('/contact', function(req, res) {
    if (req.body.name&&req.body.email&&req.body.subject&&req.body.message) {
        Feedback.create({
            name: req.body.name,
            email: req.body.email,
            subject: req.body.subject,
            message: req.body.message
        }).then(user => {
            req.session.alert = [{ "msg": "Successfully recived your message, will contact you in short time." }]
            res.redirect(baseUrl+'contact');
        }).catch(error => {
            res.redirect(baseUrl);
        });
    } else {
        res.redirect(baseUrl);
    }
});

route.post('/register',[
    check('username', 'Please enter valid username.')
    .matches(/^[a-z0-9]+$/, "i")
    .custom(value => {
        return User.findOne({
            where: { username: value }
        }).then(user => {
            if (user) {
                return Promise.reject('Username already exist, try another.');
            }
        });
    }),
    check('email', 'Please enter valid email id.')
    .isEmail()
    .custom(value => {
        return User.findOne({
            where: { email: value }
        }).then(user => {
            if (user) {
                return Promise.reject('E-mail already exist, try another.');
            }
        });
    }),
    check('password', 'Password must have atleast 6+ charaters.')
    .isLength({ min: 6, max: 24 })
], function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.alert = errors.array();
        res.redirect(baseUrl + 'register');
    } else {
        User.create({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password
        }).then(user => {
            req.session.alert = [{ "msg": "Registered successfully." }]
            req.session.user = user.dataValues;
            res.redirect(baseUrl+'home');
        })
    }
});

route.get('/logout', function(req, res) {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect(baseUrl);
    } else {
        res.redirect(baseUrl + 'login');
    }
});

app.use(baseUrl, route);
app.listen(process.env.PORT);
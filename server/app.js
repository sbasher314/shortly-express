const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const cookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(cookieParser);
app.use(Auth.createSession);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
  (req, res) => {
    Auth.verifySession(req, res)
      .then(() => {
        res.render('index');
      })
      .catch(() => res.redirect('/login'));
  });

app.get('/create',
  (req, res) => {
    Auth.verifySession(req, res)
      .then(() => {
        res.render('index');
      })
      .catch(() => res.redirect('/login'));
  });

app.get('/links',
  (req, res, next) => {
    Auth.verifySession(req, res)
      .then(() => {
        models.Links.getAll()
          .then(links => {
            res.status(200).send(links);
          })
          .error(error => {
            res.status(500).send(error);
          });
      })
      .catch(() => {
        res.redirect('/login');
      });

  });

app.post('/links',
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

let verifyFields = (username, password) => {
  return (username.length >= 4 && password.length >= 4 && username.length <= 32 && password.length <= 32);
};

app.get('/login', (req, res, next) => {
  res.render('login');
});

app.post('/login', (req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;
  if (verifyFields(username, password)) {
    models.Users.get({ username })
      .then(result => {
        if (result === undefined) {
          return Promise.reject('User not found');
        }
        let success = models.Users.compare(password, result.password, result.salt);
        if (success) {
          req.userId = result.id;
          return result;
        } else {
          return Promise.reject('Username or Password is incorrect');
        }
      })
      .then(success => {
        return Auth.assignSession(req, res);
      })
      .then(() => {
        console.log('response?');
        res.redirect('/');
      })
      .catch(err => {
        res.statusCode = 500;
        console.log(err);
        res.redirect('/login');
      });
  } else {
    res.statusCode = 500;
    console.log('username or password entered invalid');
    res.redirect('/login');
  }

});

app.post('/signup', (req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;
  if (verifyFields(username, password)) {
    models.Users.create({ username, password })
      .then(result => {
        req.userId = result.insertId;
        console.log('created user: ' + JSON.stringify(result));
        return Auth.assignSession(req, res);
      })
      .then(() => {
        res.redirect('/');
      })
      .catch(err => {
        console.error(err);
        res.statusCode = 409;
        res.redirect('/signup');
      });
  } else {
    res.statusCode = 409;
    res.redirect('/signup');
  }

});

app.get('/signup', (req, res, next) => {
  res.render('signup');
});

let logout = (req, res) => {
  Auth.logout(req, res)
    .then(() => {
      res.redirect('/login');
    });
};

app.get('/logout', (req, res, next) => {
  logout(req, res);
});

app.post('/logout', (req, res, next) => {
  logout(req, res);
});
/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;

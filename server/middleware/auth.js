const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next = () => {}) => {
  if (req.cookies === undefined || req.cookies['shortlyid'] === undefined) {
    return models.Sessions.create()
    .then(result => {
      return models.Sessions.get({ id: result.insertId });
    }).then(session => {
      req.session = session;
      req.cookies['shortlyid'] = session.hash;
      res.cookie('shortlyid', session.hash, { maxAge: 3600000})
      next();
      return Promise.resolve('Session Created');
    })
    .catch(err => console.log(err));
  }
  if (req.cookies['shortlyid'] !== undefined) {
    return models.Sessions.get({ hash: req.cookies['shortlyid'] })
      .then(session => {
        if (session !== undefined) {
          req.cookies['shortlyid'] = session.hash;
          req.session = session;
          next();
          return Promise.resolve('Session is valid');
        } else {
          console.log('invalid cookie, generating new session');
          req.cookies['shortlyid'] = undefined;
          res.clearCookie('shortlyid', { maxAge: 3600000});
          return module.exports.createSession(req, res, next);
        }
      });
  }
  console.log('Should not go here');
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

module.exports.assignSession = (req, res) => {
  if (req.cookies['shortlyid'] !== undefined && req?.cookies['shortlyid'].length > 0) {
    return models.Sessions.get({ hash: req.cookies['shortlyid'] })
      .then(session => {
        if (session !== undefined) {
          req.session = session;
          return session;
        } else {
          console.log('invalid cookie, generating new session');
          req.cookies['shortlyid'] = undefined;
          res.clearCookie('shortlyid', { maxAge: 3600000});
          return module.exports.createSession(req, res).then(module.exports.assignSession(req, res));
        }
      })
      .then(session => {
        return models.Sessions.update({id: session.id}, {userId: req.userId});
      })
  } else {
    return module.exports.createSession(req, res).then(module.exports.assignSession(req, res));
  }
}

module.exports.verifySession = (req, res) => {
  if (req.cookies['shortlyid'] !== undefined && req.cookies['shortlyid'].length > 0) {
    return models.Sessions.get({ hash: req.cookies['shortlyid'] })
      .then(session => {
        if (session.userId !== null) {
          return Promise.resolve('User is logged in');
        } else {
          return Promise.reject('Invalid session');
        }
      });
  } else {
    return Promise.reject('User not logged in');
  }
}

module.exports.logout = (req, res) => {
  if (req.cookies['shortlyid'] !== undefined && req.cookies['shortlyid'].length > 0) {
    return models.Sessions.get({ hash: req.cookies['shortlyid'] })
      .then(session => {
        if (session !== undefined) {
          req.cookies.shortlyid = undefined;
          res.clearCookie('shortlyid', { maxAge: 3600000});
          return session;
        } else {
          return Promise.reject('Session not found');
        }
      })
      .then(session => {
        return models.Sessions.delete({ hash: session.hash });
      })
  } else {
    return Promise.resolve('Session not found');
  }
}
const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  console.log('cookies', req.cookies);
  if (req.cookies['userhash'] !== undefined) {
    return models.Sessions.get({ hash: req.cookies['userhash'] })
      .then(session => {
        if (session?.userId === req.userId) {
          return Promise.resolve('User is logged in');
        } else {
          res.clearCookie('userhash', { maxAge: 86400});
          return Promise.reject('Invalid session');
        }
      });
  }
  return models.Sessions.create()
    .then(result => {
      return models.Sessions.update({ id: result.insertId }, { userId: req.userId})
        .then(() => result);
    }).then(result => {
      return models.Sessions.get({ id: result.insertId });
    }).then(session => {
      res.cookie('userhash', session.hash, { maxAge: 86400});
      res.end();
    })
    .catch(err => console.log(err));

  console.log('Created a new session');
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/


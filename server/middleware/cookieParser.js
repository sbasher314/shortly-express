const parseCookies = (req, res, next) => {
  /*let cookieObject = req.cookies;
  req.cookies = cookieObject;*/
  if (req.headers.cookie) {
    let cookies = req.headers.cookie.split(';');
    req.cookies = {};
    cookies.forEach(cookie => req.cookies[cookie.split('=')[0].trim()] = cookie.split('=')[1]?.trim());
  } else {
    req.cookies = {};
  }
  next();
};

module.exports = parseCookies;
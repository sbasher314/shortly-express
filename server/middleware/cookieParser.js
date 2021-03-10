const parseCookies = (req, res, next) => {
  /*let cookieObject = req.cookies;
  req.cookies = cookieObject;*/
  let cookies = req.headers.cookie.split(';');
  req.cookies = {};
  cookies.forEach(cookie => req.cookies[cookie.split('=')[0].trim()] = cookie.split('=')[1]?.trim());
  next();
};

module.exports = parseCookies;
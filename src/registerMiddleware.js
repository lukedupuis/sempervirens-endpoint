const registerMiddleware = ({
  app,
  middleware = [],
  isProd = false,
  isMultiSite = false,
  domain = ''
}) => {
  middleware.forEach(({
    path: p1,
    handler
  }) => {
    const handle = (req, res, next) => {
      req.isSite === false ? next() : handler(req, res, next);
    };

    if (p1) {
      const [ method, p2 ] = p1.split(' ');
      const p3 = p2.charAt(0) == '/' ? p2 : `/${p2}`;

      if (isProd || !isMultiSite) {
        app[method.toLowerCase()](p3, handle);

      } else {
        const p4 = `/${domain}${p3}`;
        app[method.toLowerCase()](p4, handle);

      }
    } else {
      app.use(handle);
    }
  });
};

export default registerMiddleware;
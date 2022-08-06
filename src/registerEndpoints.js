const registerEndpoints = ({
  app,
  endpoints = [],
  data: siteData = {},
  isProd = false,
  isMultiSite = false,
  domain = ''
}) => {
  endpoints.forEach(({
    path: p1,
    handler,
    data: endpointData = {},
    isSecure
  }) => {
    const data = { ...siteData, ...endpointData };
    const handle = (req, res, next) => {
      if (req.isSite === false) {
        next();
      } else if (handler.toString().substring(0, 5) == 'class') {
        new handler({ req, res, isSecure, data });
      } else {
        handler({ req, res, isSecure, data });
      }
    };

    const [ method, p2 ] = p1.split(' ');
    const p3 = p2.charAt(0) == '/' ? p2 : `/${p2}`;

    if (isProd || !isMultiSite) {
      app[method.toLowerCase()](p3, handle);

    } else {
      const p4 = `/${domain}${p3}`;
      app[method.toLowerCase()](p4, handle);

    }
  });
}

export default registerEndpoints;
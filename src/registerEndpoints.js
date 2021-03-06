const registerEndpoints = ({
  app,
  endpoints = [],
  data: siteData = {}
}) => {
  endpoints.forEach(endpoint => {
    const { handler, data: endpointData = {}, isSecure } = endpoint;
    const data = { ...siteData, ...endpointData };
    const [ method, path ] = endpoint.path.split(' ');
    const _path = `*${path.charAt(0) == '/' ? path : `/${path}`}`;
    app[method.toLowerCase()](_path, (req, res, next) => {
      if (req.isSite === false) {
        next();
      } else if (handler.toString().substring(0, 5) == 'class') {
        new handler({ req, res, isSecure, data });
      } else {
        handler({ req, res, isSecure, data });
      }
    });
  });
}

export default registerEndpoints;
const registerEndpoints = ({
  app,
  endpoints
}) => {
  endpoints.forEach(endpoint => {
    const { handler, isSecure } = endpoint;
    const [ method, path ] = endpoint.path.split(' ');
    const _path = `*${path.charAt(0) == '/' ? path : `/${path}`}`;
    app[method.toLowerCase()](_path, (req, res, next) => {
      if (req.isSite === false) {
        next();
      } else if (handler.toString().substring(0, 5) == 'class') {
        new handler({ req, res, isSecure });
      } else {
        handler({ req, res, isSecure });
      }
    });
  });
}

export default registerEndpoints;
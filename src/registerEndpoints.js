const registerEndpoints = ({
  app,
  endpoints
}) => {
  endpoints.forEach(endpoint => {
    const { isSecure, handler } = endpoint;
    let method = endpoint.method?.toLowerCase();
    let path;
    if (method) {
      path = endpoint.path;
    } else {
      const parts = endpoint.path.split(' ');
      method = parts[0].toLowerCase();
      path = parts[1];
    }
    if (!path.charAt(0) == '/') path = `/${path}`;
    app[method.toLowerCase()](`*${path}`, (req, res, next) => {
      if (req.isSite === false) {
        next();
      } else {
        new handler({ req, res, isSecure });
      }
    });
  });
}

export default registerEndpoints;
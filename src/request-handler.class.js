import authorizer from '@sempervirens/authorizer';
import { timestamp } from '@sempervirens/tools';

import ErrorCodes from './error-codes.enum.js';

class RequestHandler {

  #hasError;
  req;
  res;
  data;
  isAuthorized = true;

  constructor({
    req,
    res,
    data = {},
    isSecure = false
  }) {
    this.#hasError = false;
    this.req = req;
    this.res = res;
    this.data = data;
    isSecure && this.#authorize();
  }

  #authorize() {
    if (!authorizer.isAuthorized(this.req)) {
      this.isAuthorized = false;
      authorizer.sendUnauthorized(this.res);
    }
  }

  send({
    message = 'Success',
    data = {}
  } = {
    message: 'Success',
    data: {}
  }) {
    if (this.#hasError || this.res.headersSent) return;
    this.res.status(200).json({ message, data });
  }

  error({
    number = null,
    error = null,
    code = ErrorCodes.SCRIPT_ERROR,
    suppressLog = false,
    status = 500
  }) {

    if (this.#hasError || this.res.headersSent) return;
    this.#hasError = true;

    if (error.message.includes('USER_ERROR:')) {
      code = ErrorCodes.USER_ERROR;
      error.message = error.message.replace('USER_ERROR:', '').trim();
    }

    let sendMessage = false;
    if (code == ErrorCodes.USER_ERROR) {
      sendMessage = true;
      suppressLog = true;
      status = 200;
    }

    if (!suppressLog) console.error(timestamp(), number, error);

    this.res.status(status).send({
      error: {
        number,
        code,
        message: sendMessage ? error.message : 'Server error'
      }
    });

  }

}

export default RequestHandler;
import { expect } from 'chai';
import express from 'express';
import superagent from 'superagent';
import http from 'http';
import authorizer from '@sempervirens/authorizer';
import { readFileSync } from 'fs';

import { RequestHandler, ErrorCodes, registerEndpoints } from '../index.js';

const jwtPublicKey = readFileSync('./security/jwt/jwtRS256.key.pub', 'utf8');
const jwtPrivateKey = readFileSync('./security/jwt/jwtRS256.key', 'utf8');

authorizer.init({ jwtPublicKey, jwtPrivateKey });

let performedAction = false;

class Test1RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.res.send('Success');
  }
}
class Test2RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.res.json(this.data);
  }
}
class Test3RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.send({
      message: 'Test 3 message',
      data: { prop1: 'val1', prop2: 'val2' }
    });
  }
}
class Test4RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.send();
  }
}
class Test5RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.error({
      number: 104020,
      error: new Error('Test 6 error')
    });
  }
}
class Test6RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#init();
  }
  #init() {
    this.error({
      number: 345673,
      error: new Error('Test 6 error'),
      code: ErrorCodes.USER_ERROR
    });
  }
}
class Test7RequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    if (!this.isAuthorized) return;
    this.#init();
  }
  #init() {
    performedAction = true;
    this.send({
      message: 'Test message 7',
      data: { prop1: 'val1', prop2: 'val2' }
   });
  }
}

const endpoints = [
  {
    path: 'GET api/test-1',
    handler: Test1RequestHandler
  },
  {
    path: 'GET api/test-2',
    handler: Test2RequestHandler,
    data: { prop1: 'val1' }
  },
  {
    path: 'GET /api/test-3',
    handler: Test3RequestHandler
  },
  {
    path: 'GET /api/test-4',
    handler: Test4RequestHandler
  },
  {
    path: 'GET /api/test-5',
    handler: Test5RequestHandler
  },
  {
    path: 'GET /api/test-6',
    handler: Test6RequestHandler
  },
  {
    path: 'GET /api/test-7',
    handler: Test7RequestHandler,
    isSecure: true
  },
];

const app = express();

describe('1. Endpoint', () => {
  // return;

  describe('1.1. When "registerEndpoints" is called', () => {
    // return;

    registerEndpoints({ app, endpoints });
    http.createServer(app).listen(8080);

    it('1.1.1. Should register the endpoints on the Express app', async () => {
      const { text } = await superagent.get('http://localhost:8080/api/test-1');
      expect(text).to.equal('Success');
    });

    describe('1.1.2. When "data" is passed in the endpoint', () => {
      it('1.1.2.1. Should make the data available to the request handler', async () => {
        const { body } = await superagent.get('http://localhost:8080/api/test-2');
        expect(body).to.deep.equal({ prop1: 'val1' });
      });
    });
  });

  describe('1.2. When non-secure endpoint is called', () => {
    // return;

    describe('1.2.1. When a response is returned with the Express response object send() function', () => {
      // return;
      it('1.2.1.1. Should return a text value', async () => {
        const { text } = await superagent.get('http://localhost:8080/api/test-1');
        expect(text).to.equal('Success');
      });
    });

    describe('1.2.2. When a response is returned with the RequestHandler send function', () => {
      // return;
      it('1.2.2.1. Should take "message" and "data" and return a standardized JSON object as "body"', async () => {
        const { body: { message, data, error } } = await superagent.get('http://localhost:8080/api/test-3');
        expect(message).to.equal('Test 3 message');
        expect(data).to.deep.equal({ prop1: 'val1', prop2: 'val2' });
        expect(error).to.be.undefined;
      });

      describe('1.2.2.1. When "send" is called without any parameters', () => {
        it('1.2.2.1.1. Should send a standardized response', async () => {
          const { body: { message, data, error } } = await superagent.get('http://localhost:8080/api/test-4');
          expect(message).to.equal('Success');
          expect(data).to.deep.equal({});
          expect(error).to.be.undefined;
        });
      });
    });

    describe('1.2.3. When a response is returned with the RequestHandler error function', () => {
      // return;

      describe('1.2.3.1. When "number" and "message" are specified, and "code" is not specified', () => {
        // return;
        it('1.2.3.1.1 Should return a standardized JSON object as "body" with a generic error message', async () => {
          console.error = () => null;
          try {
            await superagent.get('http://localhost:8080/api/test-5')
          } catch({ status, response: { text } }) {
            expect(status).to.equal(500);
            expect(text).to.include('"code":"SCRIPT_ERROR"')
            expect(text).to.include('"message":"Server error"');
          }
        });
      });

      describe('1.2.3.2 When "number" and "message" are specified, and "code" is "ErrorCodes.USER_ERROR"', () => {
        // return;
        it('1.2.3.2.1 Should return standardized JSON object as "body" with the error message', async () => {
          console.error = () => null;
          const { body } = await superagent.get('http://localhost:8080/api/test-6');
          expect(true).to.be.true;
          expect(body).to.deep.equal({
            error: {
              number: 345673,
              code: 'USER_ERROR',
              message: 'Test 6 error'
            }
          });
        });
      });

    });

  });

  describe('1.3. When a secure endpoint is called', () => {
    // return;

    describe('1.3.1. When an authorization token is not provided', () => {
      // return;
      it('1.3.1.1. Should return 401 Unauthorized response', async () => {
        try {
          await superagent.get('http://localhost:8080/api/test-7');
        } catch({ status, message }) {
          expect(status).to.equal(401);
          expect(message).to.equal('Unauthorized');
        }
      });

      it('1.3.1.2. Should not perform the endpoint action', async () => {
        performedAction = false;
        try {
          await superagent.get('http://localhost:8080/api/test-7');
        } catch({ status, message }) {
          expect(performedAction).to.be.false;
        }
      });
    });

    describe('1.3.2. When an invalid authorization token is provided', () => {
      // return;
      it('1.3.2.1. Should return 401 Unauthorized response', async () => {
        try {
          await superagent
            .get('http://localhost:8080/api/test-7')
            .set('Authorization', 'Bearer token');
        } catch({ status, message }) {
          expect(status).to.equal(401);
          expect(message).to.equal('Unauthorized');
        }
      });

      it('1.3.2.2. Should not perform the endpoint action', async () => {
        performedAction = false;
        try {
          await superagent
            .get('http://localhost:8080/api/test-7')
            .set('Authorization', 'Bearer token');
        } catch({ status, message }) {
          expect(performedAction).to.be.false;
        }
      });
    });

    describe('1.3.3. When a valid authorization token is provided', () => {
      // return;
      it('1.3.3.1. Should return a standardized JSON object as "body"', async () => {
        const token = authorizer.encrypt({ expiresIn: '1m', data: { test: 1 } });
        const { body } = await superagent
          .get('http://localhost:8080/api/test-7')
          .set('Authorization', `Bearer ${token}`);
        expect(body).to.deep.equal({
          message: 'Test message 7',
          data: { prop1: 'val1', prop2: 'val2' }
        });
      });
    });

  });

  after(() => setTimeout(() => process.exit(), 100));

});

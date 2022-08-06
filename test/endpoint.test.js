import { expect } from 'chai';
import express from 'express';
import superagent from 'superagent';
import authorizer from '@sempervirens/authorizer';
import { startServer, stopServer } from '@sempervirens/tools';
import { readFileSync } from 'fs';

import {
  RequestHandler,
  ErrorCodes,
  registerEndpoints,
  registerMiddleware
} from '../index.js';

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
  }
];

const middleware = [
  {
    path: 'GET /api/test-1',
    handler: (req, res, next) => {
      res.set('Custom-Header-1', 'Custom header 1 value');
      next();
    }
  },
  {
    handler: (req, res, next) => {
      res.set('Custom-Header-2', 'Custom header 2 value');
      next();
    }
  }
];

describe('1. Endpoint', () => {

  describe('1.1. When "registerEndpoints" is called', () => {

    describe('1.1.1. When called with only "app" and "endpoints"', () => {
      it('1.1.1.1. Should register the endpoints on the app', async () => {
        const app = express();
        registerEndpoints({ app, endpoints });
        const serverId = startServer({ app, port: 8080 });

        const { text } = await superagent.get('http://localhost:8080/api/test-1');
        expect(text).to.equal('Success');

        await stopServer(serverId);
      });
    });

    describe('1.1.2. When "data" is passed to the endpoint', () => {
      it('1.1.2.1. Should make the data available to the request handler', async () => {
        const app = express();
        registerEndpoints({ app, endpoints });
        const serverId = startServer({ app, port: 8080 });

        const { body } = await superagent.get('http://localhost:8080/api/test-2');
        expect(body).to.deep.equal({ prop1: 'val1' });

        await stopServer(serverId);
      });
    });

    describe('1.1.3. When non-secure endpoint is called', () => {

      let serverId;
      before(() => {
        const app = express();
        registerEndpoints({ app, endpoints });
        serverId = startServer({ app, port: 8080 });
      });

      describe('1.1.3.1. When a response is returned with the Express response object send() function', () => {
        it('1.1.3.1.1. Should return a text value', async () => {
          const { text } = await superagent.get('http://localhost:8080/api/test-1');
          expect(text).to.equal('Success');
        });
      });

      describe('1.1.3.2. When a response is returned with the RequestHandler send function', () => {
        it('1.1.3.2.1. Should take "message" and "data" and return a standardized JSON object as "body"', async () => {
          const { body: { message, data, error } } = await superagent.get('http://localhost:8080/api/test-3');
          expect(message).to.equal('Test 3 message');
          expect(data).to.deep.equal({ prop1: 'val1', prop2: 'val2' });
          expect(error).to.be.undefined;
        });

        describe('1.1.3.3. When "send" is called without any parameters', () => {
          it('1.1.3.3.1. Should send a standardized response', async () => {
            const { body: { message, data, error } } = await superagent.get('http://localhost:8080/api/test-4');
            expect(message).to.equal('Success');
            expect(data).to.deep.equal({});
            expect(error).to.be.undefined;
          });
        });
      });

      describe('1.1.3.3. When a response is returned with the RequestHandler error function', () => {

        describe('1.1.3.3.1. When "number" and "message" are specified, and "code" is not specified', () => {
          it('1.1.3.3.1.1. Should return a standardized JSON object as "body" with a generic error message', async () => {
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

        describe('1.1.3.3.2. When "number" and "message" are specified, and "code" is "ErrorCodes.USER_ERROR"', () => {
          it('1.1.3.3.2.1. Should return standardized JSON object as "body" with the error message', async () => {
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

      after(async () => await stopServer(serverId));

    });

    describe('1.1.4. When a secure endpoint is called', () => {

      let serverId;
      before(() => {
        const app = express();
        registerEndpoints({ app, endpoints });
        serverId = startServer({ app, port: 8080 });
      });

      describe('1.1.4.1. When an authorization token is not provided', () => {
        it('1.1.4.1.1. Should return 401 Unauthorized response', async () => {
          try {
            await superagent.get('http://localhost:8080/api/test-7');
          } catch({ status, message }) {
            expect(status).to.equal(401);
            expect(message).to.equal('Unauthorized');
          }
        });

        it('1.1.4.1.2. Should not perform the endpoint action', async () => {
          performedAction = false;
          try {
            await superagent.get('http://localhost:8080/api/test-7');
          } catch({ status, message }) {
            expect(performedAction).to.be.false;
          }
        });
      });

      describe('1.1.4.2. When an invalid authorization token is provided', () => {
        it('1.1.4.2.1. Should return 401 Unauthorized response', async () => {
          try {
            await superagent
              .get('http://localhost:8080/api/test-7')
              .set('Authorization', 'Bearer token');
          } catch({ status, message }) {
            expect(status).to.equal(401);
            expect(message).to.equal('Unauthorized');
          }
        });

        it('1.1.4.2.2. Should not perform the endpoint action', async () => {
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

      describe('1.1.4.3. When a valid authorization token is provided', () => {
        it('1.1.4.3.1. Should return a standardized JSON object as "body"', async () => {
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

      after(async () => await stopServer(serverId));

    });

    describe('1.1.5. When called with "isProd" and/or "isMultiSite"', () => {

      describe('1.1.5.1. When "isProd" is falsey and "isMultiSite" is falsey', () => {
        it('1.1.5.1.1. Should register the endpoints at "http://localhost{:port}/{path}"', async () => {
          const app = express();
          registerEndpoints({ app, endpoints });
          const serverId = startServer({ app, port: 8080 });

          const { text } = await superagent.get('http://localhost:8080/api/test-1');
          expect(text).to.equal('Success');

          await stopServer(serverId);
        });
      });

      describe('1.1.5.2. When "isProd" is "true" and "isMultiSite" is falsey', () => {
        it('1.1.5.2.1. Should register the endpoints at "http(s)://{domain}/{path}"', async () => {
          const app = express();
          registerEndpoints({ app, endpoints, isProd: true });
          const serverId = startServer({ app, port: 8080 });

          const { text } = await superagent.get('http://localhost:8080/api/test-1');
          expect(text).to.equal('Success');

          await stopServer(serverId);
        });
      });

      describe('1.1.5.3. When "isProd" is "true" and "isMultiSite" is "true"', () => {
        it('1.1.5.3.1. Should register the endpoints at "http(s)://{domain}/{path}"', async () => {
          const app = express();
          registerEndpoints({ app, endpoints, isProd: true, isMultiSite: true });
          const serverId = startServer({ app, port: 8080 });

          const { text } = await superagent.get('http://localhost:8080/api/test-1');
          expect(text).to.equal('Success');

          await stopServer(serverId);
        });
      });

      describe('1.1.5.4. When "isProd" is falsey and "isMultiSite" is "true"', () => {
        it('1.1.5.4.1. Should register the endpoints at "http://localhost{:port}/{domain}/{path}"', async () => {
          const app = express();
          registerEndpoints({ app, endpoints, isMultiSite: true, domain: 'site-1' });
          const serverId = startServer({ app, port: 8080 });

          const { text: t1 } = await superagent.get('http://localhost:8080/site-1/api/test-1');
          expect(t1).to.equal('Success');

          const { body: b1 } = await superagent.get('http://localhost:8080/site-1/api/test-2');
          expect(b1).to.deep.equal({ prop1: 'val1' });

          const { body: b2 } = await superagent.get('http://localhost:8080/site-1/api/test-3');
          expect(b2).to.deep.equal({
            message: 'Test 3 message',
            data: { prop1: 'val1', prop2: 'val2' }
          });

          await stopServer(serverId);
        });
      });

    });

  });

  describe('1.2. When "registerMiddleware" is called', () => {

    describe('1.2.1. When called with only "app" and "middleware"', () => {

      describe('1.2.1.1. When "path" is passed to the middleware', () => {
        it('1.2.1.1.1. Should apply the middleware only to the specified path', async () => {
          const app = express();
          registerMiddleware({ app, middleware });
          registerEndpoints({ app, endpoints });
          const serverId = startServer({ app, port: 8080 });

          const { text: t1, headers: h1 } = await superagent.get('http://localhost:8080/api/test-1');
          expect(t1).to.equal('Success');
          expect(h1['custom-header-1']).to.equal('Custom header 1 value');

          const { body: b1, headers: h2 } = await superagent.get('http://localhost:8080/api/test-2');
          expect(b1).to.deep.equal({ prop1: 'val1' });
          expect(h2['custom-header-1']).not.to.exist;

          stopServer(serverId);
        });
      });

      describe('1.2.1.2. When "path" is not passed to the middleware', () => {
        it('1.2.1.2.1. Should apply the middleware all paths', async () => {
          const app = express();
          registerMiddleware({ app, middleware });
          registerEndpoints({ app, endpoints });
          const serverId = startServer({ app, port: 8080 });

          const { text: t1, headers: h1 } = await superagent.get('http://localhost:8080/api/test-1');
          expect(t1).to.equal('Success');
          expect(h1['custom-header-2']).to.equal('Custom header 2 value');

          const { body: b1, headers: h2 } = await superagent.get('http://localhost:8080/api/test-2');
          expect(b1).to.deep.equal({ prop1: 'val1' });
          expect(h2['custom-header-2']).to.equal('Custom header 2 value');

          stopServer(serverId);
        });
      });

    });

    describe('1.2.2. When called with "isProd" and/or "isMultiSite"', () => {

      describe('1.2.2.1. When "isProd" is falsey and "isMultiSite" is falsey', () => {
        it('1.2.2.1.1. Should apply the middleware to "http://localhost{:port}/{path}', async () => {
          const app = express();
          registerMiddleware({ app, middleware });
          registerEndpoints({ app, endpoints });
          const serverId = startServer({ app, port: 8080 });

          const { text: t1, headers: h1 } = await superagent.get('http://localhost:8080/api/test-1');
          expect(t1).to.equal('Success');
          expect(h1['custom-header-1']).to.equal('Custom header 1 value');

          const { body: b1, headers: h2 } = await superagent.get('http://localhost:8080/api/test-2');
          expect(b1).to.deep.equal({ prop1: 'val1' });
          expect(h2['custom-header-1']).not.to.exist;

          stopServer(serverId);
        });
      });

      describe('1.2.2.2. When "isProd" is "true" and "isMultiSite" is falsey', () => {
        it('1.2.2.2.1. Should apply the middleware to "http(s)://{domain}/{path}"', async () => {
          const app = express();
          registerMiddleware({ app, middleware, isProd: true });
          registerEndpoints({ app, endpoints, isProd: true });
          const serverId = startServer({ app, port: 8080 });

          const { text: t1, headers: h1 } = await superagent.get('http://localhost:8080/api/test-1');
          expect(t1).to.equal('Success');
          expect(h1['custom-header-1']).to.equal('Custom header 1 value');

          const { body: b1, headers: h2 } = await superagent.get('http://localhost:8080/api/test-2');
          expect(b1).to.deep.equal({ prop1: 'val1' });
          expect(h2['custom-header-1']).not.to.exist;

          stopServer(serverId);
        });
      });

      describe('1.2.2.3. When "isProd" is "true" and "isMultiSite" is "true"', () => {
        it('1.2.2.3.1. Should apply the middleware to "http(s)://{domain}/{path}"', async () => {
          const app = express();
          registerMiddleware({ app, middleware, isProd: true, isMultiSite: true });
          registerEndpoints({ app, endpoints, isProd: true, isMultiSite: true });
          const serverId = startServer({ app, port: 8080 });

          const { text: t1, headers: h1 } = await superagent.get('http://localhost:8080/api/test-1');
          expect(t1).to.equal('Success');
          expect(h1['custom-header-1']).to.equal('Custom header 1 value');

          const { body: b1, headers: h2 } = await superagent.get('http://localhost:8080/api/test-2');
          expect(b1).to.deep.equal({ prop1: 'val1' });
          expect(h2['custom-header-1']).not.to.exist;

          stopServer(serverId);
        });
      });

      describe('1.2.2.4. When "isProd" is falsey and "isMultiSite" is "true"', () => {
        it('1.2.2.4.1. Should apply the middleware to "http://localhost{:port}/{domain}/{path}"', async () => {
          const app = express();
          registerMiddleware({ app, middleware, isMultiSite: true, domain: 'site-1' });
          registerEndpoints({ app, endpoints, isMultiSite: true, domain: 'site-1' });
          const serverId = startServer({ app, port: 8080 });

          const { text: t1, headers: h1 } = await superagent.get('http://localhost:8080/site-1/api/test-1');
          expect(t1).to.equal('Success');
          expect(h1['custom-header-1']).to.equal('Custom header 1 value');

          const { body: b1, headers: h2 } = await superagent.get('http://localhost:8080/site-1/api/test-2');
          expect(b1).to.deep.equal({ prop1: 'val1' });
          expect(h2['custom-header-1']).not.to.exist;

          stopServer(serverId);
        });
      });

    });

  });

  after(() => setTimeout(() => process.exit(), 100));

});
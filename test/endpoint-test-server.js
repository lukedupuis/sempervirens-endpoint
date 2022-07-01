import express from 'express';
import http from 'http';
// import { registerEndpoints, RequestHandler } from '@sempervirens/endpoint';
import { registerEndpoints, RequestHandler } from '../index.js';

// Recommended usage
class Test1RequestHandler extends RequestHandler {
  constructor({ req, res, isSecure }) {
    super({ req, res, isSecure });
    this.#init();
  }
  #init() {
    this.res.send('Success');
  }
}

const endpoints = [
  {
    path: 'GET /api/test-1',
    handler: Test1RequestHandler
  }
];

const app = express();
registerEndpoints(app, endpoints);
http.createServer(app).listen(80, () => console.log('Listening'));
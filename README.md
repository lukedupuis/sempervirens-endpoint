# Sempervirens Endpoint

Middleware for handling Express routes, it provides an organized way to register multiple Express endpoints, an extendable class for isolating endpoint functionality, standardization for sending success and error objects, and built-in authorization with minimal JWT configuration.

![Tests badge](https://github.com/lukedupuis/sempervirens-endpoint/actions/workflows/main.yml/badge.svg?event=push) ![Version badge](https://img.shields.io/static/v1?label=Node&labelColor=30363c&message=16.x&color=blue)

## Installation

`npm install @sempervirens/endpoint`

## Usage

The following steps provide minimal usage. It is recommneded to have separate files for each `RequestHandler` instance, and a separate `endpoints` file that imports the `RequestHandler` instances and exports an array of endpoint configurations. Also, while `@sempervirens/endpoint` may be used independently, or in conjunction with <a href="https://www.npmjs.com/package/@sempervirens/site-loader">`@sempervirens/site-loader`</a>, implementation of both is integrated and streamlined in <a href="https://www.npmjs.com/package/@sempervirens/server">`@sempervirens/server`</a>.

### Non-secure Endpoints

1. Import `express` and Node `http` (or use <a href="https://www.npmjs.com/package/@sempervirens/server">`@sempervirens/server`</a>).

2. Import `registerEndpoints` and `RequestHandler` from `@sempervirens/endpoint`.

3. Create request handlers.

4. Create an array of endpoint configurations.

5. Create an Express app.

6. Register the endpoints with the app.

7. Start the server.

```
import express from 'express';
import http from 'http';

import { registerEndpoints, RequestHandler } from '@sempervirens/endpoint';

// Recommended usage, in a separate file
class TestRequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    if (!this.isAuthorized) return;
    this.#init();
  }
  #init() {
    console.log(this.data);
    // -> { prop1: 'val1' }
    this.res.send('Success');
  }
}

// In another separate file
const endpoints = [
  {
    path: 'GET /api/test',
    handler: TestRequestHandler
    data: { prop1: 'val1' } // Passed into RequestHandler constructor
  }
];

const app = express();
registerEndpoints(app, endpoints);
http.createServer(app).listen(80, () => console.log('Listening'));
```

### Secure Endpoints

Passing `isSecure` to the endpoint configuration secures the endpoint by requiring a `Authorization Bearer ${token}` header to be passed in the request. See <a href="https://www.npmjs.com/package/@sempervirens/authorizer">`@sempervirens/authorizer`</a> or <a href="https://www.npmjs.com/package/@sempervirens/server">`@sempervirens/server`</a> for details.

1. Import `express` and Node `http`.

2. Import `registerEndpoints` and `RequestHandler` from `@sempervirens/endpoint`.

3. Import <a href="https://www.npmjs.com/package/@sempervirens/authorizer">`@sempervirens/authorizer`</a>.

4. Initialize `authorizer`;

5. Create request handlers.

6. Create a set of endpoint configurations.

7. Create an Express app.

8. Register the endpoints with the app.

9. Start the server.

```
import express from 'express';
import http from 'http';
import authorizer from '@sempervirens/authorizer';
import { registerEndpoints, RequestHandler } from '@sempervirens/endpoint';

// See @sempervirens/authorizer or @sempervirens/server for details
const jwtPublicKey = readFileSync('./security/jwt/jwtRS256.key.pub', 'utf8');
const jwtPrivateKey = readFileSync('./security/jwt/jwtRS256.key', 'utf8');
authorizer.init({ jwtPublicKey, jwtPrivateKey });

// Recommended usage, in a separate file
class TestRequestHandler extends RequestHandler {
  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    if (!this.isAuthorized) return;
    this.#init();
  }
  #init() {
    this.res.send('Success');
  }
}

// In another separate file
const endpoints = [
  {
    path: 'GET /api/test',
    handler: TestRequestHandler,
    isSecure: true
  }
];

const app = express();
registerEndpoints(app, endpoints);
http.createServer(app).listen(80, () => console.log('Listening'));
```

## API

### registerEndpoints (single function)

| Prop  | Type | Params | Description |
|-------|------|--------|-------------|
| `registerEndpoints` | function | `app: Express app, endpoints: { path: string, handler: RequestHandler, data: object, isSecure: boolean }` | Registers the endpoints on the Express app. |

### ErrorCodes (enum)

| Prop  | Type | Params | Description |
|-------|------|--------|-------------|
| `SCRIPT_ERROR` | string | n/a | Default error `code` for `RequestHandler error()`, it sends a generic `Server error` message to the client. |
| `USER_ERROR` | string | n/a | When specified as the `code` in `RequestHandler error()`, it sends the error message given in `error: new Error('Message')` to the client. |

### RequestHandler (class)
| Prop  | Type | Params | Description |
|-------|------|--------|-------------|
| `constructor` | function | `{ req: Express request, res: Express response, data: {}, isSecure: boolean }` | The main entry point that is called when the Express route is invoked. If `data` is given, it provides the data to all instances as `this.data`, and if the `RequestHandler` is of a `SiteLoader` instance, both `data` parameters are merged with the `RequestHandler` set taking precedence if they have any of the same properties. |
| `send` | function | `{ message: string, data: object }` | Sends a standardized response to the client with a `message` and `data` object. It only sends if an error has not occurred and if a message has not already been sent. |
| `error` | function | `{ number: number, error: Error, code: ErrorCodes, suppressLog: boolean, status: number }` | Sends a standardized `error` object to the client. Typically only `number` and `error` are needed. If `code` is `USER_ERROR`, then it sends the message for the given `error`; otherwise, it sends a generic `Server error` message. It also logs to the server console, which provides server-side logging. Status may also be specified, but usally a soft `200` with an `error` object is sufficient so as not to throw a hard HTTP error in the browser console. |part
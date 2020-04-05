[![npm version](https://badge.fury.io/js/%40aws-lambda%2Fflow.svg)](https://badge.fury.io/js/%40aws-lambda%2Fflow)
[![Build Status](https://travis-ci.org/bravecloud/aws-lambda-flow.svg?branch=master)](https://travis-ci.org/bravecloud/aws-lambda-flow)
[![Coverage Status](https://coveralls.io/repos/github/bravecloud/aws-lambda-flow/badge.svg?branch=master)](https://coveralls.io/github/bravecloud/aws-lambda-flow?branch=master)


# @aws-lambda/flow

A module for simplifying development with aws lambda by providing a pattern for modularizing the pre-processing that typically takes place before core business logic is executed (e.g. initialization, authentication/authorization, http header injection...etc.)

## Installation and Usage

Prerequisites: [Node.js](https://nodejs.org/) `>=6.0.0`, npm version 3+.

You can install the http module using npm:

```
$ npm install @aws-lambda/flow --save
```

### Basic Flow

The following example shows a lambda flow that adds two handlers before executing the main business logic of the lambda function.  This illustrates how one can succinctly reuse common pre-tasks like loading a configuration or publishing a cloudwatch metric:
```javascript
'use strict';

const Flow = require("@aws-lambda/flow").HTTPFlow;

module.exports.basic = (event, context, callback) => {
  // instantiate new flow object with lambda parameters
  let basicFlow = new Flow(event, context, callback);

  // add common functionality that always occurs before the core business logic
  // (these are fictional handlers used for illustrative purposes)
  basicFlow.add(configLoader);
  basicFlow.add(cloudWatchReporter)

  // add core business logic
  basicFlow.add((event, context, handlerFlow) => {
    // access config that was injected by configLoader
    let dataSource = handlerFlow.state.config.dataSource;
    doDatabaseWork(dataSource);

    // complete the flow
    handlerFlow.success();
  });
};

```

### HTTPLambdaFlow (For http proxy integration where a response should always return an http response)

The following example shows an http lambda flow that adds handlers that are typically used in web flows where
an http request needs to be authorized, the request body / paramters need to be parsed, and headers (in this example security headers) need to be added to the response:
```javascript
'use strict';

const HTTPFlow = require("@aws-lambda/flow").HTTPFlow;

module.exports.hello = (event, context, callback) => {
  let flow = new HTTPFlow(event, context, callback);
  // add an authorizer and security header injector into the flow ()
  flow.add(configLoader);
  flow.add(authorizer);
  flow.add(securityHeaders);
  flow.add(requestValidator);
  flow.add((event, context, handlerFlow) => {
    /* *
     * Since request validation was handled by first flow,
     * we can access the name field directly from the state and
     * add it to the response.
     */
    handlerFlow
      .response
      .body({
        message: "Hello " + handlerFlow.state.name + "!"
      });
    // complete flow with success
    handlerFlow.success();
  });
  flow.execute();
};
```

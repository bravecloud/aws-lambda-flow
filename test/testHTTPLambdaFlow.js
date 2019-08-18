const HTTPLambdaFlow = require("../lib/HTTPLambdaFlow");

const assert = require("assert");

const getContinueFlow = () => {
  return (event, ctx, handlerFlow) => {
    if (!handlerFlow.state.v) {
      handlerFlow.state.v = 0;
    }
    handlerFlow.state.v++;
    handlerFlow.response.header("v" + handlerFlow.state.v, true);

    handlerFlow.continue();
  };
};

describe('HTTPLambdaFlow', function () {
  it("Single success flow - default status code", (done) => {
    let flow = new HTTPLambdaFlow({}, {}, (error, response) => {
      try {
        assert.ifError(error);
        assert.ok(response);
        assert.equal(response.statusCode, 200, "Expected default http status code of 200");
        done();
      }
      catch(e) {
        done(e);
      }
    });
    flow.add((event, context, handlerFlow) => {
      handlerFlow.success();
    });
    flow.execute();
  });
  it("Single success flow - redirect (301)", (done) => {
    let testBody = {
      message: "Moved permanently"
    };
    let flow = new HTTPLambdaFlow({}, {}, (error, response) => {
      try {
        assert.ifError(error);
        assert.ok(response);
        assert.equal(response.statusCode, 301, "Expected redirect (301)");
        assert.equal(JSON.parse(response.body).message, testBody.message, "Expected redirect message");
        done();
      }
      catch(e) {
        done(e);
      }
    });
    flow.add((event, context, handlerFlow) => {
      handlerFlow.response.status(301).body(testBody);
      handlerFlow.success();
    });
    flow.execute();
  });
  it("Single fail flow - default (fail called with error)", (done) => {
    let flow = new HTTPLambdaFlow({}, {}, (error, response) => {
      try {
        assert.ifError(error);
        assert.ok(response);
        assert.equal(response.statusCode, 500, "Expected default http error status code of 500");
        done();
      }
      catch(e) {
        done(e);
      }
    });
    flow.add((event, context, handlerFlow) => {
      throw new Error("default error");
    });
    flow.execute();
  });
  it("Single fail flow - bad request (400)", (done) => {
    let errorBody = {
      message: "Invalid Request"
    };
    let flow = new HTTPLambdaFlow({}, {}, (error, response) => {
      try {
        assert.ifError(error);
        assert.ok(response);
        assert.equal(response.statusCode, 400, "Expected default http error status code of 400");
        assert.equal(JSON.parse(response.body).message, errorBody.message, "Expected invalid request message");
        done();
      }
      catch(e) {
        done(e);
      }
    });
    flow.add((event, context, handlerFlow) => {
      handlerFlow.response.status(400)
                          .body(errorBody);
      handlerFlow.fail();
    });
    flow.execute();
  });
  it("Multiple success flow (response and state modifications) - default status code", (done) => {
    let flow = new HTTPLambdaFlow({}, {}, (error, response) => {
      try {
        assert.ifError(error);
        assert.ok(response);
        assert.equal(response.statusCode, 200, "Expected default http status code of 200");
        assert.equal(response.headers["v1"], true, "Expected header value set from 1st continue flow");
        assert.equal(response.headers["v2"], true, "Expected header value set from 2nd continue flow");
        assert.equal(response.headers["v3"], true, "Expected header value set from 3rd continue flow");
        assert.equal(JSON.parse(response.body).v, 3, "Expected response body to contain handler state value of 3");
        done();
      }
      catch(e) {
        done(e);
      }
    });
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      handlerFlow.response.body({v: handlerFlow.state.v });
      handlerFlow.success();
    });
    flow.execute();
  });
  it("Multiple fail flow - 401 failure on middle handler", (done) => {
    let testBody = {
      message: "Authorization failure"
    };
    let flow = new HTTPLambdaFlow({}, {}, (error, response) => {
      try {
        assert.ifError(error);
        assert.ok(response);
        assert.equal(response.statusCode, 401, "Expected 401 auth error");
        assert.equal(response.headers["v1"], true, "Expected header value set from 1st continue flow");
        assert.ok(!response.headers["v2"], "Not expecting header set by 2nd handler");
        assert.ok(!response.headers["v3"], "Not expecting header set by 3rd handler");
        assert.equal(JSON.parse(response.body).message, testBody.message, "Expected error message in body");
        done();
      }
      catch(e) {
        done(e);
      }
    });
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      handlerFlow.response.status(401).body(testBody);
      handlerFlow.fail();
    });
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      //Should not get here
      handlerFlow.response.body({v: handlerFlow.state.v });
      handlerFlow.success();
    });
    flow.execute();
  });
});
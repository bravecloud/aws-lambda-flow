const LambdaFlow = require("../lib/LambdaFlow");
const FlowErrors = require("../lib/FlowErrors");

const assert = require('assert');

const getSuccessTestFlow = (testResponse, done) => {
  const testFlow = new LambdaFlow({}, {}, (error, response) => {
    try {
      assert.ifError(error);
      assert.equal(response, testResponse, "Unexpected response");
      done();
    }
    catch(e) {
      done(e);
    }
  });
  testFlow.add((event, ctx, handlerFlow) => {
    handlerFlow.success(testResponse);
  });
  return testFlow;
}

const getFailTestFlow = (testError, done) => {
  const testFlow = new LambdaFlow({}, {}, (error, response) => {
    try {
      assert.equal(error, testError, "Unexpected response");
      done();
    }
    catch(e) {
      done(e);
    }
  });
  testFlow.add((event, ctx, handlerFlow) => {
    handlerFlow.fail(testError);
  });
  return testFlow;
};

const getContinueFlow = () => {
  return (event, ctx, handlerFlow) => {
    if (!handlerFlow.state.v) {
      handlerFlow.state.v = 0;
    }
    handlerFlow.state.v++;

    handlerFlow.continue();
  };
};

describe('LambdaFlow', function () {
  it("Single success flow - string literal response", (done) => {
    let flow = getSuccessTestFlow("Test", done);
    flow.execute();
  });
  it("Single success flow - number response", (done) => {
    let flow = getSuccessTestFlow(21903, done);
    flow.execute();
  });
  it("Single success flow - object response", (done) => {
    let flow = getSuccessTestFlow({
      a: 1,
      b: 2,
      c: {
        d: {
          f: [1,2,3,4]
        }
      }
    }, done);
    flow.execute();
  });
  it("Single fail flow - string response", (done) => {
    let flow = getFailTestFlow("Test Error", done);
    flow.execute();
  });
  it("Single fail flow - Error response", (done) => {
    let flow = getFailTestFlow(new Error("Test Error"), done);
    flow.execute();
  });  
  it("Multiple success flow", (done) => {
    let flow = new LambdaFlow({}, {}, (error, response) => {
      if (response === 3) {
        done();
      }
      else {
        done("Expected response value of 3 (1 for each flow)");
      }
    });
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add(({},{}, handlerFlow) => {
      handlerFlow.success(handlerFlow.state.v);
    });
    flow.execute();
  });
  it("Multiple success flow", (done) => {
    let flow = new LambdaFlow({}, {}, (error, response) => {
      if (response === 3) {
        done();
      }
      else {
        done("Expected response value of 3 (1 for each flow)");
      }
    });
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      handlerFlow.success(handlerFlow.state.v);
    });
    flow.execute();
  });
  it("Multiple flow with mid-fail ", (done) => {
    let testError = new Error("mid-fail");
    let flow = new LambdaFlow({}, {}, (error, response) => {
      if (error === testError) {
        done();
      }
      else {
        done("Expected error");
      }
    });
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      handlerFlow.fail(testError);
    });
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      handlerFlow.success("success");
    });
    flow.execute();
  });
  it("Multiple flow with no completing handler (FlowError)", (done) => {
    let flow = new LambdaFlow({}, {}, (error, response) => {
      if (error === FlowErrors.END_OF_HANDLERS) {
        done();
      }
      else {
        done("Expected error");
      }
    });
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      handlerFlow.continue();
    });
    flow.execute();
  });
  it("Multiple flow with unexpected error in handler body", (done) => {
    let flow = new LambdaFlow({}, {}, (error, response) => {
      if (error && error.message && error.message.indexOf("noSuchFunction") !== -1) {
        done();
      }
      else {
        done("Expected undefined error");
      }
    });
    flow.add(getContinueFlow());
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      //unexecpted error
      noSuchFunction();
      handlerFlow.continue();
    });
    flow.add(getContinueFlow());
    flow.add((event, context, handlerFlow) => {
      handlerFlow.success("success");
    });
    flow.execute();
  });
});
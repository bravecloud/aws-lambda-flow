const FlowErrors = require("./FlowErrors");

module.exports = class {
  constructor(event, context, callback) {
    this._handlers = [];
    this._event = event;
    this._context = context;
    this._callback = callback;
    //Create handler flow instance and attach to internal flow functions and provide
    this._handlerFlow = {};
    //Set flow functions and state references to read-only
    Object.defineProperty(this._handlerFlow, "continue", { value: this.continue.bind(this) });
    Object.defineProperty(this._handlerFlow, "success", { value: this.success.bind(this) });
    Object.defineProperty(this._handlerFlow, "fail", { value: this.fail.bind(this) });
    Object.defineProperty(this._handlerFlow, "state", { value: {} });
  }

  add(handler) {
    this._handlers.push(handler);
    return this;
  }

  continue () {
    try {
      if (this._handlers.length) {
        this._handlers.shift()(this._event, this._context, this._handlerFlow);
      }
      else {
        throw FlowErrors.END_OF_HANDLERS;
      }
    }
    catch (e) {
      this.fail(e);
    }
  }

  success(response) {
    this._callback(null, response);
  }

  fail (error) {
    this._callback(error);
  }

  execute() {
    this.continue();
  }
};

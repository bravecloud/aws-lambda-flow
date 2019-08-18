const LambdaFlow = require("./LambdaFlow");

const Response = require("@aws-lambda/http").Response;

module.exports = class extends LambdaFlow {
  constructor(event, context, callback) {
    super(event, context, callback);
    //Set reponse object reference to read-only
    Object.defineProperty(this._handlerFlow, "response", { value: new Response() });
  }

  success() {
    this._callback(null, this._handlerFlow.response.json());
  }

  fail (error) {
    //error should only be supplied via fail parameter in unexpected errors so
    //the assumption is a server side error (staus code 5xx)
    if (error) {
      this._handlerFlow.response.status(500)
                                .body(error);
    }
    this._callback(null, this._handlerFlow.response.json());
  }
};
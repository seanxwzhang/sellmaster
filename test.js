"use strict";
const Promise = require("bluebird");


class ExtendableError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.stack = (new Error()).stack;
    this.name = this.constructor.name;
  }
}

class AppError extends ExtendableError {
    constructor (message, type) {
        super(message);
        // Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.type = type || 'general';
    }
};


var fn = () => {
    return new Promise((resolve, reject) => {
        reject("test");
    }).catch((err) => {
        throw new AppError(err, "authentication");
    });
}

fn()
.catch((myerror) => {
    console.log(myerror.type);
    console.log(myerror instanceof AppError);
    console.log(myerror.name);
    console.log(myerror.stack);
})

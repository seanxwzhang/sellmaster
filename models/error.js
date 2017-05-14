"use strict";

class ExtendableError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.stack = (new Error()).stack;
    this.name = this.constructor.name;
  }
}

module.exports = class AppError extends ExtendableError {
    constructor (message, type) {
        super(message);
        // Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.type = type || 'general';
    }
};

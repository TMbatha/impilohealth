'use strict';

/** Maps domain error codes to HTTP status codes in one place. */
const STATUS_BY_CODE = {
  NOT_FOUND: 404,
  INVALID: 400,
  ALREADY_RELEASED: 409,
  NOT_EDITABLE: 409,
  NOT_RELEASED: 409,
  NOT_DELETABLE: 409,
};

function appError(code, message) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = STATUS_BY_CODE[code] || 400;
  return err;
}

function statusOf(error) {
  return error.statusCode || STATUS_BY_CODE[error.code] || 400;
}

module.exports = { appError, statusOf };

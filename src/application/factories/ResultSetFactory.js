'use strict';

const domain = require('../../domain');

class ResultSetFactory {
  constructor(repo = null) {
    this.repo = repo;
  }

  static create(raw, previous = null) {
    return domain.classifyResultSet(raw, previous);
  }

  static fromRaw(raw) {
    return new domain.ResultSet(raw);
  }

  createFromRaw(raw, previous = null) {
    return ResultSetFactory.create(raw, previous);
  }
}

module.exports = ResultSetFactory;

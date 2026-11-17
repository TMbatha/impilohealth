'use strict';

const express = require('express');
const { createContext } = require('../context');
const { dispatch } = require('./routeTable');

const ctx = createContext();
const router = express.Router();

router.all('/api/*', (req, res) => {
  const { status, body } = dispatch(ctx, req.method, req.path, req.body, req.query);
  res.status(status).json(body);
});

module.exports = router;

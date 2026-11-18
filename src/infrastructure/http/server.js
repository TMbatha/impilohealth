'use strict';

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(routes);
// Web app at /, mobile PWA at /mobile/ (static, no build step)
app.use(express.static(require('path').join(__dirname, '../../../web'), { index: 'index.html' }));

const port = Number(process.env.PORT || 3000);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Impilo API listening on port ${port}`);
  });
}

module.exports = app;

var express = require('express');
var router = express.Router();

const historyRoutes = require('./historyRoutes');

router.use('/', historyRoutes);

module.exports = router;

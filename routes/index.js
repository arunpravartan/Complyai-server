var express = require('express');
var router = express.Router();

const historyRoutes = require('./historyRoutes');
const serviceRoutes = require('./serviceRoute');

router.use('/', historyRoutes);
router.use('/service', serviceRoutes);

module.exports = router;

const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.post('/add-history', historyController.addHistory);
router.post('/get-history', historyController.getHistory);

module.exports = router;
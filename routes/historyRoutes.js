const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.post('/add-history', historyController.addHistory);
router.post('/get-history', historyController.getHistory);
router.post('/delete-file', historyController.deleteSingleFile);
router.get('/get-file-details', historyController.downloadFile);
router.post('/add-chat-history', historyController.AddChatHistory);
router.get('/get-chat-history', historyController.getChatHistory);
router.get('/get-all-chat-history', historyController.getAllChatHistory);

module.exports = router;
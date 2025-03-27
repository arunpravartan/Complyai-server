const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');


const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const upload = multer({ storage: multer.memoryStorage() });

router.get('/get-procedure-master-data', serviceController.getProcedureMasterData);
router.post('/send4audit', upload.single("file"), serviceController.sendFileForAudit);
router.post('/upload-knowledge', upload.array('files'), serviceController.uploadKnowledge);
router.post('/create-knowledge-db', serviceController.createKnowledgeDB);
router.get('/reset-db', serviceController.resetVectorDatabase);
module.exports = router;
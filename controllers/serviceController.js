const { json } = require('express');
const { RecordProcedureMaster} = require('../models/record_procedure_master');
const path = require("path");
const fs = require("fs");

const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const fsPromisses = require("fs").promises;
const { promisify } = require('util');

// const folderPath = '/Users/arunkumar/Documents/complyai/complyai-docvalidation/uploads';
const folderPath = '/root/docvalidation/uploads/';
// Use promisified fs.readdir to list files in the directory
const readdir = promisify(fs.readdir);

// ================= Start login route and it's function ======================== /
exports.getProcedureMasterData = async (req, res) => {
    const payload = req.query;
    if(!payload) {
        return res.json({ success: false, message: 'User not found' });
    }
    const result = await RecordProcedureMaster.find();
    if(!result) {
        return res.json({ success: false, message: 'User not found' });
    }   
    res.json({ success: true, data: result });
};


exports.sendFileForAudit = async (req, res) => {
    try {
        const file = req.file; // Get uploaded file
        const formDetails = JSON.parse(req.body.formDetails); // Parse form data

        if (!file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        console.log("Received file:", file.originalname);
        console.log("Form details:", formDetails);

        // ✅ Forward file & formDetails to another server
        const forwardFormData = new FormData();
        forwardFormData.append("uploadFileData", file.buffer, file.originalname);
        forwardFormData.append("formDetails", JSON.stringify(formDetails));

        const response = await axios.post("https://another-server.com/api/upload", forwardFormData, {
            headers: {
                ...forwardFormData.getHeaders(),
            },
        });

        res.json({ success: true, message: "Data forwarded", response: response.data });
    } catch (error) {
        console.error("Error forwarding request:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



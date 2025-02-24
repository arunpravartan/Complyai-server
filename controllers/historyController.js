const { json } = require('express');
const { History, ObjectId } = require('../models/history');
const { RecordProcedureMaster } = require('../models/record_procedure_master');
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const fsPromisses = require("fs").promises;
const { promisify } = require('util');

const folderPath = '/Users/arunkumar/Documents/complyai/complyai-docvalidation/uploads';
// Use promisified fs.readdir to list files in the directory
const readdir = promisify(fs.readdir);

// ================= Start login route and it's function ======================== //
exports.addHistory = async (req, res) => {
    const payload = req.body;
    if (!payload) {
        return res.json({ success: false, message: 'User not found' });
    }
    const saveData = {
        user_id: payload.user_id,
        file_name: payload.fileName,
        audit_data: payload.responceData,
        type: payload.type,
        audited_file_name: payload.audited_file_name,
        formDetails: payload.formDetails
    }
    const result = await History.create(saveData);
    if (!result) {
        return res.json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result });
};

exports.getHistory = async (req, res) => {
    try {
        const payload = req.body;

        if (!payload?.user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const result = await History.find({ user_id: payload.user_id });

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'No history found for this user' });
        }
        const recordHistory = result.filter(history => history.type === "record");
        const procedureHistory = result.filter(history => history.type === "procedure");

        res.json({ success: true, recordHistory, procedureHistory });
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.deleteSingleFile = async (req, res) => {
    let { id, fileName } = req.body;
    if (!id || !fileName) {
        return res.json({ success: false, message: 'File ID or file name missing' });
    }
    fileName = fileName + ".docx.audited";
    const filePath = path.join(folderPath, fileName);
    try {
        await fsPromisses.access(filePath);
        await fsPromisses.unlink(filePath);
        console.log('File deleted successfully');
        const result = await History.deleteOne({ _id: id });

        if (!result.deletedCount) {
            return res.json({ success: false, message: 'File not found in database' });
        }
        return res.json({ success: true, message: 'File and database entry deleted successfully' });
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.json({ success: false, message: 'File not found' });
        } else {
            console.error('Error deleting the file:', err);
            return res.json({ success: false, message: 'Error deleting file', error: err });
        }
    }
};

exports.downloadFile = async (req, res) => {
    let { fileName } = req.query;
    try {
        const files = await readdir(folderPath);
        const fileWithAuditedExtension = files.find(file => file.includes(fileName) && file.endsWith('.docx.audited'));
        if (!fileWithAuditedExtension) {
            return res.status(404).json({ success: false, message: "File not found" });
        }
        const originalFilePath = path.join(folderPath, fileWithAuditedExtension);
        if (!fs.existsSync(originalFilePath)) {
            return res.status(404).json({ success: false, message: "Original file not found" });
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${originalFilePath}`);
        const fileStream = fs.createReadStream(originalFilePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error fetching file:', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

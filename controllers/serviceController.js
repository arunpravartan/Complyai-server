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

/**
 * Upload files to the Flask API for processing.
 * 
 * @param {Object} req - Express request object.
 * @param {Array} req.files - Array of files uploaded through the request.
 * @param {Object} res - Express response object.
 * 
 * @returns {void} Responds with a success message or an error message.
 */
exports.uploadKnowledge = async (req, res) => {
    try {
        const files = req.files;
        const uploadApiUrl = "http://localhost:5000/upload-knowledge"; // Flask API endpoint

        // Validate if files are present in the request
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        console.log("Files received:", files.map((file) => file.originalname));

        // Create FormData to send files to the Flask server
        const form = new FormData();
        files.forEach((file) => {
            // Append each file's buffer and original name to the form
            form.append("file", file.buffer, file.originalname);
        });

        const response = await axios.post(uploadApiUrl, form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        // Respond with success message and data from the Flask API
        res.json({ success: true, message: "Files uploaded successfully", response: response.data });
    } catch (error) {
        console.error("Error uploading knowledge:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
}  
/**
 * Create or update a vector database via Flask API.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {void} Responds with a success message or an error message.
 */
exports.createKnowledgeDB = async (req, res) => {
    try {
        const apiEndpoint = "http://localhost:5000/create-vector-database"; // Flask API endpoint

        console.log("Calling Flask API to create vector database");

        // Send a POST request to the Flask API
        const response = await axios.post(apiEndpoint);

        // Handle the response from the Flask API
        res.json({ success: true, message: "Vector database created/updated successfully", totalDocuments: response.data.total_documents, });
    } catch (error) {
        console.error("Error creating vector database:", error);

        // Send an error response with detailed information
        res.status(500).json({ success: false, message: "Failed to create the vector database", error: error.message, });
    }
};
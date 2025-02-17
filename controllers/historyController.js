const { json } = require('express');
const { History, ObjectId } = require('../models/history');
const path = require("path");
const fs = require("fs");
const axios = require("axios");
// ================= Start login route and it's function ======================== //
exports.addHistory = async (req, res) => {
    const payload = req.body;
    if(!payload) {
        return res.json({ success: false, message: 'User not found' });
    }
    const saveData = {
        user_id: payload.user_id,
        file_name: payload.fileName,
        audit_data: payload.responceData,
        type: payload.type,
        audited_file_name: payload.audited_file_name
    }
    const result = await History.create(saveData);
    if(!result) {
        return res.json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result });
};

exports.getHistory = async (req, res) => {
    const payload = req.body;
    if(!payload) {
        return res.json({ success: false, message: 'User not found' });
    }
    const result = await History.find({ user_id: payload.user_id });
    if(!result) {
        return res.json({ success: false, message: 'User not found' });
    }   
    res.json({ success: true, data: result });
};

exports.deleteSingleFile = async (req, res) => {
    const payload = req.body;
    if(!payload && !payload?.id) {
        return res.json({ success: false, message: 'file id missing' });
    }
    const result = await History.deleteOne({ _id: payload?.id});
    if(!result) {
        return res.json({ success: false, message: 'User not found' });
    }   
    res.json({ success: true, data: result });
}

exports.downloadFile = async (req, res) => {
    try {
        const uploadURL = "https://complyai.pravartan.com/docvalidation/uploads/";

        // Fetch file list from the remote server (this works only if the server exposes a list endpoint)
        const response = await axios.get(uploadURL);

        if (!response.data) {
            return res.status(404).json({ success: false, message: "No files found" });
        }

        // Process and return the file list (assuming response is an array of file names)
        const fileList = response.data
            .filter(file => file.endsWith(".docs.audited"))  // Only .docs.audited files
            .map(file => ({
                originalFile: file,
                fileName: file.replace(".audited", ""),  // Remove .audited
                fileUrl: `${uploadURL}${file.replace(".audited", "")}` // Correct file URL
            }));

        res.json({ success: true, files: fileList });
    } catch (error) {
        console.error("Error fetching remote files:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

// exports.downloadFile = async (req, res) => {
//     try {
//         const { fileName } = req.query;

//         if (!fileName) {
//             return res.status(400).json({ success: false, message: "File name is required" });
//         }

//         const uploadsDir = path.join("", "uploads");
//         const filePath = path.join(uploadsDir, `${fileName}.docs.audited`);

//         // Check if the file exists
//         if (!fs.existsSync(filePath)) {
//             return res.status(404).json({ success: false, message: "File not found" });
//         }

//         // Create a new filename without the `.audited` extension
//         const cleanFileName = `${fileName}.docs`;
//         const newFilePath = path.join(uploadsDir, cleanFileName);

//         // Rename the file (remove .audited)
//         fs.renameSync(filePath, newFilePath);

//         // Send the renamed file as a response
//         res.download(newFilePath, cleanFileName, (err) => {
//             if (err) {
//                 console.error("File download error:", err);
//                 res.status(500).json({ success: false, message: "Error downloading file" });
//             } else {
//                 console.log("File sent successfully:", cleanFileName);
//             }
//         });

//     } catch (error) {
//         console.error("Download error:", error);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// };

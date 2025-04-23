const { json } = require('express');
const { History, ObjectId, ChatHistory } = require('../models/history');
const { RecordProcedureMaster } = require('../models/record_procedure_master');
const { KnowledgeRecordHistory } = require('../models/knowledge_record_history');
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
        const chatResult = await ChatHistory.find();

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'No history found for this user' });
        }
        const recordHistory = result.filter(history => history.type === "record");
        const procedureHistory = result.filter(history => history.type === "procedure");

        res.json({ success: true, recordHistory, procedureHistory, chatResult });
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

exports.ClearChatHistory = async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required in request body.' });
        }

        const result = await ChatHistory.deleteMany({ user_id: user_id });

        if (result.deletedCount === 0) {
            console.log(`No chat history found to delete for user_id: ${user_id}`);
            // Still considered a success, just nothing to delete
        } else {
            console.log(`Deleted ${result.deletedCount} chat history items for user_id: ${user_id}`);
        }

        res.json({ success: true, message: `Chat history cleared successfully. ${result.deletedCount} items removed.`, deletedCount: result.deletedCount });

    } catch (error) {
        console.error("Error clearing chat history:", error);
        res.status(500).json({ success: false, message: "Failed to clear chat history.", error: error.message });
    }
};

exports.DeleteChatItem = async (req, res) => {
    try {
        const { user_id, chat_item_id } = req.body;

        if (!user_id || !chat_item_id) {
            return res.status(400).json({ success: false, message: 'Missing user_id or chat_item_id in request body.' });
        }

        const result = await ChatHistory.findOneAndDelete({
            _id: chat_item_id,
            user_id: user_id
        });

        if (!result) {
            return res.status(404).json({ success: false, message: 'Chat item not found or user unauthorized to delete.' });
        }

        res.json({ success: true, message: 'Chat item deleted successfully.', deleted_id: chat_item_id });

    } catch (error) {
        console.error("Error deleting chat item:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid chat item ID format.' });
        }
        res.status(500).json({ success: false, message: "Failed to delete chat item.", error: error.message });
    }
};

exports.AddChatHistory = async (req, res) => {
    try {
        const payload = req.body;
        if (!payload) {
            return res.json({ success: false, message: 'User not found' });
        }
        const saveData = {
            user_id: payload.user_id,
            question: payload.question,
            answer: payload.answer,
            status: "active"
        };
        const result = await ChatHistory.create(saveData);
        if (!result) {
            return res.json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        console.error("Error fetching response history:", error);
        res.json({ success: false, message: "Failed to fetch response history", data: error });
    }
}

exports.getChatHistory = async (req, res) => {
    try {
        const payload = req.query;
        if (!payload?.user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        const result = await ChatHistory.find({ user_id: payload.user_id });
        if (!result) {
            return res.json({ success: true, message: "no data found" });
        }
        res.json({ success: true, message: "Response history fetched successfully", response: result });
    } catch (error) {
        console.error("Error fetching response history:", error);
        res.json({ success: false, message: "Failed to fetch response history", data: error });
    }
}
// exports.getAllChatHistory = async (req, res) => {
//     try {
//         const result = await ChatHistory.find();
//         if (!result) {
//             return res.json({ success: true, message: "no data found" });
//         }
//         res.json({ success: true, message: "Response history fetched successfully", response: result });
//     } catch (error) {
//         console.error("Error fetching response history:", error);
//         res.json({ success: false, message: "Failed to fetch response history", data: error });
//     }
// }
exports.getAllChatHistory = async (req, res) => {
    try {
        const result = await ChatHistory.aggregate([
            {
                $group: {
                    _id: { $month: "$date" },
                    total: { $sum: 1 }
                }
            },
            {
                $project: {
                    month: "$_id",
                    total: 1,
                    _id: 0
                }
            }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formatted = months.map((name, index) => {
            const found = result.find(r => r.month === index + 1);
            return { name, Query: found ? found.total : 0 };
        });

        const totalRecords = await History.find({});
        const totalKnowledge = await KnowledgeRecordHistory.countDocuments();

        const filteredRecords = totalRecords.filter(record => record.type === "record");
        const filteredProcedures = totalRecords.filter(record => record.type === "procedure");

        const stats = [
            { label: "Total Queries", value: result[0].total, change: "+2.6%", icon: "mdi:comment-question-outline", color: "#e8f5e9" },
            { label: "Total Records Validated", value: filteredRecords.length || 0, change: "-0.1%", icon: "mdi:check-decagram-outline", color: "#e8f0fe" },
            { label: "Total Procedure Validated", value: filteredProcedures.length || 0, change: "+2.8%", icon: "mdi:clipboard-check-outline", color: "#f0f4c3" },
            { label: "Total Documents in Knowledge DB", value: totalKnowledge, change: "+3.6%", icon: "mdi:file-document-multiple-outline", color: "#ede7f6" }
        ];


        const rawData = await History.aggregate([
            {
                $project: {
                    month: { $month: "$date" },
                    type: 1
                }
            },
            {
                $group: {
                    _id: { month: "$month", type: "$type" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const resultMap = {};

        rawData.forEach(item => {
            const monthIndex = item._id.month - 1;
            const monthName = months[monthIndex];

            if (!resultMap[monthName]) {
                resultMap[monthName] = { name: monthName, Record: 0, Procedure: 0 };
            }

            if (item._id.type === "record") {
                resultMap[monthName].Record = item.count;
            } else if (item._id.type === "procedure") {
                resultMap[monthName].Procedure = item.count;
            }
        });

        // Convert map to array and sort by original month index
        const finalData = months.map(name => resultMap[name] || { name, Record: 0, Procedure: 0 });

        res.json({ success: true, response: formatted, stats: stats, lineKnowledgeData: finalData });
    } catch (err) {
        res.status(500).json({ success: false, message: "Aggregation error", error: err });
    }
};

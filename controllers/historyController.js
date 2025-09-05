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

        const result = await ChatHistory.findOneAndUpdate({
            _id: chat_item_id,
            user_id: user_id
        }, { $set: { status: "inactive" } });

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
        const result = await ChatHistory.find({ user_id: payload.user_id, status: "active" });
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
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;

        const monthsToInclude = [lastMonth, currentMonth];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const result = await ChatHistory.aggregate([
            {
                $match: {
                    $expr: {
                        $in: [{ $month: "$date" }, monthsToInclude]
                    }
                }
            },
            {
                $project: {
                    month: { $month: "$date" },
                    week: {
                        $switch: {
                            branches: [
                                { case: { $lte: [{ $dayOfMonth: "$date" }, 7] }, then: 1 },
                                { case: { $lte: [{ $dayOfMonth: "$date" }, 14] }, then: 2 },
                                { case: { $lte: [{ $dayOfMonth: "$date" }, 21] }, then: 3 },
                                { case: { $lte: [{ $dayOfMonth: "$date" }, 31] }, then: 4 }
                            ],
                            default: 0
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { month: "$month", week: "$week" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Convert result into { '4-1': 5, '4-2': 8, ... }
        const grouped = {};
        for (const r of result) {
            const key = `${r._id.month}-${r._id.week}`;
            grouped[key] = r.count;
        }

        // Build final formatted array
        const formatted = [];
        monthsToInclude.forEach(month => {
            for (let w = 1; w <= 4; w++) {
                const label = `${monthNames[month - 1]} W ${w}`;
                const key = `${month}-${w}`;
                formatted.push({
                    name: label,
                    Query: grouped[key] || 0
                });
            }
        });


        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const totalRecords = await History.find({});
        const totalKnowledge = await KnowledgeRecordHistory.countDocuments();
        const totalQueries = await ChatHistory.countDocuments();
        const filteredRecords = totalRecords.filter(record => record.type === "record");
        const filteredProcedures = totalRecords.filter(record => record.type === "procedure");

        const stats = [
            { label: "Total Queries", value: totalQueries, change: "+2.6%", icon: "mdi:comment-question-outline", color: "#e8f5e9" },
            { label: "Total Records Validated", value: filteredRecords.length || 0, change: "-0.1%", icon: "mdi:check-decagram-outline", color: "#e8f0fe" },
            { label: "Total Procedures Validated", value: filteredProcedures.length || 0, change: "+2.8%", icon: "mdi:clipboard-check-outline", color: "#f0f4c3" },
            { label: "Total Documents in Knowledge DB", value: totalKnowledge + 4, change: "+3.6%", icon: "mdi:file-document-multiple-outline", color: "#ede7f6" }
        ];

        const currentMonth1 = now.getMonth(); // e.g., April = 3 (0-based)
const currentYear = now.getFullYear();

const startOfCurrentMonth = new Date(currentYear, currentMonth1, 1);
const startOfPreviousMonth = new Date(currentYear, currentMonth1 - 1, 1);
const endOfCurrentMonth = new Date(currentYear, currentMonth1 + 1, 0, 23, 59, 59, 999);

// monthsToInclude must match 0-based month indexes: [2, 3] for March, April
const monthsToInclude1 = [startOfPreviousMonth.getMonth(), startOfCurrentMonth.getMonth()];

const data = await History.find({
  date: {
    $gte: startOfPreviousMonth,
    $lte: endOfCurrentMonth
  }
});
const resultMap = {};
data.forEach(item => {
    const d = new Date(item.date);
    const month = d.getMonth();
    const year = d.getFullYear();
  
    // Only include current and last month
    if (!monthsToInclude1.includes(month)) return;
  
    const day = d.getDate();
    const type = item.type || 'unknown';
  
    let week = 0;
    if (day <= 7) week = 1;
    else if (day <= 14) week = 2;
    else if (day <= 21) week = 3;
    else week = 4;
  
    const label = `${months[month]} W${week}`;
  
    if (!resultMap[label]) {
      resultMap[label] = { name: label, record: 0, procedure: 0 };
    }
  
    if (type === "record") resultMap[label].record++;
    else if (type === "procedure") resultMap[label].procedure++;
    else resultMap[label].unknown = (resultMap[label].unknown || 0) + 1;
  });
  
  // Ensure output includes all 8 week slots (4 from each month)
  const finalData = [];
  monthsToInclude1.forEach(month => {
    for (let week = 1; week <= 4; week++) {
      const label = `${months[month]} W${week}`;
      finalData.push(resultMap[label] || { name: label, record: 0, procedure: 0 });
    }
  });
  
    res.json({ success: true, response: formatted, stats: stats, lineKnowledgeData: finalData });
    } catch (err) {
        res.status(500).json({ success: false, message: "Aggregation error", error: err });
    }
};

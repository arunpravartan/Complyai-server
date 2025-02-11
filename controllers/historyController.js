const { json } = require('express');
const { History, ObjectId } = require('../models/history');

// ================= Start login route and it's function ======================== //
exports.addHistory = async (req, res) => {
    const payload = req.body;
    if(!payload) {
        return res.json({ success: false, message: 'User not found' });
    }
    const saveData = {
        user_id: payload.user_id,
        file_name: payload.fileName,
        audit_data: payload.responceData
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

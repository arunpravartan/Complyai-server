const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

const history = new Schema({
    user_id: { type: ObjectId },
    date: { type: Date, default: Date.now },
    file_name: { type: String },
    audit_data: { type: Mixed },
    type : { type: String },
    audited_file_name : { type: String },
    formDetails : { type: Mixed },
    status: { type: String , default: "active" }
});

const chatHistory = new Schema({
    user_id: { type: ObjectId },
    date: { type: Date, default: Date.now },
    question: { type: String },
    answer: { type: Mixed },
    status: { type: String , default: "active" }
});

const History = mongoose.model('History', history);
const ChatHistory = mongoose.model('ChatHistory', chatHistory);
module.exports = {History, ObjectId, ChatHistory};

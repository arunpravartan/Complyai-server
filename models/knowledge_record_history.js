const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

const knowledgeRecordHistory = new Schema({
    file_name: { type: String },
    file_type: { type: String },
    date: { type: Date, default: Date.now },
    file_location: { type: String },
    user_id: { type: ObjectId },
    status: { type: String },
});

const KnowledgeRecordHistory = mongoose.model('knowledgerecordhistories', knowledgeRecordHistory);
module.exports = {KnowledgeRecordHistory};

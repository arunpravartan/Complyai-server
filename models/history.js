const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

const history = new Schema({
    user_id: { type: ObjectId },
    date: { type: Date, default: Date.now },
    file_name: { type: String },
    audit_data: { type: Mixed }
});

const History = mongoose.model('History', history);

module.exports = {History, ObjectId};

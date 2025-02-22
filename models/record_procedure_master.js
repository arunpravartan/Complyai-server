const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

const recordProcedureMaster = new Schema({
    type: { type: String },
    sub_type: { type: String },
    date: { type: Date, default: Date.now },
    prompt: { type: Mixed },
    sop_file_location: { type: Mixed }
});

const RecordProcedureMaster = mongoose.model('RecordProcedureMaster', recordProcedureMaster);
module.exports = {RecordProcedureMaster};

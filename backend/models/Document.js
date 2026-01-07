const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    neighborhood: { type: String, required: true },
    type: { type: String, default: 'pdf_report' },
    url: { type: String, required: true },
    date: { type: Date, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    resource: { type: String, default: 'all' },
    fileName: { type: String },
    createdAt: { type: Date, default: Date.now }
}, {
    collection: 'documents',
    timestamps: false
});

// Index for faster queries
DocumentSchema.index({ neighborhood: 1, year: -1, month: -1 });
DocumentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Document', DocumentSchema);


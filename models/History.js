const mongoose = require("mongoose")

const HistorySchema = new mongoose.Schema({
  originalText: { type: String, required: true },
  summaryText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model("History", HistorySchema)

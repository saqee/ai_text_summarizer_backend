const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const axios = require("axios")
require("dotenv").config()
const Groq = require("groq-sdk")
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const History = require("./models/History")

const app = express()

// ১. CORS কনফিগারেশন (একদম শুরুতে)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
)

// ২. Body Parser
app.use(express.json())
console.log("URI:", process.env.MONGO_URI)
// ৩. MongoDB Connection
// async/await দিয়ে standard কানেকশন কোড
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("MongoDB Connected")
  } catch (error) {
    console.log("DB Connection Error:", error)
  }
}

connectDB()

// ৪. History Get Route
app.get("/api/history", async (req, res) => {
  try {
    const list = await History.find().sort({ createdAt: -1 })
    res.json(list)
  } catch (error) {
    console.error("History fetch error:", error)
    res.status(500).json({ error: error.message })
  }
})

app.post("/api/summarize", async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: "Text is required" })

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "user", content: `Summarize this text concisely:\n\n${text}` },
      ],
      model: "llama-3.1-8b-instant",
    })

    const summary = chatCompletion.choices[0]?.message?.content || ""
    const newEntry = await History.create({
      originalText: text,
      summaryText: summary,
    })
    res.json(newEntry)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ৫. Summarize Post Route
/* app.post("/api/summarize", async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: "Text is required" })

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3.1:latest",
      prompt: `Summarize the following text concisely:\n\n${text}`,
      stream: false,
    })

    const summary = response.data.response

    const newEntry = await History.create({
      originalText: text,
      summaryText: summary,
    })

    res.json(newEntry)
  } catch (error) {
    console.error("Summarization error:", error.response?.data || error.message)
    res.status(500).json({ error: "Summarization failed: " + error.message })
  }
}) */

const PORT = 5002
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

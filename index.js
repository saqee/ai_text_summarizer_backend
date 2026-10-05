const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()
const Groq = require("groq-sdk")

const History = require("./models/History")

const app = express()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// 1. CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://ai-text-summarizer-frontend-rho.vercel.app",
]

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions))
// NOTE: app.options("*", ...) is removed to prevent path-to-regexp crashes in Express 5

// 2. Parsers
app.use(express.json())

// 3. Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("MongoDB Connected")
  } catch (error) {
    console.error("DB Connection Error:", error.message)
    process.exit(1)
  }
}
connectDB()

// 4. Routes
app.get("/api/history", async (req, res) => {
  try {
    const list = await History.find().sort({ createdAt: -1 })
    res.json(list)
  } catch (error) {
    console.error("History fetch error:", error.message)
    res.status(500).json({ error: "Failed to fetch history" })
  }
})

app.post("/api/summarize", async (req, res) => {
  const { text } = req.body
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "A valid text string is required" })
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an assistant that summarizes text clearly and concisely.",
        },
        {
          role: "user",
          content: `Summarize this text concisely:\n\n${text}`,
        },
      ],
      model: "openai/gpt-oss-20b",
    })

    const summary = chatCompletion.choices[0]?.message?.content?.trim() || ""

    const newEntry = await History.create({
      originalText: text,
      summaryText: summary,
    })

    res.status(201).json(newEntry)
  } catch (error) {
    console.error("Groq API error:", error.message)
    res.status(500).json({ error: error.message || "Failed to generate summary" })
  }
})

// 5. Global Error Handler
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS policy restriction: Access denied" })
  }
  res.status(500).json({ error: "Internal Server Error" })
})

// 6. Listener
const PORT = process.env.PORT || 5002
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

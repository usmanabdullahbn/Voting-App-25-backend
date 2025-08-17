const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDatabase = require("./config/connection")
const { register, login, userDetails } = require("./controllers/user.controller")
const authenticate = require("./middlewares/auth")
const Vote = require("./models/vote.model")
const isAdmin = require("./middlewares/adminAuth")
const User = require("./models/user.model")
const Position = require("./models/position.model")

const app = express()
const server = http.createServer(app)

dotenv.config()

// enhanced socketIo.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
})
connectDatabase()

// middlewares
app.use(cors())
app.use(express.json())

// apis;

app.post("/api/register", register)
app.post("/api/login", login)
app.get("/api/me", authenticate, userDetails)

// post vote
app.post("/api/votes", authenticate, isAdmin, async (req, res) => {
  try {
    const { option } = req.body
    const vote = await Vote.create({
      option,
      createdBy: req.user?._id,
    })

    io.emit("voteCreated", vote)
    res.status(201).json(vote)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// get votes
app.get("/api/votes", async (req, res) => {
  try {
    const votes = await Vote.find().populate("createdBy", "email")

    res.status(201).json(votes)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// check vote
app.post("/api/vote/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (req.user.votedFor) {
      res.status(400).json({ error: "You have already voted" })
    }

    const vote = await Vote.findByIdAndUpdate(id, { $inc: { votes: 1 } }, { new: true })

    const user = await User.findByIdAndUpdate(req.user?._id, { votedFor: id }, { new: true })

    io.emit("voteUpdated", vote)
    res.status(201).json({ vote, user })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// delete vote
app.delete("/api/vote/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await Vote.findByIdAndDelete(id)
    io.emit("voteDeleted", id)

    res.status(201).json({ message: "Vote deleted successfully", success: true })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Position management endpoints
// Create new position
app.post("/api/positions", authenticate, isAdmin, async (req, res) => {
  try {
    const { title, category, type, candidates } = req.body
    const position = await Position.create({
      title,
      category,
      type,
      candidates: candidates || [],
      createdBy: req.user._id,
    })

    io.emit("positionCreated", position)
    res.status(201).json(position)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get all positions
app.get("/api/positions", async (req, res) => {
  try {
    const positions = await Position.find({ isActive: true })
      .populate("createdBy", "email")
      .sort({ category: 1, type: 1 })

    res.status(200).json(positions)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Add candidate to position
app.post("/api/positions/:id/candidates", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const position = await Position.findByIdAndUpdate(
      id,
      {
        $push: {
          candidates: { name, description: description || "" },
        },
      },
      { new: true },
    )

    io.emit("candidateAdded", { positionId: id, candidate: { name, description } })
    res.status(200).json(position)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Vote for candidate
app.post("/api/positions/:positionId/vote/:candidateIndex", authenticate, async (req, res) => {
  try {
    const { positionId, candidateIndex } = req.params

    // Check if user already voted for this position
    const existingVote = req.user.votes.find((vote) => vote.position.toString() === positionId)

    if (existingVote) {
      return res.status(400).json({ error: "You have already voted for this position" })
    }

    const position = await Position.findById(positionId)
    if (!position || candidateIndex >= position.candidates.length) {
      return res.status(404).json({ error: "Position or candidate not found" })
    }

    // Increment candidate votes
    position.candidates[candidateIndex].votes += 1
    await position.save()

    // Record user vote
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          votes: {
            position: positionId,
            candidate: position.candidates[candidateIndex].name,
          },
        },
      },
      { new: true },
    )

    io.emit("voteUpdated", { positionId, candidateIndex, position })
    res.status(200).json({ position, user })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete position
app.delete("/api/positions/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await Position.findByIdAndDelete(id)

    io.emit("positionDeleted", id)
    res.status(200).json({ message: "Position deleted successfully" })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// socket io events
io.on("connection", (socket) => {
  console.log("New client connected")

  socket.on("disconnect", () => {
    console.log("client disconnected")
  })
})

const PORT = process.env.PORT || 3002

server.listen(PORT, () => {
  console.log(`server running at port ${PORT}`)
})

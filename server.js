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
    const { option, category, position } = req.body
    const vote = await Vote.create({
      option,
      category,
      position,
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
    const votes = await Vote.find().populate("createdBy", "email").sort({ category: 1, position: 1, option: 1 })

    res.status(201).json(votes)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// check vote
app.post("/api/vote/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    // if (req.user.votedFor) {
    //   res.status(400).json({ error: "You have already voted" })
    // }

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
// socket io events
io.on("connection", (socket) => {
  console.log("New client connected")

  socket.on("disconnect", () => {
    console.log("client disconnected")
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`server running at port ${PORT}`)
})

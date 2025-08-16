const { Schema, Types, models, model } = require("mongoose")

const voteSchema = new Schema(
  {
    option: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Sports", "Literary", "STEM"],
    },
    position: {
      type: String,
      required: true,
      enum: ["Head", "Deputy Head"],
    },
    votes: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

voteSchema.index({ option: 1, category: 1, position: 1 }, { unique: true })

const Vote = models.Vote || model("Vote", voteSchema)

module.exports = Vote

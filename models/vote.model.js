const { Schema, Types, models, model } = require("mongoose")

const voteSchema = new Schema(
  {
    option: {
      type: String,
      required: true,
      unique: true,
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

const Vote = models.Vote || model("Vote", voteSchema)

module.exports = Vote

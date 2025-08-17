const { Schema, Types, models, model } = require("mongoose")

const positionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Sports", "Literary", "STEM"],
    },
    type: {
      type: String,
      required: true,
      enum: ["Head", "Deputy Head"],
    },
    candidates: [
      {
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: "",
        },
        votes: {
          type: Number,
          default: 0,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

const Position = models.Position || model("Position", positionSchema)

module.exports = Position

const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
    },

    change: {
      type: Number,
      default: 0,
    },

    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
  },

  name: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    default: 0,
  },

  previousPrice: {
    type: Number,
    default: 0,
  },

  change: {
    type: Number,
    default: 0,
  },

  volume: {
    type: String,
    default: "—",
  },

  attention: {
    type: Number,
    default: 0,
  },

  lastUpdated: {
    type: Date,
    default: null,
  },

  // Previous market checks
  history: {
    type: [historySchema],
    default: [],
  },
});

module.exports = mongoose.model("Stock", stockSchema);
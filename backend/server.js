const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Stock = require("./models/Stock");

const app = express();

app.use(cors());
app.use(express.json());


// ===============================
// MongoDB Connection
// ===============================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");
  })
  .catch((error) => {
    console.error("MongoDB connection error ❌", error);
  });


// ===============================
// Home Route
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "MarketRadar backend is running 🚀",
  });
});


// ===============================
// Get Watchlist
// ===============================

app.get("/api/stocks", async (req, res) => {
  try {
    const stocks = await Stock.find().sort({
      symbol: 1,
    });

    res.json(stocks);
  } catch (error) {
    console.error("Error fetching stocks:", error);

    res.status(500).json({
      message: "Error fetching stocks",
    });
  }
});


// ===============================
// Refresh Live Market Data
// ===============================

app.get("/api/stocks/refresh", async (req, res) => {
  try {
    const stocks = await Stock.find();

    const updatedStocks = [];

    // Update stocks one by one
    for (const stock of stocks) {
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${process.env.FINNHUB_API_KEY}`
        );

        const data = await response.json();

        // Handle Finnhub errors
        if (!response.ok) {
          console.log(
            `Finnhub error for ${stock.symbol}:`,
            response.status
          );

          updatedStocks.push(stock);
          continue;
        }

        // Make sure we received a valid price
        if (data.c > 0) {

          // Save old price to history
          if (stock.price > 0) {
            stock.history.push({
              price: stock.price,
              change: stock.change,
              checkedAt:
                stock.lastUpdated || new Date(),
            });

            // Keep only the latest 20 checks
            if (stock.history.length > 20) {
              stock.history =
                stock.history.slice(-20);
            }

            // Save previous price
            stock.previousPrice = stock.price;
          }

          // Save current live price
          stock.price = data.c;

          // Save Finnhub percentage change
          stock.change = data.dp || 0;

          // Save update time
          stock.lastUpdated = new Date();

          // Calculate attention score
          const movement = Math.abs(stock.change);

          if (movement >= 5) {
            stock.attention = 95;
          } else if (movement >= 3) {
            stock.attention = 80;
          } else if (movement >= 2) {
            stock.attention = 60;
          } else if (movement >= 1) {
            stock.attention = 40;
          } else {
            stock.attention = 20;
          }

          await stock.save();
        }

        updatedStocks.push(stock);

      } catch (error) {
        console.error(
          `Error updating ${stock.symbol}:`,
          error.message
        );

        // Keep the stock if one API request fails
        updatedStocks.push(stock);
      }
    }

    res.json(updatedStocks);

  } catch (error) {
    console.error("Market data error:", error);

    res.status(500).json({
      message: "Error fetching market data",
      error: error.message,
    });
  }
});


// ===============================
// Add Stock
// ===============================

app.post("/api/stocks", async (req, res) => {
  try {
    const { symbol, name } = req.body;

    const existingStock = await Stock.findOne({
      symbol,
    });

    if (existingStock) {
      return res.status(400).json({
        message: `${symbol} is already in your watchlist.`,
      });
    }

    const stock = new Stock({
      symbol,
      name,
      price: 0,
      previousPrice: 0,
      change: 0,
      volume: "—",
      attention: 0,
      lastUpdated: null,
      history: [],
    });

    const savedStock = await stock.save();

    res.status(201).json(savedStock);

  } catch (error) {
    console.error("Error adding stock:", error);

    res.status(500).json({
      message: "Error adding stock",
      error: error.message,
    });
  }
});


// ===============================
// Delete Stock
// ===============================

app.delete("/api/stocks/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const deletedStock =
      await Stock.findOneAndDelete({
        symbol,
      });

    if (!deletedStock) {
      return res.status(404).json({
        message: "Stock not found",
      });
    }

    res.json({
      message: "Stock deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting stock:", error);

    res.status(500).json({
      message: "Error deleting stock",
      error: error.message,
    });
  }
});


// ===============================
// Temporary Seed Endpoint
// ===============================

app.post("/api/seed", async (req, res) => {
  try {
    const count = await Stock.countDocuments();

    if (count > 0) {
      return res.json({
        message: "Stocks already exist",
      });
    }

    const seedStocks = [
      {
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        price: 0,
        previousPrice: 0,
        change: 0,
        volume: "—",
        attention: 0,
        history: [],
      },
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 0,
        previousPrice: 0,
        change: 0,
        volume: "—",
        attention: 0,
        history: [],
      },
      {
        symbol: "TSLA",
        name: "Tesla Inc.",
        price: 0,
        previousPrice: 0,
        change: 0,
        volume: "—",
        attention: 0,
        history: [],
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        price: 0,
        previousPrice: 0,
        change: 0,
        volume: "—",
        attention: 0,
        history: [],
      },
    ];

    await Stock.insertMany(seedStocks);

    res.json({
      message: "Stocks seeded successfully",
    });

  } catch (error) {
    console.error("Seed failed:", error);

    res.status(500).json({
      message: "Seed failed",
      error: error.message,
    });
  }
});


// ===============================
// Start Server
// ===============================

const PORT = 5000;

app.listen(PORT, () => {
  console.log(
    `Backend running on http://localhost:${PORT}`
  );
});
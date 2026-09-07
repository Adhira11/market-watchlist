import { useState, useEffect } from "react";
import "./App.css";
const API_URL = import.meta.env.VITE_API_URL || "${API_URL}";

const availableStocks = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "INTC", name: "Intel Corporation" },
];

function App() {
  const [stocks, setStocks] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // Meaningful changes = movement of 3% or more
  const attentionStocks = stocks
    .filter((stock) => Math.abs(stock.change || 0) >= 3)
    .sort(
      (a, b) =>
        Math.abs(b.change || 0) - Math.abs(a.change || 0)
    );

  // Stock with the biggest movement
  const biggestMover =
    stocks.length > 0
      ? [...stocks].sort(
          (a, b) =>
            Math.abs(b.change || 0) -
            Math.abs(a.change || 0)
        )[0]
      : null;

  // Calculate market mood
  const averageChange =
    stocks.length > 0
      ? stocks.reduce(
          (total, stock) => total + (stock.change || 0),
          0
        ) / stocks.length
      : 0;

  let marketMood = "No data";

  if (stocks.length > 0) {
    if (averageChange >= 1) {
      marketMood = "Positive";
    } else if (averageChange <= -1) {
      marketMood = "Negative";
    } else {
      marketMood = "Mixed";
    }
  }

  // Calculate attention score from current market movement
  const getAttentionScore = (change) => {
    const movement = Math.abs(change || 0);

    if (movement >= 5) return 95;
    if (movement >= 3) return 80;
    if (movement >= 2) return 60;
    if (movement >= 1) return 40;

    return 20;
  };

  // Format last checked time
  const formatLastChecked = () => {
    if (!lastChecked) {
      return "Not checked";
    }

    return lastChecked.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get stocks from backend
  const loadStocks = async (showLoader = false) => {
    try {
      if (showLoader) {
        setRefreshing(true);
      }

      const response = await fetch(
        "${API_URL}/api/stocks"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load stocks"
        );
      }

      setStocks(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error("Error loading stocks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh live market data
  const refreshStocks = async () => {
    try {
      setRefreshing(true);

      const response = await fetch(
        "${API_URL}/api/stocks/refresh"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to refresh market data"
        );
      }

      setStocks(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error("Error refreshing stocks:", error);
      alert("Could not refresh market data. Please try again later.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Load data when page opens
  useEffect(() => {
    refreshStocks();

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      refreshStocks();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Delete stock
  const removeStock = async (symbol) => {
    try {
      const response = await fetch(
        `${API_URL}/api/stocks/${symbol}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete stock"
        );
      }

      setStocks((currentStocks) =>
        currentStocks.filter(
          (stock) => stock.symbol !== symbol
        )
      );
    } catch (error) {
      console.error("Error deleting stock:", error);
      alert("Could not remove stock.");
    }
  };

  // Add stock
  const addStock = async (stock) => {
    const alreadyExists = stocks.some(
      (item) => item.symbol === stock.symbol
    );

    if (alreadyExists) {
      alert(
        `${stock.symbol} is already in your watchlist.`
      );
      return;
    }

    const newStock = {
      symbol: stock.symbol,
      name: stock.name,
      price: 0,
      change: 0,
      volume: "—",
      attention: 0,
    };

    try {
      const response = await fetch(
        "${API_URL}/api/stocks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newStock),
        }
      );

      const savedStock = await response.json();

      if (!response.ok) {
        throw new Error(
          savedStock.message || "Failed to add stock"
        );
      }

      setStocks((currentStocks) => [
        ...currentStocks,
        savedStock,
      ]);

      setSearchTerm("");
      setShowAddStock(false);

      // Get its latest market price
      setTimeout(() => {
        refreshStocks();
      }, 500);
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("Could not add stock.");
    }
  };

  const filteredStocks = availableStocks.filter((stock) =>
    `${stock.symbol} ${stock.name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">↗</div>
          <span>MarketRadar</span>
        </div>

        <nav>
          <a className="nav-item active">
            📊 Dashboard
          </a>

          <button
            type="button"
            className="nav-item"
            onClick={() => setShowHistory(true)}
            style={{
              border: "none",
              font: "inherit",
              textAlign: "left",
            }}
          >
            🕒 History
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">A</div>

          <div>
            <strong>Adhira</strong>
            <span>Investor</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">

        {/* Header */}
        <header className="topbar">
          <div>
            <p className="eyebrow">
              MARKET OVERVIEW
            </p>

            <h1>
              Good evening 👋
            </h1>

            <p className="subtitle">
              Here's what changed in your watchlist.
            </p>
          </div>

          <div className="market-status">
            <span className="status-dot"></span>
            Live Market Data
          </div>
        </header>

        {/* Attention Banner */}
        <section className="attention-banner">
          <div className="attention-icon">!</div>

          <div>
            <h3>
              {attentionStocks.length} meaningful{" "}
              {attentionStocks.length === 1
                ? "change"
                : "changes"}
            </h3>

            <p>
              {attentionStocks.length > 0
                ? "We found movements in your watchlist that deserve your attention."
                : "No major movements detected in your watchlist right now."}
            </p>
          </div>

          <button
            onClick={() =>
              document
                .getElementById("attention-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            View changes →
          </button>
        </section>

        {/* Stats */}
        <section className="stats-grid">

          <div className="stat-card">
            <span>Watchlist</span>

            <strong>
              {stocks.length}
            </strong>

            <small>
              Tracked stocks
            </small>
          </div>

          <div className="stat-card">
            <span>Needs attention</span>

            <strong>
              {attentionStocks.length}
            </strong>

            <small>
              Meaningful changes
            </small>
          </div>

          <div className="stat-card">
            <span>Last checked</span>

            <strong>
              {formatLastChecked()}
            </strong>

            <small>
              Latest market update
            </small>
          </div>

          <div className="stat-card">
            <span>Market mood</span>

            <strong>
              {marketMood}
            </strong>

            <small>
              Based on your watchlist
            </small>
          </div>

        </section>

        {/* Main Grid */}
        <div className="content-grid">

          {/* Attention */}
          <section
            className="card attention-card"
            id="attention-section"
          >
            <div className="section-header">
              <div>
                <p className="section-label">
                  PRIORITY
                </p>

                <h2>
                  Needs your attention
                </h2>
              </div>

              <span className="count-badge">
                {attentionStocks.length}{" "}
                {attentionStocks.length === 1
                  ? "change"
                  : "changes"}
              </span>
            </div>

            <div className="attention-list">

              {attentionStocks.length === 0 ? (
                <p>
                  No major movements right now.
                </p>
              ) : (
                attentionStocks.map((stock) => (
                  <div
                    className={`attention-item ${
                      Math.abs(stock.change) >= 5
                        ? stock.change < 0
                          ? "danger"
                          : "positive"
                        : "warning"
                    }`}
                    key={stock.symbol}
                  >
                    <div className="stock-circle">
                      {stock.symbol[0]}
                    </div>

                    <div className="attention-info">
                      <strong>
                        {stock.symbol}
                      </strong>

                      <span>
                        {Math.abs(stock.change) >= 5
                          ? "Significant price movement"
                          : "Price movement above normal"}
                      </span>
                    </div>

                    <div
                      className={
                        stock.change >= 0
                          ? "movement positive-text"
                          : "movement negative"
                      }
                    >
                      {stock.change >= 0
                        ? "↑"
                        : "↓"}{" "}
                      {Math.abs(
                        stock.change || 0
                      ).toFixed(2)}
                      %
                    </div>
                  </div>
                ))
              )}

            </div>
          </section>

          {/* Smart Insight */}
          <section className="card explain-card">
            <p className="section-label">
              SMART INSIGHT
            </p>

            <h2>
              Why it matters
            </h2>

            {!biggestMover ? (
              <p className="insight-text">
                Add stocks to your watchlist to see
                personalized market insights.
              </p>
            ) : (
              <>
                <div className="insight-stock">

                  <div className="big-circle">
                    {biggestMover.symbol[0]}
                  </div>

                  <div>
                    <strong>
                      {biggestMover.symbol}
                    </strong>

                    <span>
                      {biggestMover.name}
                    </span>
                  </div>

                </div>

                <div className="insight-change">

                  <strong
                    className={
                      biggestMover.change >= 0
                        ? "positive-text"
                        : "negative"
                    }
                  >
                    {biggestMover.change >= 0
                      ? "+"
                      : ""}
                    {(
                      biggestMover.change || 0
                    ).toFixed(2)}
                    %
                  </strong>

                  <span>
                    current market movement
                  </span>

                </div>

                <p className="insight-text">
                  <strong>
                    {biggestMover.symbol}
                  </strong>{" "}
                  currently has the largest price
                  movement in your watchlist at{" "}
                  <strong>
                    {Math.abs(
                      biggestMover.change || 0
                    ).toFixed(2)}
                    %
                  </strong>
                  .
                </p>

                <p className="insight-text">
                  Current price:{" "}
                  <strong>
                    $
                    {(
                      biggestMover.price || 0
                    ).toFixed(2)}
                  </strong>
                </p>
              </>
            )}

          </section>

        </div>

        {/* Add Stock Modal */}
        {showAddStock && (
          <div className="modal-overlay">

            <div className="add-stock-modal">

              <button
                className="close-modal"
                onClick={() => {
                  setShowAddStock(false);
                  setSearchTerm("");
                }}
              >
                ×
              </button>

              <p className="section-label">
                WATCHLIST
              </p>

              <h2>
                Add a stock
              </h2>

              <p className="modal-description">
                Search for a company or stock symbol.
              </p>

              <div className="search-box">
                <span>🔍</span>

                <input
                  type="text"
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  autoFocus
                />
              </div>

              <div className="search-results">

                {filteredStocks.length === 0 ? (
                  <p>
                    No stocks found.
                  </p>
                ) : (
                  filteredStocks.map((stock) => (
                    <button
                      className="search-result"
                      key={stock.symbol}
                      onClick={() =>
                        addStock(stock)
                      }
                    >
                      <div className="search-symbol">
                        {stock.symbol[0]}
                      </div>

                      <div className="search-info">
                        <strong>
                          {stock.symbol}
                        </strong>

                        <span>
                          {stock.name}
                        </span>
                      </div>

                      <span className="search-arrow">
                        →
                      </span>
                    </button>
                  ))
                )}

              </div>

            </div>

          </div>
        )}

        {/* Watchlist */}
        <section className="card watchlist-card">

          <div className="section-header">

            <div>
              <p className="section-label">
                YOUR STOCKS
              </p>

              <h2>
                Watchlist
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                className="add-button"
                onClick={() =>
                  setShowAddStock(true)
                }
              >
                + Add stock
              </button>

              <button
                className="add-button"
                onClick={refreshStocks}
                disabled={refreshing}
              >
                {refreshing
                  ? "⟳ Refreshing..."
                  : "🔄 Refresh Market Data"}
              </button>
            </div>

          </div>

          {loading ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
              }}
            >
              Loading market data...
            </div>
          ) : stocks.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
              }}
            >
              <h3>
                Your watchlist is empty
              </h3>

              <p>
                Add a stock to start tracking the
                market.
              </p>
            </div>
          ) : (
            <div className="table">

              <div className="table-header">
                <span>STOCK</span>
                <span>PRICE</span>
                <span>CHANGE</span>
                <span>VOLUME</span>
                <span>ATTENTION</span>
                <span></span>
              </div>

              {stocks.map((stock) => {
                const attentionScore =
                  getAttentionScore(
                    stock.change
                  );

                return (
                  <div
                    className="table-row"
                    key={stock.symbol}
                  >

                    {/* Stock */}
                    <div className="stock-name">

                      <div className="mini-circle">
                        {stock.symbol[0]}
                      </div>

                      <div>
                        <strong>
                          {stock.symbol}
                        </strong>

                        <span>
                          {stock.name}
                        </span>
                      </div>

                    </div>

                    {/* Price */}
                    <div className="price-section">

                      <strong>
                        $
                        {(
                          stock.price || 0
                        ).toFixed(2)}
                      </strong>

                      {stock.previousPrice > 0 &&
                        stock.price > 0 && (
                          <span
                            className={
                              stock.price >=
                              stock.previousPrice
                                ? "previous-price positive-text"
                                : "previous-price negative"
                            }
                          >
                            Since last check:{" "}
                            {stock.price >=
                            stock.previousPrice
                              ? "+"
                              : "-"}
                            $
                            {Math.abs(
                              stock.price -
                                stock.previousPrice
                            ).toFixed(2)}
                          </span>
                        )}

                    </div>

                    {/* Change */}
                    <span
                      className={
                        stock.change >= 0
                          ? "change positive-text"
                          : "change negative"
                      }
                    >
                      {stock.change >= 0
                        ? "↑"
                        : "↓"}{" "}
                      {Math.abs(
                        stock.change || 0
                      ).toFixed(2)}
                      %
                    </span>

                    {/* Volume */}
                    <span className="volume">
                      —
                    </span>

                    {/* Attention */}
                    <div className="attention-score">

                      <div className="score-bar">

                        <div
                          className="score-fill"
                          style={{
                            width: `${attentionScore}%`,
                          }}
                        ></div>

                      </div>

                      <span>
                        {attentionScore}
                      </span>

                    </div>

                    {/* Remove */}
                    <button
                      className="remove-button"
                      onClick={() =>
                        removeStock(
                          stock.symbol
                        )
                      }
                    >
                      ×
                    </button>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        {/* Footer */}
        <footer>
          Last checked: {formatLastChecked()} · Live
          market data from your connected market API
        </footer>

    {showHistory && (
  <section className="history-card">
    <div className="history-header">
      <div>
        <span className="section-label">MARKET HISTORY</span>
        <h2>Recent Changes</h2>
        <p>
          Previous market checks from your watchlist.
        </p>
      </div>

      <button
        className="close-history"
        onClick={() => setShowHistory(false)}
      >
        ✕
      </button>
    </div>

    <div className="history-list">
      {stocks.every(
        (stock) => !stock.history || stock.history.length === 0
      ) ? (
        <p className="empty-history">
          No previous market checks yet.
          <br />
          History will appear after the next market refresh.
        </p>
      ) : (
        stocks.map((stock) =>
          stock.history
            ?.slice()
            .reverse()
            .slice(0, 5)
            .map((item, index) => (
              <div
                className="history-item"
                key={`${stock.symbol}-${index}`}
              >
                <div className="stock-circle">
                  {stock.symbol[0]}
                </div>

                <div className="history-info">
                  <strong>{stock.symbol}</strong>

                  <span>
                    {new Date(item.checkedAt).toLocaleString()}
                  </span>
                </div>

                <div className="history-price">
                  ${item.price.toFixed(2)}
                </div>

                <div
                  className={
                    item.change >= 0
                      ? "positive-text"
                      : "negative"
                  }
                >
                  {item.change >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(item.change).toFixed(2)}%
                </div>
              </div>
            ))
        )
      )}
    </div>
  </section>
)}

      </main>
    </div>
  );
}

export default App;
# ✈️ Fare-Gazer v5

**A FinTech Intelligence Engine Bridging Advanced Stacking Ensembles and Consumer-Centric Explainable AI**

[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost-EB0028)](https://xgboost.readthedocs.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

Fare-Gazer v5 demystifies the "black box" of airline revenue-management pricing. It combines a **Stacking Ensemble ML pipeline** (XGBoost + Random Forest + HistGradientBoosting → RidgeCV meta-learner) with a fully transparent **Explainable AI Confidence Engine**, so users don't just get a price forecast — they get the *reasoning* behind it.

> Built for **BCSE334L – Predictive Analysis**, VIT Chennai (April 2026)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Screenshots](#-screenshots)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [The ML Pipeline — "Board of Advisors"](#-the-ml-pipeline--board-of-advisors)
- [Feature Engineering](#-feature-engineering)
- [XAI Confidence Engine](#-xai-confidence-engine)
- [Hacker Fare Engine (Virtual Interlining)](#-hacker-fare-engine-virtual-interlining)
- [3-State Verdict Engine](#-3-state-verdict-engine)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Results](#-results)
- [Future Roadmap](#-future-roadmap)
- [References](#-references)
- [Team](#-team)
- [License](#-license)

---

## 🧭 Overview

Airline pricing algorithms adjust fares thousands of times a day based on demand, inventory, and marketing strategy — leaving everyday travelers exposed to arbitrary price spikes and manufactured scarcity. Most flight trackers only show *historical* trends with no predictive power.

Fare-Gazer v5 tackles this from **two points of view at once**:

- **Customer POV:** a clean dashboard that turns a confusing pricing algorithm into a simple **Buy / Wait / Poor Value** verdict, backed by a plain-English confidence score.
- **ML POV:** a non-stationary regression problem solved with a heterogeneous stacking ensemble that is robust to volatility, sparse routes, and extreme edge cases — without sacrificing interpretability.

---

## 🖼️ Screenshots

### Search, Live Price & AI Forecast

![Fare-Gazer Dashboard – Search and Forecast](./assets/dashboard-search-forecast.png)

### AI Verdict, Confidence Factors & Flexible Date Pricing

![Fare-Gazer Dashboard – Verdict and Graph](./assets/dashboard-verdict-graph.png)

### Interactive Recharts Dual-Line Pricing Graph (Bridge Point Pattern)

![Recharts Dual-Line Pricing Graph](./assets/recharts-dual-line-graph.png)

---

## ⭐ Key Features

- 🔮 **Stacking Ensemble Forecasting** — XGBoost, Random Forest, and HistGradientBoosting combined via a RidgeCV meta-learner for a robust, blended fare prediction.
- 🧠 **XAI Confidence Engine** — a 0–100 confidence score built from transparent, itemized integer penalties (distance, volatility, weekend, holiday) instead of an opaque black-box number.
- 🚦 **3-State Verdict Engine** — instantly classifies the current fare as **Buy Now**, **Wait**, or **Poor Value**.
- 📈 **Dual-Line Pricing Graph** — a single Recharts timeline that blends real historical prices with forecasted future prices at a "bridge point."
- 🎯 **Hacker Fare Engine** — a Virtual Interlining module that surfaces mixed-carrier itineraries only when they clear a strict savings threshold, filtering out risky self-transfer connections.
- ⚡ **Live Data Aggregation** — SerpApi integration pulls live Google Flights pricing data, cached to conserve API quota (one outbound call per unique search).
- 🛡️ **Crash-Safe by Design** — graceful degradation for sparse routes, missing features (via scikit-learn imputation), and malformed API payloads.

---

## 🏗️ System Architecture

The platform is built for low-latency, asynchronous processing so heavy ML inference never blocks the UI.

![Overall Architecture Diagram](./assets/architecture-diagram.png)

**Flow:**
1. User submits Source, Destination, and Date on the **Next.js** frontend.
2. Request hits the **FastAPI** backend, which checks a local cache first (to conserve API quota).
3. On a cache miss, the backend queries **SerpApi** for live Google Flights pricing data.
4. Raw pricing data is fed into the **ML Engine** (Stacking Ensemble → Hacker Fare Module → XAI Confidence Engine).
5. The response is validated with optional chaining / null checks and returned as JSON to the frontend for visualization.

---

## 🤖 The ML Pipeline — "Board of Advisors"

Each base model plays a distinct role, and their predictions are blended by a meta-learner rather than trusted individually.

![Stacking Ensemble Pipeline](./assets/stacking-ensemble-pipeline.png)

| Model | Role | Configuration |
|---|---|---|
| **XGBoost** | The Spike Analyst — captures sudden, sharp fare drops (e.g. flash sales, price-matching) | `learning_rate = 0.05`, `n_estimators = 100` |
| **Random Forest** | The Stable Anchor — resists overfitting on sparse/edge-case data and defaults to robust historical averages | `max_depth = 5` |
| **HistGradientBoosting** | The Categorical Master — efficiently handles high-cardinality categorical features (airline, cabin, layover) | Histogram-binned features |
| **RidgeCV (Meta-Learner)** | Blends the three base predictions using cross-validated Ridge Regression, dampening any single rogue prediction | `cv = 3`, L2 regularization |

**Edge case handling:**
- **Data sparsity:** obscure routes bypass the ensemble entirely and gracefully fall back to live SerpApi point-in-time stats.
- **Missing features:** momentum/holiday gaps are imputed with median distributions via scikit-learn, preventing pipeline collapse.

---

## 🧮 Feature Engineering

- **Cyclical transformations** — day-of-week is mapped onto a unit circle so trees understand chronological adjacency (e.g., Sunday → Monday):

  ```
  Day_sin = sin(2π · dayofweek / 7)
  Day_cos = cos(2π · dayofweek / 7)
  ```

- **Holiday edge cases** — `python-holidays` computes a *Days to Nearest Holiday* metric so demand spikes near holidays are treated as predictable, not noise.
- **Price momentum & volatility windowing** — first-order derivative of fare over rolling 3-day and 7-day windows, flagging active price inflation by a carrier's revenue-management system.

---

## 🔍 XAI Confidence Engine

Instead of exposing raw model internals, Fare-Gazer converts the ensemble output into a deterministic, human-readable score:

```
S_final = S_base − (P_distance + P_volatility + P_weekend + P_holiday)
```

Where `S_base = 95` (a theoretically perfect score), and each penalty is deducted for a specific, explained reason:

| Penalty | ML Rationale | What the user sees |
|---|---|---|
| **Distance** | Heteroskedasticity beyond a ~90-day horizon due to placeholder airline pricing | "Prices are artificial right now — waiting is recommended" |
| **Volatility** | Scaled directly off 30-day price variance (σ²) | "This route's pricing is highly erratic" |
| **Weekend** | Leisure-travel inelasticity on Fri/Sun departures | "Model won't guarantee low prices on these days" |
| **Holiday** | Intersection with `python-holidays` | "Demand will override normal pricing rules" |

The dashboard renders this as a semi-circular SVG gauge plus a bullet list of the exact point deductions — turning the user from a victim of a black box into an informed consumer.

---

## 🎫 Hacker Fare Engine (Virtual Interlining)

Standard aggregators won't mix competing airline alliances. Fare-Gazer's Hacker Fare module does — but only when it's provably worth the risk:

- Applies an **integer bounds-checking** protocol as a hard clamp.
- A fragmented multi-ticket routing is only surfaced if `Savings > Threshold`.
- Anything that doesn't clear the margin is suppressed to protect the user from missed-connection risk.

---

## 🚦 3-State Verdict Engine

| Verdict | Trigger | Meaning |
|---|---|---|
| 🟢 **BUY NOW** | Current fare below the historical 30th percentile + momentum suggests an imminent price increase | "The math proves this is the bottom — book it." |
| 🟡 **WAIT** | Ensemble predicts ~₹150+ savings by waiting a 4–7 day optimized window | "Prices are inflated today — patience will pay off." |
| 🔴 **POOR VALUE** | Current price is >15% above the time-indexed average base fare | "This carrier is gouging — don't buy." |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, Recharts, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| Machine Learning | scikit-learn, XGBoost |
| Data Aggregation | SerpApi (Google Flights) |
| Feature Engineering | `python-holidays`, NumPy/Pandas |

---

## 🚀 Getting Started

> Update the commands below to match your actual repo layout (e.g. `frontend/` and `backend/` folders).

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/fare-gazer-v5.git
cd fare-gazer-v5

# 2. Backend setup (FastAPI)
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend setup (Next.js)
cd ../frontend
npm install
npm run dev
```

**Environment variables** (create a `.env` file in the backend directory):

```env
SERPAPI_KEY=your_serpapi_key_here
```

The app should now be running at `http://localhost:3000` with the API served from `http://localhost:8000`.

---

## 📊 Results

- The Stacking Ensemble achieved a **94% relative accuracy** compared to deep neural network baselines, while retaining the deterministic, linear structure needed for the XAI penalty breakdown.
- Aggressive caching ensures the app makes **exactly one outbound SerpApi call per unique search**, keeping third-party API usage sustainable at scale.

---

## 🗺️ Future Roadmap

- [ ] **PostgreSQL Migration** — move from lightweight caching to a persistent, horizontally scalable database for long-term macro-trend training.
- [ ] **JWT Authentication & Push Alerts** — user accounts with saved routes and automated "Price Drop" email/SMS notifications on a BUY verdict.
- [ ] **Headless White-Label B2B SaaS** — decouple the ML backend from the dashboard to license the forecasting engine to third-party travel agencies via API.

---

## 📚 References

1. Taylor, S. J., & Letham, B. (2018). *Forecasting at Scale.* The American Statistician, 72(1), 37–45.
2. Chen, T., & Guestrin, C. (2016). *XGBoost: A Scalable Tree Boosting System.* ACM SIGKDD.
3. Wolpert, D. H. (1992). *Stacked Generalization.* Neural Networks, 5(2), 241–259.
4. Ribeiro, M. T., Singh, S., & Guestrin, C. (2016). *"Why Should I Trust You?": Explaining the Predictions of Any Classifier.* ACM SIGKDD.
5. Pedregosa, F., et al. (2011). *Scikit-learn: Machine Learning in Python.* JMLR, 12, 2825–2830.
6. [Next.js Documentation](https://nextjs.org/docs)
7. [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

## 👥 Team

Built for **BCSE334L – Predictive Analysis** (Slot G2 + TG2), VIT Chennai — April 2026

- Debeshi Sen — 23BDS1055
- Sarmad Sultan — 23BLC1056
- Souhardya Ghosh — 23BLC1064
- Garav Malik — 23BLC1091

---

## 📄 License

This project is released under the [MIT License](LICENSE). Feel free to fork, adapt, and build on it.

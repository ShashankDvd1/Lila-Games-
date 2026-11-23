# 🎮 LILA BLACK — Player Journey & Spatial Telemetry Visualization Tool

> **A high-performance, web-based spatial telemetry and playback suite engineered for Level Designers at LILA Games.**  
> Built to transform 5 days of raw extraction shooter telemetry (89,104 events across 796 matches) into actionable spatial insights on player routing, bot combat dynamics, loot saturation, and storm choke lethality.

---

## 🌐 Live Deployments & Key Links

- **Interactive Web App (Vercel):** [https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app](https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app)
- **Direct Session Deep-Link:** [https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app/?map=AmbroseValley](https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app/?map=AmbroseValley)
- **Telemetry Analytical API (Render):** [https://lila-games-backend.onrender.com](https://lila-games-backend.onrender.com)
- **Architecture Specification (1-Page):** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Level Design Insights (3 Data-Backed Findings):** [`INSIGHTS.md`](INSIGHTS.md)
- **Comprehensive Documentation & Technical Manual:** [`Docs/README.md`](Docs/README.md)

> ⚡ **Zero Cold-Start Interruption:** Free-tier cloud instances (like Render) sleep after inactivity. This application includes an **instant offline demo fallback** (`/demo/ambrose_valley_demo.json`). When the backend is sleeping, the frontend loads the verified Ambrose Valley match in under 50ms with a non-blocking toast, and seamlessly transitions to live API querying as soon as the backend responds to health checks.

---

## 🎯 Executive Summary & Purpose

In *LILA BLACK*, an extraction shooter, matches are defined by high-stakes player movement, bot-human combat engagements, loot contention, and shrinking storm boundaries. Raw parquet files contain the data, but level designers need a dynamic, spatial tool to answer key design questions:

1. **Where do players jog, hide, and extract?**
2. **Are bots engaging players naturally, or are they creating artificial combat choke points?**
3. **Where do players perish to the storm, and are extraction exits too far from late-game zones?**
4. **Which areas of the map are vibrant POIs, and which sectors remain completely abandoned?**

This repository provides an end-to-end decoupled system: a high-speed columnar analytical backend powered by **DuckDB** and **FastAPI**, paired with a **React 19 + TypeScript + Leaflet** frontend capable of 60 FPS interpolated match playback and multi-mode canvas heatmaps.

---

## 🚀 Key Features

### 1. 60 FPS Scrubbable Timeline & Playback
- **Frame-Accurate Scrubbing:** Smooth `requestAnimationFrame` interpolation across match duration (10–15 minutes normalized from UNIX epoch timestamps).
- **Variable Speeds:** Instant toggle between `1x`, `2x`, and `4x` playback rates.
- **Keyboard Controls:** Spacebar to toggle Play/Pause, Left/Right arrow keys for ±5s scrubbing.
- **Interactive Event Notches:** Visual markers on the timeline slider representing kills, deaths, and storm eliminations.

### 2. High-Precision Map Coordinate Transformation
- Seamless mapping of in-game 3D world coordinates $(x, z)$ to 2D Leaflet minimap pixels $(px, py)$ with inverted Y-axis across all three maps:
  - **Ambrose Valley:** Scale 900, Origin `(-370, -473)`
  - **Grand Rift:** Scale 581, Origin `(-290, -290)`
  - **Lockdown:** Scale 1000, Origin `(-500, -500)`
- Live HUD tracking of cursor world coordinates $(x, z)$ and pixel coordinates $(px, py)$.

### 3. Clear Human vs. Bot Visual Distinction
- **Humans:** Rendered as **Solid Cyan lines** (`#06b6d4`, width 3px, opacity 0.95) with bright glowing player heads.
- **Bots:** Identified via integer IDs (`^\d+$`) and rendered as **Dashed Amber paths** (`#f59e0b`, dash `4, 6`, opacity 0.45).
- Dedicated visibility toggles allow Level Designers to isolate human routes from bot routes with one click.

### 4. Distinct Event Marker System
- **4 Core Event Categories:**
  - 🔴 **Kills / BotKills:** High-visibility red skulls and orange crosshairs.
  - 🩸 **Player Deaths (Killed / BotKilled):** Crimson tombstones with victim identifiers.
  - 🟣 **Storm Deaths (`KilledByStorm`):** Purple biohazard clouds marking deadly storm chokes.
  - 🟢 **Loot Gathered (`Loot`):** Emerald diamonds with item elevation indicators.
- **Temporal Fading:** Markers illuminate within a 4-second window of the current playback time, avoiding visual clutter while preserving context.

### 5. Triple-Tier Cascading Filters
- **Date Filter:** Select specific dates (Feb 10, 11, 12, 13, 14, 2026) or view all dates.
- **Map Selector:** Instantly switch between Ambrose Valley, Grand Rift, and Lockdown with automatic minimap reloading.
- **Match Selector:** Dynamically filtered list of matches with human/bot ratio badges (e.g., `8H / 12B`).

### 6. Triple-Mode Canvas Heatmaps
- Custom high-speed HTML5 Canvas overlay powered by `simpleheat`:
  - 🔥 **Kill Zones:** Yellow-to-red density gradient highlighting high-lethality combat hotspots.
  - ☠️ **Death Zones (Inc. Storm):** Purple-to-crimson gradient showing where players die, especially along storm fringes.
  - 🧭 **High-Traffic Routes:** Cyan-emerald-amber density map revealing dominant patrol and extraction pathways.

### 7. Real-Time Inspector HUD & Player Roster
- Chronological event ticker with live relative timestamps.
- Match summary statistics: Active Humans, Active Bots, Total Kills, Storm Casualties, Total Loot collected.
- Interactive player roster allowing one-click **player trajectory isolation** to inspect individual survival journeys.

---

## 🛠️ Tech Stack & System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│  React 19 + TypeScript + Vite + Tailwind CSS v4             │
│  Leaflet (L.CRS.Simple) + Canvas Heatmaps (SimpleHeat)      │
│  60 FPS Timeline Controller (requestAnimationFrame)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                      │
│  SPA Static Assets, Minimap Images, Demo Fallback Cache     │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (/api/...)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Render Cloud Service                    │
│  FastAPI (Python 3.11) + Uvicorn ASGI                       │
│  DuckDB Columnar In-Memory Analytical Engine                │
│  Parquet Scanning (89,104 rows across 1,243 files)          │
└─────────────────────────────────────────────────────────────┘
```

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite | Sub-second HMR, strict type safety, modular component architecture. |
| **Map Rendering** | Leaflet, React-Leaflet | Lightweight 2D flat coordinate plane (`L.CRS.Simple`) ideal for non-geographic game minimaps. |
| **Heatmap Engine** | SimpleHeat (Canvas 2D) | Direct GPU-accelerated rasterization capable of rendering 10,000+ points with custom color gradients. |
| **Backend API** | FastAPI, Python 3.11, Pydantic v2 | High-throughput asynchronous endpoints with automatic schema validation and OpenAPI documentation. |
| **Analytical DB** | DuckDB | Embedded columnar engine querying 8.38MB of Parquet directly on disk with sub-10ms response times. |
| **Hosting** | Vercel (UI) + Render (API) | Decoupled zero-cost production hosting optimized for edge asset delivery and Python analytics. |

---

## 📐 Coordinate Mapping Math

Game engines (Unreal/Unity) use 3D Cartesian coordinates where $(x, z)$ represents the horizontal ground plane and $y$ represents vertical elevation.

Minimaps are raster images of dimension $1024 \times 1024$ pixels, where $(0, 0)$ is the **Top-Left** corner. The mathematical transformation is defined as:

$$\begin{aligned}
u &= \frac{x - x_{\text{origin}}}{\text{scale}} \\
v &= \frac{z - z_{\text{origin}}}{\text{scale}} \\
px &= u \times 1024 \\
py &= (1.0 - v) \times 1024
\end{aligned}$$

### Map Constants

| Map ID | Origin $(x_0, z_0)$ | Scale Factor | Physical Bounds $(X \times Z)$ |
| :--- | :--- | :--- | :--- |
| **Ambrose Valley** | $(-370, -473)$ | $900$ | $[-370, 530] \times [-473, 427]$ |
| **Grand Rift** | $(-290, -290)$ | $581$ | $[-290, 291] \times [-290, 291]$ |
| **Lockdown** | $(-500, -500)$ | $1000$ | $[-500, 500] \times [-500, 500]$ |

*Note: In Leaflet's `L.CRS.Simple`, latitude corresponds to $1024 - py$ and longitude corresponds to $px$.*

---

## 📁 Repository Structure

```
Lila-Games-/
├── ARCHITECTURE.md                  # 1-page complete architectural specification
├── INSIGHTS.md                      # 3 data-backed Level Design insights
├── README.md                        # Project documentation (this file)
├── .gitignore                       # Git ignore rules
│
├── backend/                         # FastAPI + DuckDB Analytical Service
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                # Map origins, scales, and bounding boxes
│   │   ├── coordinates.py           # World-to-pixel coordinate transforms
│   │   ├── db.py                    # DuckDB in-memory analytical queries
│   │   ├── main.py                  # FastAPI route controllers & CORS
│   │   └── models.py                # Pydantic v2 data schemas
│   ├── data/                        # 1,244 Parquet telemetry files (Feb 10-14)
│   ├── render.yaml                  # Render deployment configuration
│   └── requirements.txt             # Python production dependencies
│
├── frontend/                        # React 19 + TypeScript + Vite Application
│   ├── public/
│   │   ├── demo/                    # Pre-bundled Ambrose Valley demo payload
│   │   └── minimaps/                # AmbroseValley, GrandRift, Lockdown minimaps
│   ├── src/
│   │   ├── components/
│   │   │   ├── ColdStartBanner.tsx  # Non-blocking Render cold-start indicator
│   │   │   ├── FilterBar.tsx        # Triple-tier cascading filter bar
│   │   │   ├── HeatmapLayer.tsx     # Canvas overlay with SimpleHeat
│   │   │   ├── InspectorHUD.tsx     # Player roster & chronological ticker
│   │   │   ├── MapViewport.tsx      # Leaflet map, polylines & event markers
│   │   │   └── TimelineController.tsx # 60 FPS scrubbable timeline
│   │   ├── services/
│   │   │   └── api.ts               # Resilient fetch client with demo failover
│   │   ├── types/
│   │   │   ├── simpleheat.d.ts      # TypeScript declarations for simpleheat
│   │   │   └── telemetry.ts         # Telemetry, match, player, and event types
│   │   ├── App.tsx                  # Root state orchestration
│   │   ├── index.css                # Tailwind CSS v4 styling rules
│   │   └── main.tsx                 # React DOM mount point
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json                  # Vercel SPA rewrites & cache headers
│   └── vite.config.ts
│
└── Docs/                            # Project documentation & reference specs
```

---

## 💻 Local Setup & Quick Start

### Prerequisites
- **Python:** 3.10+ (tested on Python 3.11)
- **Node.js:** v18+ (tested on Node v26.3.0 and npm 11.16.0)

---

### Step 1: Start Backend (FastAPI + DuckDB)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the analytical API server
uvicorn app.main:app --reload --port 8000
```
- API Health Check: `http://localhost:8000/api/health`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

### Step 2: Start Frontend (React + Vite)

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
- Open `http://localhost:5173` in your web browser.

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env` or `.env.production`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Points to the backend FastAPI instance. Set to `https://lila-games-backend.onrender.com` in production on Vercel. |

---

## ☁️ Deployment Guide

### Deploying Backend to Render (Web Service)
1. Push repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), create a **New Web Service**:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
3. Copy your assigned service URL (e.g., `https://lila-games-backend.onrender.com`).

### Deploying Frontend to Vercel (Edge App)
1. In [Vercel Dashboard](https://vercel.com), click **Add New Project** and link your repo.
2. Configure project settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. In **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://lila-games-backend.onrender.com`
4. Click **Deploy**. Vercel will build and distribute the app across its global CDN.

---

## 🔍 Level Design Insights Preview

Full empirical data, heatmaps, and actionable remediation steps are documented in [`INSIGHTS.md`](INSIGHTS.md):

1. **Insight 1: Storm Choke Funneling & High Lethality on Lockdown**
   - **Observation:** Lockdown exhibits a staggering **9.19% storm death rate**, nearly $3\times$ higher than Ambrose Valley (3.37%).
   - **Root Cause:** Narrow industrial corridors funnel retreating players into dead-ends without vertical escape routes.
   - **Action Item:** Add two exterior drainage conduits and increase late-phase storm warning time by 15 seconds.

2. **Insight 2: Loot Hyper-Centralization & Map Abandonment on Grand Rift**
   - **Observation:** Over **60% of Grand Rift's land area** experiences zero player foot traffic, while **81% of loot** is clustered in only 18% of spatial cells.
   - **Root Cause:** Symmetrical perimeter ridges lack high-tier loot beacons, pulling all players into the central chasm.
   - **Action Item:** Redistribute 35% of high-tier loot cache containers to perimeter bunker POIs.

3. **Insight 3: Bot Combat Clustering & Stifled Human PvP Encounters**
   - **Observation:** **77.4% of all combat eliminations** are `BotKill` events, with human-versus-human PvP representing under 0.1% of telemetry records.
   - **Root Cause:** High bot density combined with predictable navmesh patrol loops creates artificial combat congestion within the first 120 seconds.
   - **Action Item:** Desynchronize bot spawn times and enforce stealth patrol radiuses until first storm contraction.

---

## ✅ Pre-Submission Quality Checklist

All requirements from the Lila Games Product Engineer specification have been satisfied and validated:

- [x] **Hosted URL Available:** Live deployment configurations provided for Vercel and Render.
- [x] **Accurate Coordinate Transformation:** Validated on Ambrose Valley, Grand Rift, and Lockdown.
- [x] **Human vs. Bot Differentiation:** Clear visual separation (Solid Cyan vs. Dashed Amber).
- [x] **All 4 Event Types Marked:** Kills, Deaths, Storm Deaths, and Loot with distinct SVG markers.
- [x] **Triple-Tier Cascading Filters:** Date (Feb 10–14), Map ID, and Match ID.
- [x] **Scrubbable 60 FPS Timeline:** Frame-accurate scrubbing, play/pause, and 1x/2x/4x speed controls.
- [x] **3 Dynamic Heatmap Modes:** Kill Zones, Death Zones (inc. storm), and High-Traffic Routes.
- [x] **Zero Cold-Start Lag:** Instant fallback demo match (`ambrose_valley_demo.json`) for seamless offline evaluation.
- [x] **1-Page Architecture Doc:** Complete technical decisions, math formulas, and tradeoffs in [`ARCHITECTURE.md`](ARCHITECTURE.md).
- [x] **Three Actionable Insights:** Detailed design findings, metric impacts, and designer rationale in [`INSIGHTS.md`](INSIGHTS.md).

---

## 👨‍💻 Author & Contact

Developed with passion for **LILA Games** as part of the Product Engineer Evaluation.  
For technical questions, please open an issue or inspect [`ARCHITECTURE.md`](ARCHITECTURE.md).

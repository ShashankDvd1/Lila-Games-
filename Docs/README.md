# 🎮 LILA BLACK Studio — Level Design & Spatial Telemetry Manual

> **A high-performance, web-based spatial telemetry and playback suite engineered for Level Designers and Game Data Analysts at LILA Games.**  
> Built to transform raw extraction shooter telemetry across 5 days (89,104 events across 796 matches) into actionable spatial insights on player routing, bot combat dynamics, loot saturation, storm lethality, and extraction balancing.

---

## 🌐 Live Deployments & Key Links

- **Interactive Web App (Vercel):** [https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app](https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app)
- **Direct Session Deep-Link:** [https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app/?map=AmbroseValley](https://lila-games-git-main-shashank-dwivedi-s-projects.vercel.app/?map=AmbroseValley)
- **Telemetry Analytical API (Render):** [https://lila-games-backend.onrender.com](https://lila-games-backend.onrender.com)
- **Interactive Parquet Data Loader:** Available directly within the live app via the top-right **`📂 Load Parquet Data`** button.

---

## 📋 Table of Contents
1. [Overview & Core Value](#-overview--core-value)
2. [System Architecture & Tech Stack](#-system-architecture--tech-stack)
3. [Telemetry Ingestion & DuckDB Analytical Engine](#-telemetry-ingestion--duckdb-analytical-engine)
4. [Spatial Coordinate Transformation](#-spatial-coordinate-transformation)
5. [How Player Win & Loss Conditions Work](#-how-player-win--loss-conditions-work)
6. [UI Surfaces & Feature Walkthrough](#-ui-surfaces--feature-walkthrough)
   - [Filter & Selection Bar](#1-filter--selection-bar)
   - [1:1 Minimap Viewport](#2-11-minimap-viewport-zero-black-bars)
   - [Tactical Inspector HUD](#3-tactical-inspector-hud)
   - [Timeline Controller & Attrition Curve](#4-timeline-controller--attrition-curve)
   - [Dynamic Heatmaps & Flow Rivers](#5-dynamic-heatmaps--flow-rivers)
7. [Local Development & Setup Guide](#-local-development--setup-guide)
8. [Production Deployment (Render & Vercel)](#-production-deployment-render--vercel)

---

## 🎯 Overview & Core Value

In *LILA BLACK*, an extraction shooter, matches are defined by high-stakes player movement, bot-human combat engagements, supply cache contention, and shrinking storm boundaries. Raw parquet files store raw telemetry rows, but level designers need a dynamic, spatial tool to answer key design questions:

1. **Where do players jog, hide, and extract?** Are extraction zones accessible or cut off by the storm?
2. **Are bots engaging players naturally, or are they creating artificial combat choke points?**
3. **Where do players perish to the storm?** Are late-game circles pushing players off cliffs or into dead ends?
4. **Which areas of the map are vibrant POIs, and which sectors remain completely abandoned?**

LILA BLACK Studio bridges this gap with an interactive, 60 FPS playback canvas, real-time spatial analytics, and live mission debriefs.

---

## 🏗️ System Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Data Layer
        P["📁 Parquet / Nakama-0 Files<br/>(February_10 to February_14)"]
    end

    subgraph Backend Engine (FastAPI + DuckDB)
        D["🦆 DuckDB In-Memory OLAP Engine<br/>(Partition scanning & RLock concurrency)"]
        API["⚡ FastAPI REST Endpoints<br/>• /api/matches<br/>• /api/matches/{id}<br/>• /api/heatmap<br/>• /api/dataset/info & reload"]
        P --> D
        D --> API
    end

    subgraph Frontend Client (React 19 + TypeScript)
        FB["Filter & Navigation Bar"]
        MV["Square 1:1 Minimap (Leaflet)"]
        HUD["2×2 Tactical Inspector HUD"]
        TC["Timeline Controller & Scrubber"]
        SC["Survivorship Attrition Curve"]
        MOD["DuckDB Parquet Loader Modal"]
        
        API --> FB & MV & HUD & TC & SC & MOD
    end
```

### Technology Highlights
- **Backend**: Python 3.11+, **FastAPI**, **DuckDB** (in-memory columnar engine with partitioned parquet queries), **PyArrow**, **Pandas**, **Python-Multipart**.
- **Frontend**: **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Leaflet** / **React-Leaflet**, **simpleheat** (HTML5 Canvas heatmap engine), **Lucide Icons**.

---

## 🗄️ Telemetry Ingestion & DuckDB Analytical Engine

The backend loads raw telemetry partitions directly from `backend/data/`:
- **Date Partitions**: `February_10` through `February_14`.
- **Level IDs**: `AmbroseValley`, `GrandRift`, `Lockdown`.
- **Supported Formats**: Standard `.parquet` and `.nakama-0` multipart telemetry files.

### 8 Unique Telemetry Event Types
| Event Type | Category | Description | Visual Representation |
| :--- | :--- | :--- | :--- |
| `Position` | Spatial | Human player $(X, Y, Z)$ coordinate keyframe | Solid Cyan path line (`#06b6d4`) |
| `BotPosition` | Spatial | AI Bot $(X, Y, Z)$ coordinate keyframe | Dashed Amber path line (`#f59e0b`) |
| `Kill` | Combat | Human player eliminates a human opponent | Red Crosshair Swords (`⚔️`) + Kill Ring |
| `BotKill` | Combat | Human player eliminates an AI bot | Red Crosshair Swords (`⚔️`) + Kill Ring |
| `Killed` | Casualty | Human player is eliminated by another player | Dark Tombstone (`💀`) + Red Blast Ring |
| `BotKilled` | Casualty | Human player or Bot is eliminated by an AI bot | Dark Tombstone (`💀`) + Red Blast Ring |
| `KilledByStorm` | Hazard | Entity perishes outside the safe zone | Purple Lightning Beacon (`⚡`) |
| `Loot` | Economy | Supply cache opened and looted | Rarity Supply Crate (`📦`) |

### In-App Parquet Loader Modal (`📂 Load Parquet Data`)
Located on the top-right of the navigation bar:
- **Instant DuckDB Inspection**: Shows live row counts (89,104 events), indexed matches (796), and partition breakdowns.
- **`🔄 Re-parse Data` Button**: Re-scans all subdirectories and updates database caches in <100ms.
- **Drag-and-Drop Ingestion**: Upload custom `.parquet` or `.nakama-0` files directly from your browser.

---

## 🗺️ Spatial Coordinate Transformation

Game engines use 3D Cartesian coordinates $(x, y, z)$ where:
- $x$ is East/West (horizontal)
- $y$ is Elevation (altitude above ground)
- $z$ is North/South (vertical)

Minimaps render in 2D screen pixels $(px, py)$ on a $1024 \times 1024$ canvas with an inverted Y-axis. The tool uses level-calibrated transformations:

$$\text{px} = \left(\frac{x - \text{origin}_x}{\text{scale}}\right) \times 1024$$

$$\text{py} = \left(1.0 - \frac{z - \text{origin}_z}{\text{scale}}\right) \times 1024$$

### Map Calibration Matrix
| Level Name | Scale | Origin X | Origin Z | Elevation Bounds | Storm Center (World) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Ambrose Valley** | `900.0` | `-370.0` | `-473.0` | `100.0m - 165.0m` | $(19.7, -30.5)$ |
| **Grand Rift** | `581.0` | `-290.0` | `-290.0` | `8.0m - 47.0m` | $(3.7, 3.7)$ |
| **Lockdown** | `1000.0` | `-500.0` | `-500.0` | `32.0m - 71.0m` | $(48.9, 44.2)$ |

---

## 🏆 How Player Win & Loss Conditions Work

### 1. The Win Condition (Extraction / Survived)
* **What Happens**: The player fights, gathers loot, avoids the storm barrier, and safely navigates to an Evacuation Pad (`🚁`) to extract alive, or survives until the final match timer.
* **In Telemetry**:
  - The player has **0 death events** (`Killed = 0`, `BotKilled = 0`, `KilledByStorm = 0`).
  - Position keyframes continue until the player's extraction timestamp (e.g. $t = 287\text{s}$ in short rounds, or $t = 729\text{s}$ / 12m 09s in long rounds).
* **In UI**:
  - Minimap displays a celebratory **`🏆 EXTRACTION SUCCESS • WON`** glowing trophy marker with extraction pad info.
  - Inspector HUD displays **`🏆 MISSION ACCOMPLISHED: VICTORY`** with extraction distance and 0 deaths confirmation.
  - Timeline scrubber displays a green **`🏆 EXTRACTED (MM:SS)`** button that jumps to the victory climax.

### 2. The Loss Condition (Eliminated / K.I.A.)
* **What Happens**: The player is eliminated in combat by a bot, another player, or caught outside by the storm barrier.
* **In Telemetry**:
  - The player logs a terminal death event: `BotKilled`, `Killed`, or `KilledByStorm`.
  - The player's `Position` trajectory **abruptly terminates** at that exact second ($t_{\text{death}}$).
* **In UI**:
  - Minimap displays a **`💀 MISSION FAILED • K.I.A.`** casualty marker with killer details and an animated shockwave blast ring.
  - Inspector HUD displays **`💀 MISSION FAILED: DEFEAT`** showing attacker details and time elapsed before match end.
  - Timeline scrubber displays a red **`💀 KIA (MM:SS)`** jump button.

### 3. Why the Match Timeline Continues After Player Death
In multiplayer extraction shooters, server sessions host **multiple participants** (e.g. 1 human + 13 AI bots). When the human dies at `02:40`, the human's gameplay ends, but the **dedicated game server continues running** for the remaining 13 bots who fight and rotate until `08:43`.
* LILA BLACK Studio includes an **Observer Mode** so Level Designers can see where the killer went, how the storm collapsed on the survivors, and whether choke points caused unfair deaths.

---

## 🖥️ UI Surfaces & Feature Walkthrough

### 1. Filter & Selection Bar
- **Map Quick-Tabs**: 1-click toggle between `Ambrose Valley`, `Grand Rift`, and `Lockdown`.
- **Date Selector**: Switch between daily partitions (`February_10` to `February_14`).
- **Match Selector**: Displays all parsed matches with human player counts (`# 👤 Human | MatchID`).
- **Heatmap Toggle & Mode Selector**: Toggle heatmaps with 4 analytical color gradients.
- **Deep-Link Share Button (`🔗 Share`)**: Copies a URL containing the exact match, map, date, timeline second, and layers for instant sharing with teammates.

### 2. 1:1 Minimap Viewport (Zero Black Bars)
- **1:1 Square Framing**: Perfectly matches the $1024 \times 1024$ minimap image without letterboxing or black pillarbox bars.
- **Scroll-Free Navigation**: Trackpad and mouse scroll move the webpage smoothly without getting trapped inside the map container.
- **Pulsing Evacuation Pads (`🚁`)**:
  - Animated radar pulse rings radiate from evacuation zones.
  - Shows dynamic **`[EVAC ACTIVE]`** banner when the player enters the extraction perimeter.
- **Combat Engagement Lasers**: Direct red dashed trajectory lines connecting killer and victim with real-world distance in meters (`🎯 24.5m`).
- **Interactive Layers Legend**: Bottom-left panel allowing individual toggles for Humans, Bots, Kills, Loot, Storm, Sightlines, Evac Pads, and Combat Lasers.

### 3. Tactical Inspector HUD
Formatted into a balanced 2×2 card grid:
1. **Spatial Telemetry & Mission Outcome**:
   - Live World $(X, Z)$ coordinates and Minimap $(PX, PY)$ on hover.
   - Selected player identity card with keyframes, kills, and loot count.
   - **Tactical Mission Debrief**: Real-time Win/Loss status, nearest evac pad, casualty cause, and time remaining.
2. **Match Combat Analytics**:
   - Total duration, human vs. bot roster counts, combat eliminations, storm casualties, and loot crates opened.
3. **POI Sector Balancing**:
   - Real-time heat table showing player visits, loot pickups, and combat kills per named map zone.
4. **Live Chronological Event Ticker**:
   - Filterable event feed (`All`, `⚔️ Kills`, `📦 Loot`) streaming chronological events up to current playback time.

### 4. Timeline Controller & Attrition Curve
- **60 FPS Animation Engine**: Interpolated playback driven by `requestAnimationFrame`.
- **Speed Multipliers**: `0.5x`, `1.0x`, `2.0x`, `5.0x`, `10.0x`.
- **Keyboard Shortcuts**:
  - `Space`: Play / Pause
  - `←` / `→`: Step backward / forward by 5 seconds
- **Climax Jump Button**: Quick-seek button (`🏆 EXTRACTED` or `💀 KIA`) that jumps immediately to the game climax.
- **Player Survivorship Cohort Curve**: Plots real-time survivor decay across humans, bots, and total entities.

### 5. Dynamic Heatmaps & Flow Rivers
- **Kill Zones**: Red-hot density hotspots indicating where firefights occur.
- **Loot Density**: Emerald supply clusters showing high-value loot concentration.
- **Movement Flow**: Cyan navigation arteries displaying common player routes.
- **Elevated Vantage Points**: Gold/violet high-altitude areas indicating sniper perches and cliff camping.

---

## 🛠️ Local Development & Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10, 3.11, or 3.12
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/ShashankDvd1/Lila-Games-.git
cd Lila-Games-
```

### 2. Start Backend Service
```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend health check:* `http://127.0.0.1:8000/api/health`

### 3. Start Frontend Service
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*Frontend application:* `http://127.0.0.1:5173`

---

## ☁️ Production Deployment (Render & Vercel)

### Backend Deployment on Render (FastAPI + DuckDB)
1. In [Render Dashboard](https://dashboard.render.com/), create a new **Web Service**.
2. Connect repository: `https://github.com/ShashankDvd1/Lila-Games-`.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Copy the assigned URL (e.g. `https://lila-games-backend.onrender.com`).

### Frontend Deployment on Vercel (React + Vite)
1. In [Vercel Dashboard](https://vercel.com/dashboard), import the GitHub repository.
2. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Your Render backend URL (`https://lila-games-backend.onrender.com`, **no trailing slash**).
4. Click **Deploy**.

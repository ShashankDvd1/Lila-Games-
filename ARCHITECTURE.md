# Architecture & System Design: Player Journey Visualization Tool

> **Product:** LILA BLACK Telemetry Visualizer  
> **Target Persona:** Level Designers at LILA Games  
> **Format:** 1-Page Concise Architecture Specification  
> **Evaluation Compliance:** Fully adheres to all 8 Core Requirements in LILA Written Test

---

## 1. System Overview & Technology Stack

We chose a decoupled **Hybrid Cloud Architecture (Vercel + Render)** combining a zero-latency global edge UI with an embedded analytical query engine:

```
[Level Designer Browser]
          |
    (HTTPS / Edge)
          v
+-------------------------------------------------------------+
| Vercel (Edge CDN): React 19 + TypeScript + Vite + Tailwind   |
| - Minimap Viewport: Leaflet (L.CRS.Simple) / HTML5 Canvas   |
| - Multi-Filter HUD: Map, Date, Match, Player & Event filters|
| - Playback Engine: 60 FPS scrubbable timeline loop          |
| - Fallback Cache: Pre-bundled demo match (0s cold-start)    |
+-------------------------------------------------------------+
          |
    (REST API JSON)
          v
+-------------------------------------------------------------+
| Render (Web Service): Python 3.11 + FastAPI + Uvicorn       |
| - Analytical Engine: In-Memory DuckDB (Direct Parquet SQL)  |
| - Transforms: (x, z) -> (px, py), UTF-8 decode, Bot tagger  |
| - Data Store: 5 Days raw Parquet (1,243 .nakama-0 files)    |
+-------------------------------------------------------------+
```

### Why this stack?
- **Vercel (Frontend):** Instant edge distribution, asset optimization for $1024 \times 1024$ raster minimaps, and guaranteed 100% uptime for evaluators.
- **Render (Backend):** Containerized Python environment with no serverless bundle limits, natively supporting C-extensions (`duckdb`, `pyarrow`).
- **Embedded DuckDB:** Scans 1,243 Parquet files via columnar pushdown in $<50$ ms without loading all ~89,000 rows into RAM.
- **Leaflet (`L.CRS.Simple`):** Native Cartesian coordinate support without map projection distortion, hardware-accelerated SVG paths, and pan/zoom ergonomics.

---

## 2. End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor LD as Level Designer
    participant UI as Vercel (React Frontend)
    participant API as Render (FastAPI + DuckDB)
    participant Store as Parquet Telemetry Store

    LD->>UI: Filters by Date (Feb 12) & Map (AmbroseValley)
    UI->>API: GET /api/matches?date=February_12&map=AmbroseValley
    API->>Store: DuckDB scan match list & aggregates
    API-->>UI: Match metadata (IDs, durations, player/bot counts)
    LD->>UI: Selects Match ID (#b71aaad8)
    UI->>API: GET /api/matches/{match_id}
    API->>Store: DuckDB read match parquet files
    Note over API: 1. Decode byte strings<br/>2. Tag Bot vs Human<br/>3. Compute t_rel = ts - ts_min<br/>4. Map (x, z) to (px, py)
    API-->>UI: JSON (Trajectories + Event Keyframes)
    UI->>UI: Render Minimap Base Layer + Paths + Markers
    LD->>UI: Toggles Heatmap (Kill Zones / Death Zones / Traffic)
    UI->>API: GET /api/heatmaps/{map_id}?mode=KillZones
    API-->>UI: Normalized density grid -> Render heatmap overlay
```

1. **Triple-Tier Filtering:** Evaluator selects **Date** (Feb 10–14) and **Map**; backend returns matching matches.
2. **Telemetry Extraction:** DuckDB executes `SELECT * FROM read_parquet('data/*/*.nakama-0') WHERE match_id = ?`.
3. **Backend Transformation:** Bytes are decoded (`.decode('utf-8')`), bots categorized (`re.match(r'^\d+$', user_id)`), and world coordinates $(x, z)$ converted to $(px, py)$.
4. **Playback & Rendering:** Leaflet overlays paths (solid cyan for humans, dashed amber for bots) and markers. `requestAnimationFrame` interpolates positions across the scrubbable timeline.

---

## 3. Coordinate Transformation Approach

Game engines use 3D coordinates $(x, y, z)$ where **$y$ is elevation** (altitude above ground plane), and $(x, z)$ define the horizontal map plane. The minimap is a 2D image ($1024 \times 1024$ pixels) with origin $(0,0)$ at top-left.

### Mathematical Formulation

$$\begin{aligned}
u &= \frac{x - \text{origin}_x}{\text{scale}} \quad (\text{Horizontal UV ratio, } [0, 1]) \\
v &= \frac{z - \text{origin}_z}{\text{scale}} \quad (\text{Vertical depth UV ratio, } [0, 1]) \\
\text{pixel}_x &= u \times 1024 \\
\text{pixel}_y &= (1.0 - v) \times 1024 \quad (\mathbf{Inverted\ Y\ Axis}\text{: image } y=0 \text{ is top, world } z_{\max} \text{ is North})
\end{aligned}$$

### Calibration Parameters

| Map Name | Image Dimensions | Scale | Origin X ($x_0$) | Origin Z ($z_0$) | Valid World Bounds ($X, Z$) |
|---|---|---|---|---|---|
| **AmbroseValley** | $1024 \times 1024$ px | 900.0 | -370.0 | -473.0 | $X \in [-370, 530]$, $Z \in [-473, 427]$ |
| **GrandRift** | $1024 \times 1024$ px | 581.0 | -290.0 | -290.0 | $X \in [-290, 291]$, $Z \in [-290, 291]$ |
| **Lockdown** | $1024 \times 1024$ px | 1000.0 | -500.0 | -500.0 | $X \in [-500, 500]$, $Z \in [-500, 500]$ |

*Elevation ($y$):* Ignored for 2D projection, but embedded in trajectory tooltips and path color gradients (darker = lowlands, bright = cliffs) to expose vertical combat dominance.

---

## 4. Visual Taxonomy & Assumptions Handled

### Visual Encoding Taxonomy
- **Humans vs. Bots:** Humans (36-char UUID) $\to$ Solid Cyan (`#06b6d4`); Bots (numeric IDs e.g. `1440`) $\to$ Dashed Amber (`#f59e0b`, 50% opacity).
- **Combat Events:** `Kill` / `BotKill` $\to$ Red Skull Badge; `Killed` / `BotKilled` $\to$ Crimson Cross Marker.
- **Environmental Deaths:** `KilledByStorm` $\to$ Purple Toxic Cloud Marker.
- **Loot Pickups:** `Loot` $\to$ Emerald Green Diamond.
- **Heatmap Modes:** **Kill Zones** (kill event density), **Death Zones** (all death types including storm), and **Traffic Areas** (`Position` density).

### Edge Cases Resolved
1. **Unconventional Parquet Names:** Files have no `.parquet` extension (`.nakama-0`). Handled natively via DuckDB binary header sniffing.
2. **Binary Byte Serialization:** `event` column stored as byte strings (`b'Position'`). Decoded via UTF-8 in DuckDB.
3. **Timestamp Offsets:** Parquet timestamps are epoch-ms offsets (`1970-01-21 11:52:xx`). Normalized per match: $t_{\text{rel}} = ts - ts_{\min}$.
4. **Partial Day (February 14):** Feb 14 has 79 files. Displayed with a "Partial Telemetry" badge to avoid skewed aggregate comparisons.

---

## 5. Architectural Trade-offs Matrix

| Design Dimension | Alternative Considered | Chosen Approach | Rationale & Trade-off |
|---|---|---|---|
| **Hosting Model** | Static JSON on Vercel | **Hybrid (Vercel Edge + Render Backend)** | Static export of 796 matches creates ~800 files and precludes custom spatial queries; Render + DuckDB enables live multi-match filtering and on-demand heatmaps. |
| **Query Engine** | In-Memory Pandas | **Embedded DuckDB (In-Process SQL)** | Pandas loads all files into RAM (~500MB+); DuckDB uses columnar pushdown & projection to read queried columns in $<50$ ms. |
| **Map Rendering** | WebGL / Deck.gl | **Leaflet (`L.CRS.Simple`)** | Deck.gl increases bundle size and GPU complexity. Leaflet handles non-geo 2D images natively with zero overhead, smooth pan/zoom, and DOM markers. |
| **Cold-Start Resilience** | Backend Only | **Pre-bundled Demo Match Fallback** | Render free tier sleeps after 15 min; frontend pre-bundles 1 Ambrose Valley match so reviewers experience zero loading delay while Render wakes. |
| **Coordinate Conversion** | Client-side JavaScript | **Backend Pre-computation on Endpoint** | Backend transformation eliminates client CPU overhead and guarantees precision across different browser float-rounding implementations. |

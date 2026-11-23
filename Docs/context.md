# LILA Games — Product Engineer Written Test: Context & Action Plan

> [!IMPORTANT]
> **Deadline:** 5 days from receiving the assignment (~10–15 hours of focused work).
> **Submission:** A single GitHub repo link containing all code, docs, and a live deployment URL.

---

## 1. What Is This Assignment?

Build and deploy a **web-based Player Journey Visualization Tool** for LILA Games' Level Design team. The tool turns raw telemetry data from their extraction shooter **LILA BLACK** into interactive visual insights that Level Designers can open in a browser and use without developer help.

---

## 2. What You're Given

A zip file [`player_data.zip`](https://drive.google.com/file/d/19N6ASpZJkexYb-v3m5XU_xvi-YywRTe9/view?usp=sharing) containing:

| Asset | Description |
|---|---|
| **Parquet data files** | 5 days of production gameplay telemetry from LILA BLACK |
| **Minimap images** | One per map (3 maps total) |
| **README** | Data format, schema, and coordinate system explanation |

> [!CAUTION]
> Read the README in the zip **thoroughly** before writing any code. The coordinate mapping, byte encoding, bot detection, and timestamp nuances are critical — getting them wrong will tank your evaluation.

---

## 3. Core Requirements (Must-Have Features)

| # | Feature | Key Considerations |
|---|---|---|
| 1 | **Load & parse parquet data** | Handle bytes encoding, timestamps, edge cases |
| 2 | **Player journeys on minimap** | World coordinates → minimap pixel mapping (the hardest part) |
| 3 | **Human vs Bot distinction** | Visual differentiation (color, icon, opacity, etc.) |
| 4 | **Event type markers** | Kills, deaths, loot pickups, storm deaths — each visually distinct |
| 5 | **Filtering** | By map, date, and/or match |
| 6 | **Timeline / playback** | Watch a match unfold over time |
| 7 | **Heatmap overlays** | Kill zones, death zones, high-traffic areas |
| 8 | **Hosted & shareable** | Deployed to Vercel / Netlify / Railway / etc. with a working URL |

---

## 4. What You Decide (Not Prescribed)

- **Tech stack** — React, Streamlit, plain HTML/JS, anything. Pick what lets you move fast and deliver polish.
- **UX/Design** — No mockups given. Think about Level Designers as the end user (not data scientists).
- **Architecture** — Structure the data pipeline, frontend, and hosting however makes sense.

---

## 5. Deliverables Checklist

### A. Code + Deployment
- [ ] GitHub repo with all source code
- [ ] Live deployed URL (Vercel, Netlify, Railway, etc.)
- [ ] `README.md` covering: tech stack, setup steps, env vars

### B. Architecture Doc
- [ ] `ARCHITECTURE.md` (keep to one page) covering:
  - What you built with and why
  - Data flow: parquet files → what appears on screen
  - Coordinate mapping approach (the tricky part — walk through it)
  - Assumptions made where data was ambiguous
  - Major trade-offs (a simple table works fine)

### C. Insights Doc
- [ ] `INSIGHTS.md` with **3 insights discovered using your tool**, each containing:
  - What caught your eye in the data
  - Supporting evidence (pattern, stat, something concrete)
  - Actionable takeaway — what metrics get affected? What should change?
  - Why a Level Designer should care

### D. Pre-Submit Checklist
- [ ] Tool is live at the hosted URL
- [ ] Player paths render correctly on the minimap
- [ ] Can tell humans apart from bots visually
- [ ] Kill, death, loot, and storm events are marked
- [ ] Filtering by map/date/match works
- [ ] Timeline or playback shows match progression
- [ ] Heatmaps show kill zones, death zones, and traffic
- [ ] Architecture doc covers coordinate mapping approach
- [ ] Three insights with supporting evidence

---

## 6. Evaluation Criteria

| Area | What They're Looking For |
|---|---|
| **System Design** | Sensible architecture & tech stack decisions; logical data pipeline |
| **Attention to Detail** | Correct coordinate mapping; accurate event rendering; edge case handling |
| **End-to-End Execution** | Does it actually work? Is it hosted? Can they use it without help? |
| **Product Thinking** | Is it useful for a Level Designer? Right things filterable/interactive? |
| **Code Quality** | Organized, readable, reasonably structured |
| **Communication** | Clear architecture doc; ability to articulate trade-offs |

---

## 7. Recommended Approach & Execution Plan

### Phase 1: Data Exploration (Day 1 — ~2 hrs)
1. Download and extract `player_data.zip`
2. **Read the README completely** — understand schema, coordinate system, encoding
3. Explore the parquet files in a Jupyter notebook or Python script:
   - Identify columns, data types, row counts
   - Understand event types (kills, deaths, loot, storm deaths)
   - Figure out how to distinguish humans from bots
   - Map timestamps and match IDs
4. Examine the 3 minimap images — note dimensions and any metadata
5. **Prototype coordinate mapping** — this is the hardest technical challenge. Understand how world coordinates translate to minimap pixel positions.

### Phase 2: Tech Stack Decision & Setup (Day 1 — ~1 hr)
Choose your stack. Some strong options:

| Option | Pros | Cons |
|---|---|---|
| **React + Deck.gl / Leaflet** | Rich interactivity, great map layers, polished | More setup time |
| **Next.js + Canvas/SVG** | Fast deployment (Vercel), SSR support | Manual layer rendering |
| **Streamlit + Plotly/Folium** | Fastest to prototype, Python-native parquet handling | Less polished UX, heavier hosting |
| **Plain HTML/JS + D3.js** | Lightweight, no build step | More manual work |

> [!TIP]
> **Recommended:** A React/Next.js frontend is ideal for polish and ease of Vercel deployment. Use a lightweight backend or pre-process parquet → JSON during build. If speed matters most, Streamlit gets you a working prototype fastest.

### Phase 3: Core Build (Days 2–3 — ~6 hrs)
1. **Data pipeline** — Parse parquet, transform, serve to frontend
2. **Map rendering** — Display minimap images as base layers
3. **Coordinate mapping** — Transform world coords → minimap pixels
4. **Player journey paths** — Draw movement trails per player per match
5. **Event markers** — Distinct icons/colors for kills, deaths, loot, storm deaths
6. **Human vs Bot styling** — Visual differentiation (e.g., solid vs dashed lines, color coding)

### Phase 4: Interactive Features (Day 3–4 — ~3 hrs)
1. **Filters** — Map selector, date picker, match dropdown
2. **Timeline/playback** — Slider or animation to watch a match unfold
3. **Heatmap overlays** — Toggle-able heat layers for kills, deaths, traffic

### Phase 5: Polish & Deploy (Day 4 — ~2 hrs)
1. UI polish — responsive layout, tooltips, legends, loading states
2. Edge case handling — empty data, missing fields, boundary conditions
3. **Deploy** to Vercel/Netlify/Railway
4. Test the live URL end-to-end

### Phase 6: Documentation & Insights (Day 5 — ~2 hrs)
1. Write `ARCHITECTURE.md` — keep it one page, include trade-offs table
2. Write `INSIGHTS.md` — 3 data-driven insights with evidence & actionable recommendations
3. Final `README.md` — setup instructions, tech stack, env vars
4. Final review — walk through the pre-submit checklist

---

## 8. Key Technical Challenges to Watch For

### 🗺️ Coordinate Mapping (The Hardest Part)
- The game uses a world coordinate system; the minimap is a 2D image
- You need to find the transformation (likely a linear mapping with offset + scale)
- The README should provide bounds or reference points — use them carefully
- Validate by spot-checking known events against the minimap

### 🤖 Bot Detection
- Look for specific fields or naming patterns in the data to distinguish bots
- Make it visually obvious (different color, opacity, line style, or icon)

### 📦 Bytes Encoding
- Some fields may be byte-encoded — decode them properly before use

### ⏱️ Timestamps
- Understand the timestamp format and timezone
- Use them to power the timeline/playback feature

### 📊 Heatmaps
- Aggregate spatial data into a grid or use kernel density estimation
- Layer it over the minimap with adjustable opacity

---

## 9. What NOT to Do

- ❌ Don't submit Google Doc or Drive links — **only GitHub repo links accepted**
- ❌ Don't build 10 half-working features — **4 polished features beat 10 broken ones**
- ❌ Don't get blocked on ambiguity — make a reasonable assumption and document it
- ❌ Don't ignore the coordinate mapping — it's the technical core of the evaluation
- ❌ Don't skip the architecture doc or insights — they're weighted heavily

---

## 10. Quick Reference: File Structure for Submission

```
lila-player-viz/
├── README.md                 # Tech stack, setup, env vars
├── ARCHITECTURE.md           # One-page system design doc
├── INSIGHTS.md               # 3 insights from the data
├── src/                      # Application source code
│   ├── components/           # UI components
│   ├── data/                 # Data processing/pipeline
│   ├── utils/                # Coordinate mapping, helpers
│   └── ...
├── public/                   # Static assets (minimap images, etc.)
├── package.json / requirements.txt
└── ...
```

---

> [!NOTE]
> **AI tools are explicitly permitted and encouraged.** Use Claude, Cursor, ChatGPT, Copilot — whatever helps you ship faster. This is a test of whether you can use the right tools to deliver a working product, not whether you can write code from scratch.

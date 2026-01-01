# GitHub Readme Stats

A modern, extensible platform for generating **beautiful, embeddable GitHub statistics cards** — designed not only to display activity, but to communicate **engineering discipline, project intent, and long-term maintenance behavior**.

This project deliberately moves beyond contribution graphs and vanity metrics by combining:

* server-side metric computation
* deterministic SVG rendering
* an original Engineering Maturity model
* a performance-oriented, cache-friendly API

All cards are rendered as **pure SVGs**, making them ideal for GitHub READMEs, portfolios, documentation, and static websites.

---

## Live Demo

```
https://github-readme-stats.sujoshnag.com
```

The demo includes:

* a visual card builder
* live previews
* a transparent explanation of how metrics and maturity scores are derived

---

## Core Design Goals

This project is built around a few non-negotiable principles:

1. **Metrics should reflect engineering behavior, not popularity**
2. **Rendering must be deterministic and cacheable**
3. **The frontend should never compute or infer statistics**
4. **The system should scale without user-specific state**

Every architectural and algorithmic decision follows from these goals.

---

## Core Features

### Multiple Card Types

* **Classic Stats Card** — traditional GitHub overview
* **Engineering Maturity Card** — original, discipline-focused metric
* **Profile Summary Card** — compact, minimal representation

### SVG-First Architecture

* Responses are always `image/svg+xml`
* No JavaScript required for embedding
* Fully compatible with GitHub READMEs, Notion, and static sites
* Graceful failure via SVG error cards

### Customizable & Deterministic

* Light and dark themes
* Accent colors, background colors, borders
* All configuration expressed via URL parameters

This ensures identical inputs always produce identical outputs — a key requirement for caching and reproducibility.

### Performance-Oriented Frontend

* Debounced username handling to prevent API abuse
* URL construction decoupled from raw user input
* `<img src="...">`-based previews instead of fetch-based rendering

### Public & Zero-Auth

* Uses only public GitHub data
* No OAuth or tokens required for standard usage
* No user state or sessions

---

## Available Cards

### 1. Classic Stats Card

A comprehensive snapshot of a GitHub profile, including:

* Repository count
* Total stars and forks
* Language usage (byte-weighted)
* Activity and contribution signals

**Endpoint**

```
/stats/classic/{username}
```

---

### 2. Engineering Maturity Card

An **original, heuristic-based metric** designed to estimate how consistently and intentionally a developer maintains their public projects over time.

This card is intended for:

* senior engineers
* researchers
* hiring managers
* technical portfolios

Rather than asking *“how popular is this developer?”*, it asks:

> *“How disciplined, intentional, and consistent is their engineering practice?”*

**Endpoint**

```
/stats/maturity/{username}
```

---

### 3. Profile Summary Card

A minimal, compact card optimized for:

* dense READMEs
* sidebars
* personal landing pages

**Endpoint**

```
/stats/profile/{username}
```

---

## End-to-End Architecture

### High-Level Request Flow

```
Frontend
  ↓
Deterministic URL construction
  ↓
Next.js API route (/stats/*)
  ↓
GitHub public data fetch
  ↓
Metric computation
  ↓
SVG layout + rendering
  ↓
image/svg+xml response
```

There is **no JSON API** exposed to consumers.
SVG is the API.

---

## Frontend Architecture

The frontend **never computes statistics**.

Its responsibilities are strictly limited to:

1. Collecting user input
2. Debouncing username updates to prevent request spam
3. Constructing deterministic URLs
4. Rendering previews via `<img src="...">`

### Debounced Username Handling

To avoid firing a request per keystroke:

* Raw input is stored separately from the active username
* The active username updates only after a short pause
* Short or invalid inputs are ignored entirely

This reduces unnecessary API calls by ~90% during typing and improves CDN cache hit rates.

---

## Backend Architecture

### Stateless, Deterministic API

Each API request is:

* fully self-contained
* dependent only on URL parameters
* safe to cache at the edge

No cookies, sessions, or user-specific state are used.

### SVG Rendering Pipeline

1. Validate input and query parameters
2. Fetch relevant public GitHub data
3. Compute metrics synchronously
4. Normalize and aggregate values
5. Render a final SVG using layout primitives

Errors are rendered as SVG error cards to preserve embed compatibility.

---

## Engineering Maturity Model

The Engineering Maturity score is:

* **Computed entirely server-side**
* **Heuristic-based**, not rule-based
* **Normalized** to reduce bias toward popularity or repository count

It is **not** intended to be a definitive ranking, but a directional signal.

### Signals Used

The model aggregates multiple categories of signals:

#### 1. Repository Hygiene

* Ratio of archived to active repositories
* Presence of abandoned or long-inactive projects
* Evidence of intentional project lifecycle management

#### 2. Consistency of Activity

* Sustained contribution patterns over time
* Penalizes bursty, one-off activity
* Rewards steady maintenance and iteration

#### 3. Project Depth & Longevity

* Age of repositories
* Evidence of long-term iteration
* Signals that projects evolved beyond experimentation

#### 4. Open-Source Engagement

* Forks and stars as *secondary* signals
* Contribution patterns that suggest external usage
* Avoids direct popularity weighting

#### 5. Engineering Intent

* Separation of experiments vs maintained work
* Archiving deprecated projects instead of abandoning them
* Structural clarity in repository organization

---

### Aggregation & Normalization

* Signals are normalized to avoid dominance by any single factor
* The final score is scaled to reduce bias toward:

  * language choice
  * raw repository count
  * follower count

Exact weights are **intentionally not exposed** to:

* prevent gaming
* allow the model to evolve
* avoid brittle interpretations

---

## API Overview

### Base URL

```
https://github-readme-stats.sujoshnag.com
```

---

### Common Query Parameters

| Parameter | Type           | Description                       |
| --------- | -------------- | --------------------------------- |
| `accent`  | hex string     | Accent color                      |
| `bg`      | hex string     | Background color                  |
| `border`  | boolean        | Show or hide border               |
| `details` | `low` | `high` | Detail level (maturity card only) |
| `format`  | `svg`          | Explicit output format            |

All parameters are URL-driven to ensure determinism and cacheability.

---

### Example Requests

**Classic Card**

```
/stats/classic/nagsujosh?accent=00d9ff&bg=0B1220
```

**Engineering Maturity Card**

```
/stats/maturity/nagsujosh?details=high
```

**Profile Card**

```
/stats/profile/nagsujosh?border=false
```

---

### Response Format

* **Content-Type:** `image/svg+xml`
* **Caching:** CDN-friendly, deterministic
* **Errors:** SVG error cards (never JSON)

---

## Usage in a GitHub README

```md
![GitHub Stats](https://github-readme-stats.sujoshnag.com/stats/classic/nagsujosh)
```

Cards update automatically as GitHub data changes.

---

## Local Development

### Requirements

* Node.js 18+
* npm or pnpm

### Setup

```bash
git clone https://github.com/nagsujosh/github-readme-stats
cd github-readme-stats
npm install
npm run dev
```

Available at:

```
http://localhost:3000
```

---

## Project Structure

```
app/
 ├─ stats/
 │   ├─ classic/
 │   ├─ maturity/
 │   └─ profile/
 ├─ api/
 ├─ components/
 ├─ lib/
 └─ styles/
```

---

## Author

**Sujosh Nag**
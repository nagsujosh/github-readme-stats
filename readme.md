# GitHub Readme Stats

A modern, extensible platform for generating **beautiful, customizable GitHub statistics cards** for your README, portfolio, or developer profile.

This project goes beyond basic contribution graphs by offering **engineering-focused insights**, clean visual design, and a simple HTTP API that returns embeddable SVGs.

---

## Features

* **Multiple card types**

  * Classic GitHub stats overview
  * Engineering maturity analysis
  * Compact profile summary cards

* **Fully embeddable SVG output**

  * Works in GitHub READMEs, personal websites, Notion, and documentation
  * No JavaScript required on the client

* **Custom theming**

  * Light, dark, and auto themes
  * Accent colors, background colors, and borders
  * High-contrast, accessibility-friendly defaults

* **Fast & scalable**

  * Built with Next.js App Router
  * Edge-friendly API routes
  * Optimized SVG rendering

* **Zero auth required**

  * Public GitHub data only
  * No OAuth or tokens needed for basic usage

---

## Live Demo

```
https://github-readme-stats.sujoshnag.com
```

---

## Available Cards

### 1. Classic Stats Card

A comprehensive overview of a GitHub profile, including:

* Total stars
* Commits and contributions
* Languages used
* Repository activity

**Endpoint**

```
/stats/classic/{username}
```

---

### 2. Engineering Maturity Card

A higher-level view of engineering quality and consistency, designed for:

* Senior engineers
* Researchers
* Hiring managers
* Technical portfolios

Includes signals such as:

* Project consistency
* Repository structure quality
* Activity regularity
* Long-term maintenance patterns

**Endpoint**

```
/stats/maturity/{username}
```

---

### 3. Profile Summary Card

A compact, minimal card optimized for tight layouts and clean READMEs.

**Endpoint**

```
/stats/profile/{username}
```

---

## API Documentation

### Base URL

```
https://github-readme-stats.sujoshnag.com
```

---

### Common Query Parameters

All endpoints accept the following optional query parameters:

| Parameter | Type                      | Description                  |
| --------- | ------------------------- | ---------------------------- |
| `theme`   | `light` | `dark` | `auto` | Card theme                   |
| `accent`  | string (hex)              | Accent color (e.g. `00d9ff`) |
| `bg`      | string (hex)              | Background color             |
| `border`  | boolean                   | Show or hide border          |
| `details` | `low` | `high`            | Level of detail rendered     |

---

### Example Requests

#### Classic Card

```
/stats/classic/nagsujosh?theme=dark&accent=00d9ff
```

#### Maturity Card

```
/stats/maturity/nagsujosh?details=high
```

#### Profile Card

```
/stats/profile/nagsujosh?theme=light&border=false
```

---

### Response Format

* **Content-Type:** `image/svg+xml`
* **Caching:** Optimized for CDN and GitHub caching
* **Errors:** Rendered as SVG error cards (not JSON)

---

## Usage in GitHub README

```md
![GitHub Stats](https://github-readme-stats.sujoshnag.com/stats/classic/nagsujosh)
```

SVGs update automatically as GitHub data changes.

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

The app will be available at:

```
http://localhost:3000
```

---

## Project Structure

```
app/    
 ├─stats/
 │   ├─ classic/
 │   ├─ maturity/
 │   └─ profile/
 ├─ api/
 ├─ components/
 ├─ lib/
 └─ styles/
```


## Author

**Sujosh Nag**
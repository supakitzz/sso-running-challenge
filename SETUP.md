# SSO Running Challenge — Deployment Guide

## Architecture

```
Google Sheet
     ↓  (read by)
Google Apps Script  (Code.gs)
     ↓  (returns JSON via HTTPS)
index.html on GitHub Pages
     ↓  (auto-refreshes every 5 min)
Browser (anyone, no login required)
```

---

## Step 1 — Set up Google Apps Script

1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1q6-j_DQGN1zdtv8WA0OZYvJfkTN3_eUFc8fiTm9mae4
2. Click **Extensions → Apps Script**
3. Delete all existing code in `Code.gs`
4. Copy the entire contents of `Code.gs` from this folder and paste it in
5. Click **Save** (💾 icon or Ctrl+S)
6. Click **Run** → select `doGet` → click **Run** (approve permissions if asked)
7. Click **Deploy → New deployment**
   - Type: **Web app**
   - Description: `SSO Dashboard API`
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy** → copy the Web App URL (looks like `https://script.google.com/macros/s/ABC.../exec`)

---

## Step 2 — Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `sso-running-challenge` (or any name)
3. Visibility: **Public** (required for free GitHub Pages)
4. Click **Create repository**

---

## Step 3 — Push Files to GitHub

Open a terminal / Git Bash in this folder and run:

```bash
git init
git add index.html Code.gs SETUP.md
git commit -m "Initial commit: SSO Running Challenge Dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sso-running-challenge.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 4 — Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** · Folder: **/ (root)**
5. Click **Save**
6. Wait ~60 seconds, then visit: `https://YOUR_USERNAME.github.io/sso-running-challenge/`

---

## Step 5 — First-time App Setup

1. Open the GitHub Pages URL
2. The app will show a setup screen
3. Paste the Apps Script Web App URL from Step 1
4. Click **Save & Connect**
5. Done! The dashboard loads live data and refreshes every 5 minutes.

---

## Sharing with Others

Send anyone the GitHub Pages URL — no login required. Each person enters the Apps Script URL once on their device (it's saved in their browser's localStorage).

Or you can hard-code the URL: open `index.html`, find `const API_URL = localStorage.getItem(LS_KEY) || '';` and replace `''` with your URL in quotes, then push again.

---

## Updating Data

Data syncs automatically. When runners update the Google Sheet, the dashboard reflects changes within 5 minutes (next auto-refresh cycle).

To force a manual refresh: click the **↻ Refresh** button in the top-right corner.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Failed to load data" | Re-deploy the Apps Script (same steps, choose **Manage deployments → edit**) |
| Shows wrong month tab | Check tab is named e.g. `July2026` or `Jul26` in the sheet |
| CORS error in console | Make sure Apps Script is deployed as "Anyone" (not "Anyone with Google account") |
| No data in leaderboard | Check "All Summary" tab exists and header row has "Name" in column A |

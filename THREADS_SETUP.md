# How to Connect Your Threads Account (Layer 3)

This gets your Threads posts auto-pulling into the site every 6 hours.
Takes about 20 minutes. Do it once, then it runs forever.

---

## Step 1 — Create a Meta Developer Account

1. Go to **https://developers.facebook.com**
2. Click **Get Started** (top right)
3. Log in with the Facebook account connected to your Threads/Instagram
4. Verify your account if asked

---

## Step 2 — Create an App

1. Click **My Apps** → **Create App**
2. Choose **Other** → **Next**
3. Choose **Business** → **Next**
4. Give it a name like `XFD Site Sync` → **Create App**

---

## Step 3 — Add the Threads Product

1. Inside your new app, scroll down to find **Threads API**
2. Click **Set Up**
3. Under **Threads User Token Generator**, your Threads account should appear
4. Click **Generate Token** next to your account
5. Check all the permission boxes:
   - `threads_basic`
   - `threads_content_publish` (optional, for future posting)
   - `threads_read_replies` (optional)
6. Click **Generate Token** and **copy the token** — it's a long string starting with `EAAG...`

> ⚠️ This token lasts 60 days. After 60 days you'll need to refresh it (Step 5 below).

---

## Step 4 — Add the Token to GitHub

1. Go to your GitHub repo: **https://github.com/xfdstudios/xfdstudios.github.io**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `THREADS_TOKEN`
5. Value: paste the long token you copied
6. Click **Add secret**

That's it. The workflow (`threads-sync.yml`) will now run every 6 hours automatically and pull your latest Threads posts into `social-feed.json`.

---

## Step 5 — Refresh the Token Every 60 Days

Threads tokens expire after 60 days. To renew:

1. Go back to **https://developers.facebook.com** → your app → Threads API
2. Click **Generate Token** again
3. Copy the new token
4. Go to GitHub → Settings → Secrets → update `THREADS_TOKEN`

To avoid doing this manually, you can exchange it for a **Long-Lived Token** (valid 60 days, auto-refreshable). Ask XFD to set this up when ready.

---

## Step 6 — Test It

1. Go to your repo on GitHub
2. Click the **Actions** tab
3. Find **Sync Threads posts** → click it → click **Run workflow**
4. Watch it run — if it says "Updated social-feed.json with X Threads posts", it worked

---

## What Happens After It's Running

- Every 6 hours, your latest Threads posts appear in `social-feed.json`
- Posts with `platform: "threads"` show up in the homepage social feed
- Portal assignment is still manual — use `admin.html` to set the right portal for each post

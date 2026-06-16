# Letters

A tiny letter-writing site that recreates the anticipation of physical mail. You upload a letter (a photo of a handwritten note, a document — anything) and it doesn't arrive for a realistic number of days based on the real distance between you and your friend. You can watch your own letters travel (*in transit → arrived → opened*), but you learn nothing about incoming mail until it arrives.

Static frontend (hosted free on GitHub Pages) + Supabase free tier for accounts, file storage, and the "seal" that keeps a letter hidden until its delivery date.

---

## Setup (about 15 minutes, all free)

### 1. Create a Supabase project
- Go to supabase.com → New project (no credit card needed).
- Once it's ready, open **Project Settings → API** and copy:
  - **Project URL**
  - **anon public** key

### 2. Turn off email confirmation
- **Authentication → Providers → Email** → turn **off** "Confirm email" → Save.
- This lets people sign in immediately with just a first name + password.

### 3. Create the storage bucket
- **Storage → New bucket** → name it exactly `letters` → leave **Public** unchecked → create.

### 4. Run the database setup
- **SQL Editor → New query** → paste the contents of [`schema.sql`](schema.sql) → **Run**.
- This creates the tables and the security rules (including the seal and the storage rules).

### 5. Add your keys
- Open [`js/config.js`](js/config.js) and paste your **Project URL** and **anon public** key.
- The anon key is safe to commit — it only works alongside the security rules. (Never put the `service_role` key here.)

### 6. Publish on GitHub Pages
- Create a GitHub repo and push these files (the contents of this folder at the repo root).
- **Settings → Pages →** Source: deploy from branch → `main` / root → Save.
- Your site appears at `https://<you>.github.io/<repo>/`.

### 7. Use it
- You and your friend each open the site and **Create an account** (first name + password).
- Open the app once (or post a letter) so your location gets saved — that's how the other person's letters know how far they have to travel.
- Write a letter, allow location when asked, and post it. Then wait.

---

## How it works

- **Accounts:** first name + password. Behind the scenes the name becomes `name@digital-letters.local` to satisfy Supabase's email-based auth — you never see that.
- **Location:** read from the device at posting time (and quietly refreshed when you open the app). Posting is blocked if you deny location, so the postmark is always real.
- **Delivery time:** distance → days. Under 100 km ≈ 2 days, under 1,500 km ≈ 4, under 5,000 km ≈ 7, otherwise ≈ 12. Fixed at posting; it never re-routes if you move.
- **The seal:** a database rule (row-level security) means a recipient literally cannot see a letter — or its file — until the delivery date has passed. It's enforced by the database, not just hidden in the page.
- **Status:** computed by comparing the delivery date to the current time, so there's no server or timer to run.

## Testing the wait without waiting days
In the Supabase **Table editor**, open the `letters` table and edit a row's `deliver_at` to a minute or two from now. Reload the recipient's mailbox and watch it arrive.

## Files
```
index.html      login / signup
mailbox.html    your mailbox (arrived) + letters you've sent
compose.html    upload & post a letter
letter.html     read an opened letter
schema.sql      Supabase tables + security rules
js/             config, auth, location, distance, page logic
css/style.css   styling
```

## Costs
GitHub Pages + Supabase free tier. For two people you're far under every limit. Nothing to pay.

## Ideas parked for later
- **Email notification when a letter arrives.** Note: this is the one feature that needs more than the current setup. Right now there's no server or timer — arrival is computed whenever someone opens the app. To send an email *at* the delivery moment, you'd add something that runs on a schedule (e.g. Supabase's `pg_cron` + a Scheduled Edge Function) to find letters whose `deliver_at` just passed and send mail via a free email service like Resend. Supabase's free tier covers this; it's a moderate add, not a quick one.

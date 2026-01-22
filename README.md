# My Task Manager

A private, secure task management web application built with vanilla JavaScript and Supabase. Features authentication and stores your tasks securely in a cloud database.

## Features

- 🔐 Secure authentication with email/password
- 📝 Create, read, update, and delete tasks
- 📊 Task organization with Priority, Effort, and Status
- 🔒 Private - only you can see your tasks
- 📱 Responsive design - works on desktop and mobile
- ☁️ Cloud-based - access from any device

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for a free account
2. Click "New Project"
3. Fill in the project details:
   - **Name**: My Task Manager (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to you
4. Click "Create new project" and wait for setup to complete (~2 minutes)

### Step 2: Set Up the Database

1. In your Supabase project dashboard, click on the **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the contents of `supabase/migrations/20260118_create_tasks_table.sql`
4. Paste it into the SQL Editor
5. Click **Run** to create your tasks table with security policies

### Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Project Settings** (gear icon in left sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. Keep these handy for the next step

### Step 4: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:
   - Name: `SUPABASE_URL`, Value: Your Project URL from Step 3
   - Name: `SUPABASE_ANON_KEY`, Value: Your anon public key from Step 3

### Step 5: Enable GitHub Pages

1. In your GitHub repository, go to **Settings** → **Pages**
2. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
3. That's it! GitHub will automatically deploy your site when you push to the main branch

### Step 6: Test Locally (Optional)

If you want to test locally before deploying:

1. Copy `config.js.example` to `config.js` (if you created one)
2. Edit `config.js` and add your Supabase credentials:
   ```javascript
   window.SUPABASE_URL = 'https://xxxxx.supabase.co';
   window.SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```
3. Open `index.html` in your browser or use a local server:
   ```bash
   python3 -m http.server 8000
   ```
4. Visit `http://localhost:8000`

**Important**: Don't commit `config.js` to GitHub! It's already in `.gitignore`.

### Step 7: Deploy

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Initial task manager setup"
   git push origin main
   ```

2. GitHub Actions will automatically build and deploy your site
3. Check the **Actions** tab in GitHub to see the deployment progress
4. Once complete, your site will be live at:
   - `https://your-username.github.io/your-repo-name/`

### Step 8: Configure Supabase Authentication Settings

1. In your Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add your GitHub Pages URL to **Site URL**:
   - `https://your-username.github.io/your-repo-name`
3. Add the same URL to **Redirect URLs**
4. Click **Save**

## Using Your Task Manager

### First Time Setup

1. Visit your GitHub Pages URL
2. Click "Sign Up" to create an account
3. Enter your email and password
4. Check your email for a confirmation link
5. Click the confirmation link
6. Return to your site and sign in

### Adding Tasks

1. Fill in the task form at the top:
   - **Task name**: What you need to do
   - **Priority**: Days, Weeks, or Months
   - **Effort**: Low, Medium, or High
   - **Status**: To Do, In Progress, Block, or Completed
   - **Block reason** (optional): If status is "Block", explain why
2. Click "Add Task"

### Managing Tasks

- **Edit**: Click the "Edit" button to update a task's status
- **Delete**: Click the "Delete" button to remove a task
- Tasks are sorted by creation date (newest first)

## Security & Privacy

- ✅ Your repository can be **private** - the code is not public
- ✅ Your tasks are stored in **Supabase** (not in GitHub)
- ✅ Only **you** can see your tasks (enforced by database security policies)
- ✅ Authentication is required - no anonymous access
- ✅ All data is encrypted in transit (HTTPS)
- ✅ Supabase provides free tier with no bandwidth overage charges

## Supabase Free Tier Limits

- **Database**: 500 MB storage
- **Authentication**: 50,000 monthly active users
- **API Requests**: Unlimited
- **Bandwidth**: 2 GB/month (reset monthly)

For a personal task manager, you'll likely never hit these limits.

## Troubleshooting

### "Failed to load tasks" error

- Check that your Supabase credentials are correctly set in GitHub Secrets
- Verify the database migration ran successfully in Supabase SQL Editor
- Check the browser console (F12) for specific error messages

### Can't sign in after creating account

- Check your email for the confirmation link
- Look in spam/junk folders
- In Supabase dashboard, go to **Authentication** → **Users** to verify your account exists

### Site not deploying

- Check the **Actions** tab in GitHub for deployment errors
- Verify GitHub Pages is enabled in repository settings
- Make sure you pushed to the `main` branch

### Site is accessible but shows blank page

- Open browser console (F12) and check for errors
- Verify Supabase credentials are set correctly
- Check that `config.js` is being generated in the GitHub Action

## Customization

You can customize the appearance by editing the CSS in [index.html](index.html):

- Change colors in the `body` gradient
- Modify table styles in `.tasks-table`
- Adjust the color scheme for status badges
- Update fonts in the `body` style

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

## License

This is a personal project. Feel free to fork and customize for your own use.

## Support

If you encounter issues:

1. Check the Troubleshooting section above
2. Review the browser console for errors (F12)
3. Check the Supabase dashboard for database/auth issues
4. Verify all secrets are set correctly in GitHub

---

**Made for personal task management** 📋
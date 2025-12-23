# 🚀 DEPLOY TO VERCEL - Step by Step Guide

## 📋 PREREQUISITES

- ✅ Vercel account (https://vercel.com)
- ✅ Vercel CLI installed (or use dashboard)
- ✅ Your project code (channel-changers-studio)

---

## 🎯 DEPLOYMENT OPTIONS

You have **3 ways** to update your Vercel deployment:

### **Option A: Vercel CLI** (Fastest) ⭐ RECOMMENDED
### **Option B: Vercel Dashboard** (Easy)
### **Option C: GitHub Integration** (Automatic)

---

## 🚀 OPTION A: VERCEL CLI (FASTEST)

### **Step 1: Install Vercel CLI** (if not already installed)

```bash
npm install -g vercel
```

### **Step 2: Navigate to Your Project**

```bash
cd ~/Desktop/channel-changers-studio
```

### **Step 3: Login to Vercel**

```bash
vercel login
```

This will:
- Open browser
- Ask you to confirm login
- Save credentials

### **Step 4: Link to Existing Project** (First time only)

```bash
vercel link
```

Answer the prompts:
- "Set up and deploy?" → **Yes**
- "Which scope?" → **Select your account**
- "Link to existing project?" → **Yes**
- "What's the name?" → **[your-project-name]**

### **Step 5: Set Environment Variable**

```bash
vercel env add GEMINI_API_KEY production
```

When prompted, paste your API key:
```
AIzaSyD8331qMbl_CcIsr6N4Z05LvPD85Zde8BI
```

### **Step 6: Deploy!**

```bash
vercel --prod
```

This will:
- ✅ Build your project
- ✅ Upload to Vercel
- ✅ Deploy to production
- ✅ Give you the live URL

**Output looks like:**
```
🔍  Inspect: https://vercel.com/your-project/abc123
✅  Production: https://your-project.vercel.app
```

---

## 🖥️ OPTION B: VERCEL DASHBOARD (EASY)

### **Step 1: Create Deployment Package**

```bash
cd ~/Desktop
zip -r channel-changers-deploy.zip channel-changers-studio \
  -x "*/node_modules/*" "*/dist/*" "*/.git/*" "*.zip"
```

### **Step 2: Go to Vercel Dashboard**

1. Open: https://vercel.com/dashboard
2. Find your existing project
3. Click on the project name

### **Step 3: Upload New Version**

**Method 1: Drag & Drop**
- Drag the `channel-changers-deploy.zip` to the dashboard
- Vercel will extract and deploy

**Method 2: Import from Files**
- Click **"Import Project"** button
- Select **"Continue with Files"**
- Upload the folder

### **Step 4: Configure Build Settings**

Make sure these are set:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### **Step 5: Add Environment Variable**

1. Go to **Project Settings** → **Environment Variables**
2. Click **"Add Variable"**
3. Name: `GEMINI_API_KEY`
4. Value: `AIzaSyD8331qMbl_CcIsr6N4Z05LvPD85Zde8BI`
5. Environment: **Production** (checked)
6. Click **"Save"**

### **Step 6: Trigger Redeploy**

1. Go to **Deployments** tab
2. Click **"..."** menu on latest deployment
3. Select **"Redeploy"**
4. Check **"Use existing Build Cache"** (faster)
5. Click **"Redeploy"**

---

## 🐙 OPTION C: GITHUB INTEGRATION (AUTOMATIC)

### **Step 1: Initialize Git**

```bash
cd ~/Desktop/channel-changers-studio
git init
git add .
git commit -m "Update: Fixed character references and beat limits"
```

### **Step 2: Create GitHub Repository**

1. Go to https://github.com/new
2. Repository name: `channel-changers-studio`
3. Private or Public (your choice)
4. **Don't** initialize with README (we have code already)
5. Click **"Create repository"**

### **Step 3: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/channel-changers-studio.git
git branch -M main
git push -u origin main
```

### **Step 4: Connect to Vercel**

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `channel-changers-studio` repo
5. Click **"Import"**

### **Step 5: Configure**

- **Framework:** Vite (auto-detected)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Click **"Environment Variables"**:
- Name: `GEMINI_API_KEY`
- Value: `AIzaSyD8331qMbl_CcIsr6N4Z05LvPD85Zde8BI`

Click **"Deploy"**

### **Step 6: Automatic Future Deploys**

From now on:
```bash
git add .
git commit -m "Your changes"
git push
```

Vercel automatically redeploys! 🎉

---

## ⚙️ VERCEL BUILD CONFIGURATION

Create `vercel.json` in your project root for custom config:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "installCommand": "npm install",
  "env": {
    "GEMINI_API_KEY": "@gemini_api_key"
  },
  "build": {
    "env": {
      "GEMINI_API_KEY": "@gemini_api_key"
    }
  }
}
```

---

## 🔐 SECURITY: API KEY MANAGEMENT

### **⚠️ IMPORTANT: Don't Commit API Keys**

Add this to `.gitignore`:

```
.env.local
.env
*.env
```

### **Use Vercel Environment Variables**

API keys should ONLY be in:
- ✅ Vercel Dashboard → Environment Variables
- ✅ Local `.env.local` (never committed)
- ❌ NEVER in source code
- ❌ NEVER in git repo

---

## 🧪 TESTING YOUR DEPLOYMENT

### **After Deploy:**

1. **Open Deployment URL**
   - Vercel gives you: `https://your-project.vercel.app`

2. **Test API Key Works**
   - Open browser console (F12)
   - Check for errors
   - Try generating a script

3. **Test Image Generation**
   - Create a new project
   - Generate script → breakdown → image
   - If images generate, API key is working!

### **If Images Don't Generate:**

Check environment variable:
```bash
vercel env ls
```

Should show:
```
GEMINI_API_KEY  Production  Added X days ago
```

If missing, add it:
```bash
vercel env add GEMINI_API_KEY production
```

---

## 🐛 TROUBLESHOOTING

### **"Build Failed"**

Check build logs in Vercel dashboard:
1. Go to **Deployments** tab
2. Click on failed deployment
3. Scroll to **Build Logs**
4. Look for error message

**Common issues:**
- Missing dependencies: Run `npm install` locally first
- Type errors: Fix TypeScript errors
- Out of memory: Contact Vercel support for upgrade

### **"Environment Variable Not Working"**

1. Verify it's added in Vercel dashboard
2. Make sure it's set for **Production** environment
3. Redeploy after adding env vars (they don't apply retroactively)

```bash
vercel env pull .env.local  # Download env vars
vercel --prod                # Redeploy
```

### **"API Key Invalid"**

Your API key: `AIzaSyD8331qMbl_CcIsr6N4Z05LvPD85Zde8BI`

1. Verify it's the correct key
2. Check it's not expired
3. Verify it has Gemini API access enabled
4. Try the key locally first

### **"Old Version Still Showing"**

Clear browser cache:
- Chrome: Cmd/Ctrl + Shift + R
- Or open in incognito mode

Check deployment status:
```bash
vercel ls
```

---

## 📊 DEPLOYMENT CHECKLIST

Before deploying, make sure:

- [ ] Code builds locally (`npm run build`)
- [ ] No TypeScript errors
- [ ] `.gitignore` includes `.env.local`
- [ ] Environment variables set in Vercel
- [ ] Tested locally with `npm run dev`
- [ ] All dependencies in `package.json`
- [ ] Build output directory is `dist`

---

## 🚀 QUICK DEPLOY COMMAND

**If you've already set everything up:**

```bash
cd ~/Desktop/channel-changers-studio
vercel --prod
```

That's it! 30 seconds to live update.

---

## 🔄 ROLLBACK TO PREVIOUS VERSION

**If new deployment has issues:**

### **Via Dashboard:**
1. Go to **Deployments** tab
2. Find previous working deployment
3. Click **"..."** menu
4. Select **"Promote to Production"**

### **Via CLI:**
```bash
vercel rollback
```

---

## 📈 MONITORING YOUR DEPLOYMENT

### **Vercel Analytics:**
- Go to **Analytics** tab
- See visitor counts, performance
- Monitor API usage

### **Logs:**
- Go to **Deployments** → Click deployment
- View **Function Logs** for runtime errors
- View **Build Logs** for build issues

### **Performance:**
- Check **Speed Insights** tab
- Monitor load times
- Optimize if needed

---

## 💡 PRO TIPS

### **Faster Deploys:**
```bash
vercel --prod --no-clipboard  # Skip clipboard copy
vercel --yes                   # Skip confirmations
```

### **Preview Deploys:**
```bash
vercel  # Creates preview URL (not production)
```
Test changes before going live!

### **Alias Your Deployment:**
```bash
vercel alias set your-deployment.vercel.app your-custom-domain.com
```

---

## 🎯 RECOMMENDED WORKFLOW

### **For Updates:**

1. **Make changes locally**
   ```bash
   npm run dev  # Test locally
   ```

2. **Build and verify**
   ```bash
   npm run build
   npm run preview  # Test production build
   ```

3. **Deploy to preview**
   ```bash
   vercel  # Preview URL
   ```

4. **Test preview, then promote**
   ```bash
   vercel --prod  # Production
   ```

---

## 📞 NEED HELP?

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **Community:** https://github.com/vercel/vercel/discussions

---

## ✅ WHAT'S NEXT AFTER DEPLOY?

1. **Test the live site** thoroughly
2. **Monitor for errors** in first 24 hours
3. **Check analytics** to see usage
4. **Share the URL** with team/clients
5. **Set up custom domain** (optional)

Your site will be live at:
```
https://[your-project-name].vercel.app
```

---

**Last Updated:** November 26, 2025
**Version:** Channel Changers Studio - Vercel Deployment Guide

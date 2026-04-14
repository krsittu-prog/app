# Setting Up GitHub Repository

This guide helps you push your local repository to GitHub.

## 📋 Prerequisites

1. GitHub account (free or paid)
2. Git installed locally
3. SSH key or personal access token configured

## 🚀 Steps to Create and Push to GitHub

### 1. Create Repository on GitHub

1. Go to [github.com](https://github.com)
2. Click **"+"** icon → **"New repository"**
3. **Repository name**: `gs-pinnacle-ias`
4. **Description**: "GS Pinnacle IAS - Full-stack IAS exam prep platform"
5. **Visibility**: Choose Public (for open source) or Private
6. ✅ **DO NOT** initialize with README, .gitignore, or license (we have them)
7. Click **"Create repository"**

### 2. Configure SSH Key (Recommended)

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# In GitHub Settings → SSH and GPG keys → New SSH key
# Paste your key and save
```

### 3. Add Remote and Push

```bash
cd d:\emerge\app

# Add GitHub remote (replace USERNAME with your GitHub username)
git remote add origin git@github.com:USERNAME/gs-pinnacle-ias.git

# Set main branch as default
git branch -M main

# Push to GitHub
git push -u origin main
```

### Alternative: Using HTTPS

If SSH isn't configured:

```bash
cd d:\emerge\app

# Add GitHub remote with HTTPS
git remote add origin https://github.com/USERNAME/gs-pinnacle-ias.git

# Push to GitHub
git push -u origin main
```

## ✅ Verify Setup

1. Go to `github.com/USERNAME/gs-pinnacle-ias`
2. You should see:
   - All your code files
   - README showing on project page
   - CONTRIBUTING.md in repo root
   - LICENSE file
   - All commit history

## 📊 Repository Structure on GitHub

```
gs-pinnacle-ias/
├── 📄 README.md (from git)
├── 🔐 LICENSE
├── 📚 GITHUB_README.md (this one has full docs)
├── 📋 CONTRIBUTING.md
├── 📝 CHANGELOG.md
├── 📁 .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
├── 📁 frontend/
├── 📁 backend/
└── ... (all other project files)
```

## 🔧 Post-Setup Configuration

### 1. Repository Settings

**Settings → General:**
- Add description
- Add website URL (if deployed)
- Enable discussions (optional)
- Enable wiki (optional)

**Settings → Security:**
- Enable branch protection for `main`
- Require reviews before merge
- Require status checks to pass

**Settings → Branches:**
- Set `main` as default branch

### 2. Enable CI/CD (Optional)

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - run: cd backend && pip install -r requirements.txt && pytest
      
  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16
      - run: cd frontend && npm install && npm run lint
```

### 3. Add Topics

**Repository page → About → Topics:**
- `react-native`
- `expo`
- `fastapi`
- `mongodb`
- `education`
- `learning-platform`
- `ias-exam`

## 📝 Create GitHub Actions (CI/CD)

### Automated Tests

```bash
mkdir -p .github/workflows
# Create `tests.yml` in that directory
```

## 🎯 Next Steps After Setup

1. **Create Issues** for features/bugs you want to track
2. **Create Discussions** for community engagement
3. **Create Milestones** for version planning
4. **Set up Releases** when you tag versions
5. **Enable GitHub Pages** if you want documentation site

## 📦 Deploy to Production

### Heroku (Backend)

```bash
# Create app
heroku create gs-pinnacle-ias-api

# Add MongoDB
heroku addons:create mongolab

# Deploy
git push heroku main
```

### Vercel/Netlify (Frontend)

For web deployment:

```bash
# Using Vercel
npm install -g vercel
vercel
```

## 🆘 Troubleshooting

### "Permission denied (publickey)"
- Generate and add SSH key (see SSH Key section above)

### "fatal: 'origin' does not appear to be a 'git' repository"
- Make sure you're in the project directory
- Run: `git remote add origin [YOUR_GITHUB_URL]`

### "rejected — non-fast-forward"
- Run: `git pull origin main`
- Then: `git push -u origin main`

## 📚 Useful Commands

```bash
# Check remote configuration
git remote -v

# Change remote URL
git remote set-url origin [NEW_URL]

# View commit history
git log --oneline

# Create a new branch
git checkout -b feature/your-feature

# Push a specific branch
git push -u origin feature/your-feature
```

## 🎉 Success!

Your repository is now on GitHub! 🚀

**Share it with:**
- Your team via repo link
- As portfolio on LinkedIn/resume
- Open for community contributions
- Use as GitHub page for documentation

---

**Questions?** See [GitHub Documentation](https://docs.github.com) or check our [CONTRIBUTING.md](./CONTRIBUTING.md)

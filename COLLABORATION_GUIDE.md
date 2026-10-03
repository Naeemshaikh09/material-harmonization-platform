# GitHub Collaboration Guide - 4 Developer Team

## Team Structure
- **Developer 1**: Backend lead (Tech lead + reviewer)
- **Developer 2**: AI/ML lead
- **Developer 3**: Frontend lead
- **Developer 4**: Data & governance lead

---

## Initial Setup (Developer 1 - One Time Only)

### 1. Create Repository
```bash
# Developer 1 creates the repo on GitHub
# Then clone it locally
git clone https://github.com/Naeemshaikh09/material-harmonization-platform.git
cd material-harmonization-platform
```

### 2. Create Initial Structure
```bash
# Create directory structure
mkdir -p contracts backend/app/{api,pipeline,matching,codes,audit,procurement,db,tests}
mkdir -p ml/{data,train,eval,service}
mkdir -p data/{dictionaries,templates,code_tables,labelled,synthetic}
mkdir -p frontend docs

# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv
.env
*.pem
.coverage
.pytest_cache/
htmlcov/
*.egg-info/

# Node
node_modules/
dist/
build/
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Database
*.db
*.sqlite3
postgres-data/

# ML
*.pth
*.ckpt
ml/data/raw/
ml/models/checkpoints/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
EOF

# Create README
cat > README.md << 'HEREDOC'
# National Material Identity Platform
SIH 26099 - AI-Driven Material Code Harmonization

## Quick Start
~~~bash
docker compose up
~~~

See COLLABORATION_GUIDE.md for development workflow.
HEREDOC

# Initial commit
git add .gitignore README.md
git commit -m "chore: initial project structure"
git push origin main
```

### 3. Protect Main Branch (On GitHub)
1. Go to: Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass
   - ✅ Do not allow bypassing the above settings

### 4. Setup CODEOWNERS (Optional but Recommended)
```bash
# Create .github/CODEOWNERS
mkdir -p .github
cat > .github/CODEOWNERS << 'EOF'
# All files default to Tech Lead
* @dev1

# Frontend needs Frontend Lead + Tech Lead
/frontend/ @dev3 @dev1

# Contracts need all developers
/contracts/ @dev1 @dev2 @dev3 @dev4
EOF
```

---

## Daily Workflow (All Developers)

### Step 1: Clone Repository (First Time)
```bash
git clone https://github.com/Naeemshaikh09/material-harmonization-platform.git
cd material-harmonization-platform
```

### Step 2: Create Your Feature Branch
```bash
# Update main first
git checkout main
git pull origin main

# Create new branch for your feature
# Naming convention: devN/<area>/<task>
git checkout -b dev1/backend/api-setup
# OR
git checkout -b dev2/ml/extractor
# OR
git checkout -b dev3/frontend/login-page
# OR
git checkout -b dev4/data/valve-templates
```

### Step 3: Work on Your Code
```bash
# Make changes in your files
# ... code code code ...

# Check what changed
git status

# Add specific files (never use blanket git add .)
git add backend/app/api/routes.py
git add backend/app/db/models.py

# Commit with meaningful message
git commit -m "feat: add ingestion API endpoints"

# Push to YOUR branch (not main!)
git push origin dev1/backend/api-setup
```

### Step 4: Keep Your Branch Updated
```bash
# Daily: sync with main to avoid conflicts
git checkout main
git pull origin main
git checkout dev1/backend/api-setup
git pull --rebase origin dev1/backend/api-setup  # Update your own branch
git merge main  # Merge latest main into your branch

# If conflicts, resolve them, then:
git add <resolved-files>
git commit -m "chore: merge main into dev1/backend/api-setup"
git push origin dev1/backend/api-setup
```

### Step 5: Create Pull Request
1. Go to GitHub repository
2. Click "Compare & pull request" (appears after push)
3. **Title**: `[Backend] Add ingestion API endpoints`
4. **Description**:
   ```
   ## Changes
   - Added POST /batches endpoint
   - Added batch status tracking
   - Unit tests for ingestion flow
   
   ## Testing
   - Tested with sample CSV upload
   - All tests passing
   
   ## Screenshots (for UI changes)
   [Attach screenshots HERE in PR description/comment - NEVER commit screenshots to repo]
   
   ## Checklist
   - [x] Code follows project style
   - [x] Tests added
   - [x] No breaking changes
   - [x] No secrets committed (.env, *.pem, etc.)
   - [x] Screenshots attached (UI changes only)
   ```
5. **Assign Reviewers**:
   - For PRs by Dev2, Dev3, or Dev4: Assign **Developer 1**
   - For PRs by Developer 1: Assign **Dev2, Dev3, or Dev4** (rotate)
   - For Frontend PRs: Additionally assign **Dev2 or Dev4**
6. Click "Create pull request"

### Step 6: Code Review & Merge
- **Reviewer**:
  - Reviews code
  - Suggests changes if needed
  - Approves when ready
  - **Author clicks "Squash and merge"** (NOT reviewer)
  - **Author deletes branch after merge**

- **Author**:
  - Makes requested changes
  - Pushes again to same branch
  - PR updates automatically
  - **Never merge your own PR** - wait for approval
  - Use "Squash and merge" option
  - Delete branch after successful merge

---

## Branch Naming Convention

```
devN/<area>/<task>

Examples:
✅ dev1/backend/api-setup
✅ dev2/ml/extractor
✅ dev3/frontend/login-page
✅ dev4/data/valve-templates
✅ dev1/backend/database-migration
✅ dev3/frontend/search-ui
✅ dev2/ml/baseline-model
✅ dev4/data/governance-rules
```

---

## PR Title Prefixes

Standardize your PR titles with these prefixes:

```
[Backend]   - Backend changes (Dev1)
[Frontend]  - Frontend changes (Dev3)
[ML]        - ML/AI changes (Dev2)
[Data]      - Data/governance changes (Dev4)
[Contracts] - Contract changes (any dev, needs all 4)
[Fix]       - Bug fixes (any dev)
[Docs]      - Documentation (any dev)

Examples:
✅ [Backend] Add batch ingestion endpoints
✅ [Frontend] Implement login page with Cognito
✅ [ML] Train baseline extraction model
✅ [Data] Add valve code templates
✅ [Contracts] Update canonical model to 20 attributes
✅ [Fix] Resolve CMC check digit calculation
✅ [Docs] Update API documentation
```

---

## Commit Message Format

```
<type>: <short description>

[optional body]

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- refactor: Code restructuring
- test: Adding tests
- chore: Build/config changes

Examples:
✅ feat: add CMC service with check digit
✅ fix: resolve attribute comparison logic
✅ docs: update API documentation
✅ refactor: extract matching logic to service
✅ test: add decision engine test cases
✅ chore: wip end of day
```

---

## Handling Conflicts

### When Git Says "CONFLICT"
```bash
# 1. See which files have conflicts
git status

# 2. Open conflicted files, look for:
<<<<<<< HEAD
your code
=======
their code
>>>>>>> main

# 3. Manually choose what to keep, remove markers

# 4. Mark as resolved
git add <file>

# 5. Complete merge
git commit -m "chore: resolve merge conflicts"
git push origin your-branch
```

---

## Common Scenarios

### Scenario 1: Developer 2 Needs Developer 4's Dictionary
```bash
# Developer 4 creates dictionary first
git checkout -b dev4/data/abbreviations
# ... create data/dictionaries/abbreviations.json ...
git add data/dictionaries/abbreviations.json
git commit -m "feat: add valve abbreviation dictionary"
git push origin dev4/data/abbreviations
# Create PR → Dev1 reviews → Merge to main

# Developer 2 gets it
git checkout main
git pull origin main
git checkout dev2/ml/extractor
git merge main  # Now has dictionary file
```

### Scenario 2: Two Developers Change Same File
```bash
# Developer 1 changes backend/app/db/models.py
# Developer 3 also changes same file
# When Dev3 tries to merge main:

git checkout main
git pull origin main
git checkout dev3/frontend/ui
git merge main
# CONFLICT in models.py

# Resolve conflict manually, then:
git add backend/app/db/models.py
git commit -m "chore: resolve conflict in models.py"
git push origin dev3/frontend/ui
```

### Scenario 3: Forgot to Create Branch
```bash
# Oh no! Made changes directly on main
git stash                    # Save your changes
git checkout -b dev1/backend/new-feature
git stash pop               # Restore changes
git add <specific-files>
git commit -m "feat: your changes"
git push origin dev1/backend/new-feature
```

---

## Daily Standup Checklist

Every developer before starting work:
```bash
# 1. Get latest main
git checkout main
git pull origin main

# 2. Update your branch
git checkout your-branch
git pull --rebase origin your-branch
git merge main

# 3. Check if teammates merged anything you need
git log main --oneline --since="1 day ago"
```

---

## Pull Request Review Checklist

**For Reviewer (Developer 1 or assigned reviewer):**
- [ ] Code follows project structure
- [ ] No secrets/passwords in code (.env, *.pem, API keys, etc.)
- [ ] Tests included
- [ ] No commented-out code
- [ ] Variable names are clear
- [ ] No breaking changes to contracts
- [ ] Dependencies documented
- [ ] Screenshots in PR description (NOT committed to repo)

**For Author:**
- [ ] Tested locally
- [ ] No merge conflicts
- [ ] Description explains WHY not just WHAT
- [ ] Screenshots attached in PR description/comment (UI changes only)
- [ ] Breaking changes clearly marked
- [ ] Proper reviewer assigned (Dev1 for most PRs; others for Dev1's PRs)
- [ ] Frontend PRs have additional approval from Dev2 or Dev4

---

## Emergency Commands

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes (DANGER!)
git reset --hard HEAD  # Does NOT delete untracked files

# Delete untracked files (DANGER!)
git clean -fd  # Use with extreme caution

# See who changed what
git blame <file>

# See commit history
git log --oneline --graph

# Create branch from old commit
git checkout -b dev1/backend/fix-old-bug abc1234

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# Stash changes temporarily
git stash
git stash pop

# NEVER force push to main or shared branches!
# On your own branch only, use:
git push --force-with-lease origin your-branch  # Safer than --force
```

---

## Integration Points (Critical!)

### Phase 0: Contracts First
**Before anyone codes, agree on:**
- `contracts/canonical.json` (20-attribute model + CMC format - Developer 1 + 4)
- `contracts/backend_api.json` or `openapi.yaml` (Developer 1)
- `contracts/extraction_api.json` (Developer 2)

**NOTE**: Frontend mocks live in `frontend/src/mocks/` and are generated FROM the contracts. Do NOT create `contracts/ui_mock.json`.

**Phase 0 Process:**
1. All 4 developers create ONE contracts-only PR
2. ALL 4 must review and approve
3. Only after approval can feature code begin

**Contract Changes Later:**
- Any contract change requires PR
- All 4 developers must be informed
- Cannot break existing integrations

### Integration Milestones
Our real implementation plan (from implementation.md):

- **Milestone 1** (End of Phase 1): Everyone's skeleton runs on mocks
  - Phase 0: Contracts + mocks + tokens ✅
  - Phase 1: Login/layout/upload working ✅
  
- **Milestone 2** (End of Phase 4): All screens built on mocks
  - Phase 2: Search-before-create + golden record ✅
  - Phase 3: Steward workbench ✅
  - Phase 4: Dashboard + admin ✅
  
- **Milestone 3** (End of Phase 5): Real model + real backend + real UI
  - Phase 5: Real API swap + polish ✅
  
- **Demo-ready** (End of Phase 6): Full demo rehearsed
  - Phase 6: Demo rehearsal ✅

---

## Mock-Driven Development

### Developer 3 (Frontend) - Start First!
```bash
# Use mock backend until Dev1's API is ready
# frontend/src/mocks/api.ts
export const mockBackend = {
  searchItem: async (text) => ({
    outcome: 'EXISTING',
    cmc: '0112-0003-0050-0017-0150-0001-4'
  })
}

# Generate mocks FROM contracts (not the other way around)
# Parse contracts/canonical.json and contracts/backend_api.json
```

### Developer 1 (Backend) - Use Stub Extractor
```bash
# backend/app/pipeline/stub_extractor.py
def extract_stub(text: str):
    # Simple rules until Dev2's model is ready
    return {"class": "0112", "confidence": 0.8}
```

---

## File Organization by Developer

```
Developer 1:
├── backend/app/api/          # Your area
├── backend/app/pipeline/     # Your area
├── backend/app/matching/     # Your area
├── backend/app/db/           # Your area
├── docker-compose.yml        # Your area
└── contracts/backend_api.json  # Your contracts

Developer 2:
├── ml/                       # Your area
├── backend/app/extraction/   # Interface point
└── contracts/extraction_api.json  # Your contracts

Developer 3:
├── frontend/                 # Your area
└── frontend/src/mocks/       # Your mocks (generated from contracts)

Developer 4:
├── data/                     # Your area
├── backend/app/audit/        # Your area
└── contracts/canonical.json  # Your contracts (with Dev1)
```

**Rule**: Don't modify other's area without discussion!

---

## Weekly Rhythm

### Monday
- Pull latest main
- Plan week's features
- Create branches

### Tuesday-Thursday
- Code + commit daily
- Merge main daily into your branch
- Ask for help in team chat

### Friday
- Create PRs
- Code review
- Merge if approved (Squash and merge)
- Integration testing

### Weekend
- Optional: prepare next week's contracts

---

## Troubleshooting

### "Permission denied"
```bash
# Setup SSH key (one time)
ssh-keygen -t ed25519 -C "your.email@example.com"
# Add ~/.ssh/id_ed25519.pub to GitHub Settings → SSH Keys
```

### "Your branch is behind"
```bash
git pull --rebase origin your-branch
```

### "Failed to push"
```bash
# Someone else pushed to your branch
git pull --rebase origin your-branch
git push origin your-branch
```

### "Merge conflict in every file"
```bash
# You merged wrong direction!
git merge --abort
# Correct way:
git checkout your-branch
git merge main  # Not the other way!
```

---

## Quick Reference Card

```bash
# Daily Start
git checkout main && git pull origin main
git checkout your-branch && git pull --rebase origin your-branch && git merge main

# While Working
git status                    # What changed?
git add <specific-files>     # Stage specific files
git commit -m "feat: message" # Save checkpoint
git push origin your-branch  # Backup to GitHub

# Before Going Home
git add <modified-files>
git commit -m "chore: wip end of day"
git push origin your-branch

# Next Morning
git pull --rebase origin your-branch  # Resume work
```

---

## Git Hygiene Rules

**DO:**
- ✅ Use `git add <specific-files>` for deliberate staging
- ✅ Use `git add -A` when you deliberately want all changes
- ✅ Use `git pull --rebase origin your-branch` to update your own branch
- ✅ Commit WIP work before end of day: `git commit -m "chore: wip end of day"`
- ✅ Use `git push --force-with-lease` on your own branch (safer)

**DON'T:**
- ❌ Never use blanket `git add .` without checking what's staged
- ❌ Never `git push --force` to main or shared branches
- ❌ Never commit `.env`, `*.pem`, or other secrets (use .gitignore)
- ❌ Never merge your own PR
- ❌ Never push directly to main (protected branch)

**Note on Secrets:**
- Keep `.env.example` in repo (template with placeholder values)
- Never commit actual `.env` with real secrets
- Never commit `*.pem`, API keys, passwords, tokens

---

## Team Communication

**Before changing contracts:**
- Post in team chat
- Wait for all 4 to acknowledge
- Then create PR with all 4 as reviewers

**When blocked:**
- Don't wait! Ask immediately
- Tag specific developer
- Merge mock data so others can continue

**Before demo:**
- Freeze code 2 days before
- Only bugfixes allowed
- All PRs need 2 approvals

---

## Success Metrics

✅ **Good Collaboration:**
- No direct commits to main
- PRs merged within 24 hours
- No mega-PRs (>500 lines)
- Daily syncs with main
- All tests pass before merge
- Screenshots in PR description, not in repo
- Proper reviewer assignment (Dev1 reviews most; others review Dev1)

❌ **Bad Practices:**
- Pushing to main directly
- Week-old branches not merged
- Breaking contracts without notice
- Merge conflicts in every PR
- No commit for 3 days
- Committing secrets or screenshots to repo
- Using `git add .` blindly

---

## Resources

- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- Team Slack/WhatsApp: Quick questions
- GitHub Issues: Bug tracking
- GitHub Projects: Task board
- Repository: https://github.com/Naeemshaikh09/material-harmonization-platform

---

**Remember**: 
- Commit early, commit often
- Pull main daily into your branch
- Ask for help quickly
- Code review is learning, not criticism
- Never commit secrets (.env, *.pem) - they go in .gitignore
- Screenshots go in PR descriptions, NOT in the repo
- We succeed together! 🚀

# National Material Identity Platform
**SIH 26099 - AI-Driven Material Code Harmonization**

## 🎯 Problem Statement
CPSEs use different codes for the same materials, causing duplicates, excess stock, and inefficient procurement. This platform standardizes material codes across all CPSEs using AI/ML.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Docker (optional)

### Setup
~~~bash
# Clone repository
git clone https://github.com/Naeemshaikh09/material-harmonization-platform.git
cd material-harmonization-platform

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Configure your environment
python main.py

# Frontend
cd frontend
npm install
npm run dev

# Docker (alternative)
docker compose up
~~~

## 👥 Team Structure

| Developer | Role | Responsibilities |
|-----------|------|------------------|
| **Dev1** | Backend Lead | API, Database, Pipeline, Matching Engine |
| **Dev2** | AI/ML Lead | Model Training, Extraction Service |
| **Dev3** | Frontend Lead | React UI, All Screens |
| **Dev4** | Data/Governance | Dictionaries, Templates, Audit Chain |

## 📁 Project Structure
```
material-harmonization-platform/
├── contracts/          # API contracts (Phase 0)
├── backend/            # FastAPI backend
├── ml/                 # AI/ML components
├── data/               # Reference data
├── frontend/           # React UI
└── docs/               # Documentation
```

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed structure.

## 🔄 Development Workflow

### 1. Create Feature Branch
~~~bash
git checkout -b devN/<area>/<task>
# Examples:
# dev1/backend/api-setup
# dev2/ml/extractor
# dev3/frontend/login-page
# dev4/data/valve-templates
~~~

### 2. Work & Commit
~~~bash
git add <specific-files>
git commit -m "feat: description"
git push origin your-branch
~~~

### 3. Create Pull Request
- Go to GitHub
- Create PR with proper title: `[Backend] Add feature`
- Assign reviewers
- Wait for approval
- Use "Squash and merge"
- Delete branch after merge

See [COLLABORATION_GUIDE.md](./COLLABORATION_GUIDE.md) for complete workflow.

## 📋 Development Phases

- **Phase 0**: Contracts + Mocks + Tokens
- **Phase 1**: Login/Layout/Upload
- **Phase 2**: Search-Before-Create + Golden Record
- **Phase 3**: Steward Workbench
- **Phase 4**: Dashboard + Admin
- **Phase 5**: Real API Swap + Polish
- **Phase 6**: Demo Rehearsal

## 🔑 Key Features

- **20-Attribute Model**: Universal material description
- **AI Extraction**: SLM-based attribute extraction
- **CMC Code System**: Standardized material codes with check digits
- **Search-Before-Create**: Prevent duplicates before creation
- **Review Workflow**: Human-in-the-loop for uncertain cases
- **Audit Chain**: Hash-chained tamper-proof logs
- **Procurement Analytics**: Pooled demand & price analysis

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL + JSONB
- SQLAlchemy + Alembic

**ML/AI:**
- Fine-tuned SLM
- PyTorch/Transformers
- Rule-based baseline

**Frontend:**
- React + TypeScript
- Vite + Tailwind CSS
- React Router

**DevOps:**
- Docker + Docker Compose
- GitHub Actions (planned)

## 📚 Documentation

- [COLLABORATION_GUIDE.md](./COLLABORATION_GUIDE.md) - GitHub workflow
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Directory structure
- [implementation.md](./docs/implementation.md) - Implementation plan
- [detailed_plan.md](./docs/detailed_plan.md) - Technical details

## 🔒 Security

**Never commit:**
- `.env` files with real secrets
- `*.pem`, `*.key` private keys
- API keys, passwords, tokens

**Always use:**
- `.env.example` for templates
- GitHub Secrets for CI/CD
- Proper `.gitignore` rules

## 🤝 Contributing

1. Read [COLLABORATION_GUIDE.md](./COLLABORATION_GUIDE.md)
2. Follow branch naming: `devN/<area>/<task>`
3. Write tests for new features
4. Get PR reviewed before merging
5. Never push directly to `main`

## 📊 Milestones

- ⏳ **Milestone 1** (End Phase 1): Skeleton on mocks
- ⏳ **Milestone 2** (End Phase 4): All screens on mocks
- ⏳ **Milestone 3** (End Phase 5): Real backend integrated
- ⏳ **Demo-ready** (End Phase 6): Full demo rehearsed

## 📞 Support

- **Git Issues**: Contact Dev3 (Admin)
- **Backend Issues**: Contact Dev1
- **ML Issues**: Contact Dev2
- **Frontend Issues**: Contact Dev3
- **Data Issues**: Contact Dev4

## 📄 License

MIT License - See LICENSE file for details

---

**Built for Smart India Hackathon 2026** 🇮🇳
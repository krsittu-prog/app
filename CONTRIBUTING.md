# Contributing to GS Pinnacle IAS

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a new branch for your feature/fix
4. **Make** your changes
5. **Test** thoroughly
6. **Push** your changes
7. **Create a Pull Request**

## 📋 Development Setup

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## 🔄 Workflow

### Branch Naming
- Feature: `feature/description`
- Bug fix: `bugfix/description`
- Hotfix: `hotfix/description`
- Documentation: `docs/description`

Example: `feature/add-course-reviews`

### Commit Messages
Use clear, descriptive commit messages:
```
feat: Add course review functionality
fix: Resolve video playback issue on Android
docs: Update API documentation
test: Add tests for authentication
```

### Code Style

#### Python (Backend)
- Follow PEP 8
- Use 4 spaces for indentation
- Type hints encouraged
- Format with Black: `black server.py`

#### JavaScript/TypeScript (Frontend)
- Use ESLint configuration
- Use 2 spaces for indentation
- Use TypeScript for new features
- Format with Prettier: `npm run format`

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing Checklist
- [ ] Feature works on web
- [ ] Feature works on Android
- [ ] Tested with different network conditions
- [ ] No console errors
- [ ] Responsive design (if applicable)

## 🐛 Reporting Issues

Use GitHub Issues with:
1. **Clear title** describing the problem
2. **Steps to reproduce** if it's a bug
3. **Expected behavior** vs actual behavior
4. **Screenshots/logs** if applicable
5. **Environment** info (OS, device, app version)

## 📚 Documentation

- Update README if adding features
- Add comments for complex logic
- Update API docs if changing endpoints
- Add inline JSDoc/docstrings for functions

## ✅ Pull Request Process

1. **Create descriptive PR title** - e.g., "feat: Add payment integration"
2. **Fill PR template** - All sections required
3. **Link related issues** - Use `Fixes #123`
4. **Request reviewers** - Tag relevant maintainers
5. **Address feedback** - Push new commits to same branch
6. **Ensure CI passes** - All tests must pass
7. **Squash commits** if requested
8. **Get approval** before merging

## 📞 Getting Help

- **Questions?** Start a Discussion
- **Need guidance?** Open an issue with `[HELP]` label
- **Security concern?** Email security@gspinnacle.com

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Report violations appropriately

## 🎯 Areas We Need Help With

- [ ] User interface improvements
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation
- [ ] Tests & QA
- [ ] Infrastructure & deployment
- [ ] Accessibility improvements

## 📦 Release Process

1. Update version in package.json/setup.py
2. Update CHANGELOG.md
3. Create release branch
4. Test thoroughly
5. Merge to main
6. Tag release on GitHub
7. Build and deploy

## ❓ Questions?

- Check existing issues/discussions
- Review documentation
- Ask in GitHub Discussions
- Contact maintainers

---

**Thank you for contributing to GS Pinnacle IAS!** 🙏

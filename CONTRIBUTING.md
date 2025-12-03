# Contributing to AI Muhasebi

Thank you for your interest in contributing to AI Muhasebi!

## Code of Conduct

Please be respectful and professional in all interactions.

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `staging`: Staging environment branch
- `feature/description`: Feature branches (e.g., `feature/invoice-export`)
- `fix/description`: Bug fix branches (e.g., `fix/login-error`)
- `hotfix/description`: Hotfix branches (from `main`)
- `release/v1.0.0`: Release branches (from `develop`)

### Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all tests pass: `pnpm test`
4. Ensure linting passes: `pnpm lint`
5. Ensure type checking passes: `pnpm type-check`
6. Create a pull request to `develop`
7. Request review from maintainers

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(invoices): add export functionality

Add CSV and PDF export options for invoice lists.
Includes date range filtering and column selection.

Closes #123
```

## Code Style

- Follow ESLint rules (run `pnpm lint`)
- Format code with Prettier (run `pnpm format`)
- Use TypeScript for all new code
- Follow naming conventions (see Architecture docs)

## Testing Requirements

- Write unit tests for new features
- Maintain or improve test coverage
- All tests must pass before merging

## PR Template

When creating a PR, include:

- Description of changes
- Related issue number (if applicable)
- Screenshots (for UI changes)
- Testing instructions
- Checklist of completed items


# Contributing to @productiongrade/passkeys

Thank you for your interest in contributing to @productiongrade/passkeys! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- **Node.js**: >=20.0.0
- **npm**: >=9.0.0
- **Git**: Latest stable version

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/passkeys.git
   cd passkeys
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Development Workflow

### Project Structure

```
src/
├── core/              # Core passkey services and types
│   ├── services/      # PasskeyService, ChallengeService, RecoveryService
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── express/           # Express.js middleware and handlers
├── react/             # React hooks and utilities
└── adapters/          # Storage adapter implementations
    ├── memory/        # In-memory storage (dev/test)
    ├── prisma/        # Prisma/PostgreSQL adapter
    └── redis/         # Redis challenge storage

tests/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for complete flows
└── contract/          # Contract tests for storage implementations

examples/              # Example applications
```

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Run Linters**
   ```bash
   npm run lint
   npm run format
   ```

4. **Run Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build process or auxiliary tool changes

Examples:
```
feat: add support for custom challenge TTL
fix: resolve counter anomaly false positives
docs: update React hooks examples
test: add integration tests for recovery flow
```

## Testing Guidelines

### Writing Tests

1. **Unit Tests** (`tests/unit/`)
   - Test individual functions and classes in isolation
   - Mock external dependencies
   - Focus on edge cases and error conditions

2. **Integration Tests** (`tests/integration/`)
   - Test complete workflows (registration, authentication, recovery)
   - Use real storage implementations when possible
   - Verify correct interaction between components

3. **Contract Tests** (`tests/contract/`)
   - Ensure storage adapters implement required interfaces correctly
   - Test with both MemoryStorage and custom adapters
   - Verify data integrity and edge cases

### Test Coverage

- Aim for >90% code coverage
- All new features must include tests
- Bug fixes should include regression tests

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts
```

## Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code
npm run format
```

### Style Guidelines

- Use TypeScript for all code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Avoid `any` types unless absolutely necessary
- Use strict null checks

## Documentation

### Updating Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to new public methods
- Update TypeScript types and interfaces
- Create examples for new features
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

### Documentation Standards

```typescript
/**
 * Brief description of what the function does
 * 
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When and why this error is thrown
 * 
 * @example
 * ```typescript
 * const result = myFunction('value');
 * ```
 */
export function myFunction(paramName: string): ReturnType {
  // implementation
}
```

## Pull Request Process

1. **Before Submitting**
   - Ensure all tests pass
   - Run linters and fix any issues
   - Update documentation
   - Add entry to CHANGELOG.md
   - Rebase on latest main branch

2. **Submit Pull Request**
   - Provide clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes
   - List any breaking changes

3. **Review Process**
   - Address reviewer feedback
   - Keep PR focused and atomic
   - Ensure CI checks pass
   - Maintain clean commit history

4. **After Merge**
   - Delete your feature branch
   - Close related issues

## Reporting Issues

### Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)
- Relevant code snippets or error messages
- Minimal reproduction example if possible

### Feature Requests

For feature requests, please include:
- Clear description of the feature
- Use cases and benefits
- Potential implementation approach
- Examples from other libraries (if applicable)

## Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities. Instead, please email security@productiongrade.dev with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We take security seriously and will respond promptly to all reports.

## Storage Adapter Development

### Creating Custom Adapters

See `docs/ADAPTERS.md` for detailed guide on implementing custom storage adapters.

Key requirements:
- Implement `PasskeyStorage` interface completely
- Handle concurrent access safely
- Implement proper error handling
- Add contract tests to verify correctness
- Document any specific requirements

### Contract Test Requirements

All storage adapters must pass the contract test suite:

```typescript
import { runStorageContractTests } from './contract/storage-implementations.test';

describe('MyCustomStorage', () => {
  runStorageContractTests(() => new MyCustomStorage());
});
```

## Release Process

(For maintainers only)

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run full test suite
4. Create release tag
5. Publish to npm
6. Create GitHub release

## Questions?

- Check existing issues and pull requests
- Review documentation in `docs/`
- Ask in GitHub Discussions
- Email: support@productiongrade.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to @productiongrade/passkeys! 🎉


# Contributing

Thank you for your interest in contributing to the **Supabase Upload Docs
Action**! This guide will help you get started with the development process and
explain how you can contribute to the project.

## Project Scope

Before contributing please make sure your contribution aligns with the project
scope.

The action is designed to **synchronize documentation from a GitHub repository
to Supabase Storage and Database**. It **does not modify content** - it simple
**uploads files and updates metadata**.

### What This Action **Does**

- **Uploads files** to **Supabase Storage**
- **Provides flexible configuration options** for **storage paths**.
- **Supports configurable metadata storage** in Supabase Database, but remains
  **optional**.
- **Generates an article map** to provide **structured navigation** for
  documentation files.
- **Allows to override generated metadata**.

### What This Action **Does Not Do**

- **Does not modify your repository** - It does not change the repository
  settings or contents.
- **Does not modify Supabase configuration** - It **won't** create, delete, or
  alter, database schemas, RLS policies or storage buckets and their settings.
- **Does not process or transform files** - Uploaded files **remain unchanged**,
  meaning **no Markdown-to-HTML conversion** or any other content midifications
  occur.
- **Does not generate new content** - It only **uploads existing files**; it
  **won't create documentation for you**.
- **Does not support non-Supabase storage** - This action is **build
  specifically for Supabase**.

## Ways to Contribute

There are several ways you can contribute to the project:

1. [Bug Reports](#bug-reports): Report issues or unexpected behavior.
2. [Feature Requests](#feature-requests): Suggest new functionality or
   improvements.
3. [Documentation](#documentation): Improve or fix documentation.
4. [Code Contributions](#code-contributions): Submit fixes, improvements, or new
   features.

## Bug Reports

If you find a bug, please open an issue:
[Report a Bug](https://github.com/rafalberezin/supabase-upload-docs-action/issues/new?template=bug_report.yml)

## Feature Requests

Have an idea for an improvement that aligns with the
[project scope](#project-scope)? Let us know:
[Request a Feature](https://github.com/rafalberezin/supabase-upload-docs-action/issues/new?template=feature_request.yml)

## Documentation

If you notice outdated or unclear documentation, feel free to open an issue or
submit a change

Even small fixes, like typo corrections, are appreciated!

## Code Contributions

### Before You Start

- Check for **existing issues** - Someone may have already reported or discussed
  the change you're planning.
- **Open an issue before creating a PR** - If your change is **significant**
  (new feature, refactor, major update), please open an issue first to discuss
  it. This helps avoid duplicate work a nd ensures alignment with the project's
  goals.
- **Ensure your idea aligns with the [Project Scope](#project-scope)** - Changes
  that fall outside the project's intended functionality may not be accepted.

### Development Setup

This project uses [pnpm](https://pnpm.io/). Please **do not commit**
`package-lock.json` (from `npm`) or `yarn.lock` (from `yarn`), as they will
conflict with `pnpm-lock.yaml`.

If you are unfamilliar with `pnpm`, install it with:

```
npm install -g pnpm
```

To set up the development environment:

1. **[Fork the repository](https://github.com/rafalberezin/supabase-upload-docs-action/fork)**
   and clone it.
2. **Install dependencies** using **pnpm**

   ```
   pnpm install
   ```

3. Create a branch for your changes.

### Branch Naming Convention

Please follow these branch naming conventions:

- `feature/` - For new features
- `fix/` - For bug fixes
- `docs/` - For documentation changes

### Commit Message Guidelines

This project follows
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Use the
following format:

```
type(scope): short description

[optional body]

[optional footer]
```

Types include:

- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code changes that neither fix bug nor add features
- `test` - Adding or modifying tests
- `chore` - Maintenance tasks (e.g, updating dependencies)

### Code Style and Standards

This project uses:

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting

Ensure your code is **properly formatted and linted** before submitting your PR
by running:

```
pnpm format:write

pnpm lint
```

### Testing Your Changes

#### Writing Tests

- All new features should include tests.
- Bug fixes should include a test that reproduces the bug.
- Use mocks for Supabase API calls to avoid depending on external services.

#### Testing Changes

Ensure all tests pass:

```
pnpm test
```

For testing your changes in a real project:

1. Build the action:

   ```
   pnpm run build
   ```

2. Create a workflow that uses your action:

   ```yaml continue=before
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: path/to/your/fork/supabase-upload-docs-action@your-branch
           with:
             # Configuration
   ```

3. Run the workflow:
   - In a test repository
   - Locally using [act](https://nektosact.com/)

### Submitting a Pull Request

After you made sure that everything is working correctly, and all standards are
met, you can:

1. Push your changes to your fork
2. [Open a Pull Request](https://github.com/rafalberezin/supabase-upload-docs-action/compare)
   and fill a

### Handling PRs That Do Not Follow Guidelines

If a PR does not follow these guidelines, maintainers will:

- **Request changes** and provide feedback.
- If no response is given, **close the PR** after a reasonable time.
- If the PR includes unrelated or low-quality changes, **it may be rejected
  immediately**.

### Release Process

New releases are managedd by the project maintainers.

## Code of Conduct

Please note that this project follows a
[Code of Conduct](https://github.com/rafalberezin/supabase-upload-docs-action/blob/master/CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## License

This project is licensed under
[**MIT License**](https://github.com/rafalberezin/supabase-upload-docs-action/blob/master/LICENSE).
By contributing to this project, you agree that your contributions will be
licensed under the project's license.

---

Thank you for contributing to the **Supabase Upload Docs Action**. Your efforts
help make this tool better for everyone.

## Next

- [v2 Roadmap](./08-v2-roadmap.md) - See plans for the future.
- [How I Use It](./09-how-i-use-it.md) - If you're interested in my personal
  insight on how I use it and what guided my decisions on the action's design.

# Best Practices

This section provides recommendations for effectively using the **Supabase
Upload Docs Action** in your projects.

## Documentation Structure

Keep your documentation well structured and organized for ease of use and
maintenance.

### Keep Your Repository Organized

Place all your documentation in a single centralized directory and maintain a
clear separation between content and supporting files. Use descriptive names
like `docs` for the documentation directory, `articles` for written content, and
`assets` for supporting assets like images.

```tree title=Example Structure
<repository root>/
├── docs/
│   ├── articles/...
│   ├── assets/...
│   └── meta.yml
└── ...
```

This structure improves discoverability and simplifies maintenance.

### Use Numeric Prefixes for Ordering

Use numeric prefixes to order your documentation and leverage the
[prefix trimming](./03-configuration.md#trim-prefixes) feature to maintain a
clean URL structure.

```tree title=Example Repository Structure
docs/
└── articles/
    ├── 00-introduction.md
    └── 01-core-concepts/
        └── 00-overview.md
```

```tree title=Resulting Storage Bucket Structure
<storage bucket>/
└── <slug>/
    └── articles/
        ├── introduction.md
        └── core-concepts/
            └── overview.md
```

This approach:

- Preserves logical order in your repository.
- Creates clean URLs like `/introduction`, `/core-concepts/overview`, etc.
- Makes it easy to insert new content between existing files.

### Group Related Content in Directories

Organize your documentation into logical directories:

```tree title=Example Structure
docs/
├── articles/
│   ├── 00-getting-started.md
│   ├── 01-features/
│   │   ├── 00-core-features.md
│   │   └── 01-advanced-features.md
│   └── 02-tutorials/...
└── assets/
    ├── images/
    │   ├── diagrams/...
    │   └── screenshots/...
    └── videos/...
```

This structure provides clear organization that scales well as documentation
grows.

### Use Descriptive Names

Name your assets descriptively rather than generically:

- [x] **GOOD**: `user-authentication-flow.svg`
- [ ] **BAD**: `diagram1.svg`

## Workflow Configuration

### Optimize Triggers

Configure your workflow to run only when documentation changes:

```yaml continue|highlight=4-5
on:
  push:
    branches: [master, main]
    paths:
      - docs/**
```

Additionally you might want to trigger the workflow if it changes as well, or
allow it to be triggered manually:

```yaml continue|highlight=2,7
on:
  workflow_dispatch:
  push:
    branches: [master, main]
    paths:
      - docs/**
      - .github/workflows/docs.yml
```

Or when a release is published:

```yaml continue
on:
  release:
    types:
      - published
```

### Optimize checkout

The action only needs to access the paths specified in the configuration. For
faster runs, limit what is downloaded using `sparse-checkout`:

```yaml continue=before,after
- uses: actions/checkout@v4
  with:
    sparse-checkout: |
      docs/
```

This will only download `docs/` directory.

## Metadata Management

### Custom Fields

Add useful metadata to improve your documentation frontend:

```yaml
accent_color: cornflowerblue
tags:
  - A most goodest project
  - Another great tag
```

> [!IMPORTANT]
>
> Make sure your database table can accept your custom data or the action will
> fail.

Learn more about the **metadata file** in
[Metadata Management](./02-core-concepts/02-metadata-management.md#metadata-file).

## Database

### Keep Track of Time

Keeping track of when the metadata was uploaded and last updated, might be
useful. For example, you could show all your projects ordered by latest update
time.

Add columns for that while creating a table:

```pgsql
CREATE TABLE projects (
	-- Other columns
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Or add columns to an existing table:

```pgsql
ALTER TABLE projects
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

Now let's make the `updated_at` columns update automatically, whenever the row
changes. First, let's create a special function:

```pgsql
CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

You might call it however you like, just make the name descriptive. Next, let's
make it run automatically whenever a row changes:

```pgsql
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

## Continuous Improvement

### Monitor Upload Performance

For large documentation sets, monitor the actions's performance:

1. Check the GitHub Action logs for duration of runs.
2. Consider splitting very large documentation sets into separate workflows.
3. Optimize asset sizes before uploading. (compress images, etc.)

## Next

- [Contributing](./07-contributing.md) - If you found a bug, have an idea for a
  new feature, or just want to help improve the action, check the contributing
  guide.
- [v2 Roadmap](./08-v2-roadmap.md) - See plans for the future.
- [How I Use It](./09-how-i-use-it.md) - If you're interested in my personal
  insight on how I use it and what guided my decisions on the action's design

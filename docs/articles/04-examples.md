# Examples

This section provides practical examples of how to use **Supabase Upload Docs
Action** with different configurations and use cases.

## Basic Example: Upload Documentation to Supabase Storage

This example shows a minimal setup for syncing documentation files from
`docs/articles/` to Supabase Storage.

### Workflow Configuration

> [!IMPORTANT]
>
> The action operates on the files locally, so you need to download them first,
> for example using the `checkout` action. See **line 11**.

```yaml lines|highlight=11
name: Upload documentation
on:
  push:
    branches: [master, main]
    paths: [docs/**]

jobs:
  upload-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: action/checkout@v4
      - uses: rafalberezin/supabase-upload-docs-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          supabase-url: ${{ secrets.SUPABASE_URL }}
          supabase-key: ${{ secrets.SUPABASE_KEY }}
          articles-path: docs/articles
          storage-bucket: documentation
```

### Repository Structure

```tree
docs/
└── articles/
    ├── 00-getting-started.md
    └── 01-features/
        └── 00-basic-features.md
```

### Expected Outcome

- All files inside `docs/articles/` are uploaded to **Supabase Storage** under
  `<slug>/articles`. Where `<slug>` is your project slug, generated as explained
  in
  [Slugs and Titles](./02-core-concepts/00-slugs-and-titles.md#project-slug-and-title-priority).
- Numeric prefixes will be trimmed from uploaded file and directory names. For
  example: `00-getting-started.md` becomes `getting-started.md`.

The files inside the `documentation` storage bucket will look like:

```tree
<storage bucket>/
└── <slug>/
    └── articles/
        ├── getting-started.md
        └── features/
            └── basic-features.md
```

## Example: With Assets Upload

This example extends the basic setup to also store assets in the storage bucket.
Articles and assets are stored separately for organization and easier
distinction, since certain features should only affect articles. Mainly the
[prefix trimming](./03-configuration.md#trim-prefixes) and
[article mapping](./02-core-concepts/03-article-mapping.md).

### Workflow Configuration

```yaml continue=before|highlight=7,9
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-key: ${{ secrets.SUPABASE_KEY }}
    articles-path: docs/articles
    assets-path: docs/assets
    storage-bucket: documentation
    storage-assets-dir: assets
```

### Repository Structure

```tree highlight=6-7
docs/
├── articles/
│   ├── 00-getting-started.md
│   └── 01-features/
│       └── 00-basic-features.md
└── assets/
    └── logo.svg
```

### Expected Outcome

- All files inside `docs/articles/` are uploaded to **Supabase Storage** under
  `<slug>/articles`.
- Numeric prefixes will be trimmed from file and directory names. For example:
  `01-getting-started.md` becomes `getting-started.md`. This **only affects
  articles**.
- All files inside `docs/assets/` are uploaded to **Supabase Storage** under
  `<slug>/assets`.

Where `<slug>` is your project slug, generated as explained in
[Slugs and Titles](./02-core-concepts/00-slugs-and-titles.md#project-slug-and-title-priority).

The files inside the `documentation` storage bucket will look like:

```tree highlight=7-8
<storage bucket>/
└── <slug>/
    ├── articles/
    │   ├── getting-started.md
    │   └── features/
    │       └── basic-features.md
    └── assets/
        └── logo.svg
```

## Example: Using Metadata Management

This example extends the basic setup to also store project metadata in Supabase
Database.

### Workflow Configuration

```yaml continue=before|highlight=8
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-key: ${{ secrets.SUPABASE_KEY }}
    articles-path: docs/articles
    storage-bucket: documentation
    meta-table: projects
```

### Repository Structure

```tree
docs/
└── articles/
    ├── 00-getting-started.md
    └── 01-features/
        └── 00-basic-features.md
```

### Expected Outcome

- File upload is handled the same way as in the
  [Basic Example](#basic-example-upload-documentation-to-supabase-storage).
- Additionally project metadata is uploaded to `projects` table in Supabase
  Database.

The uploaded metadata will be:

| Table Column     | Type              |
| ---------------- | ----------------- |
| `slug`           | `TEXT`            |
| `title`          | `TEXT`            |
| `description`    | `TEXT`            |
| `license`        | `TEXT`            |
| `source`         | `TEXT`            |
| `latest_version` | `TEXT`            |
| `versions`       | `TEXT[]`          |
| `articles`       | `JSON` or `JSONB` |

The value of `articles` will be:

```json
{
	"type": "root",
	"children": [
		{
			"type": "article",
			"title": "Getting Started",
			"path": "<slug>/articles/getting-started.md"
		},
		{
			"type": "directory",
			"title": "Features",
			"children": [
				{
					"type": "article",
					"title": "Basic Features",
					"path": "<slug>/articles/features/basic-features.md"
				}
			]
		}
	]
}
```

To learn more about the structure of `articles` see
[Article Mapping](./02-core-concepts/03-article-mapping.md).

The other data is generated as explained in
[Metadata Management: Data Sources](./02-core-concepts/02-metadata-management.md#data-sources).

## Example: Using Metadata File

Metadata file let's you overwrite generated data such as `slug` or add custom
data. For detailed explanation see
[Metadata Management: Metadata File](./02-core-concepts/02-metadata-management.md#metadata-file).

### Workflow Configuration

```yaml continue=before|highlight=7
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-key: ${{ secrets.SUPABASE_KEY }}
    articles-path: docs/articles
    meta-path: docs/meta.yml
    storage-bucket: documentation
    meta-table: projects
```

### Repository Structure

```tree highlight=4
docs/
├── articles/
│   └── ...
└── meta.yml
```

### Metadata File

```yaml
slug: my-project-slug
title: Custom Title
accent_color: cornflowerblue
tags:
  - Documentation
  - GitHub Action
```

### Expected outcome

- File upload is handled the same way as in the
  [Basic Example](#basic-example-upload-documentation-to-supabase-storage).

The uploaded metadata will be:

| Table Column     | Type              | Value                               |
| ---------------- | ----------------- | ----------------------------------- |
| `slug`           | `TEXT`            | `my-project-slug`                   |
| `title`          | `TEXT`            | `Custom Title`                      |
| `description`    | `TEXT`            | <_generated_>                       |
| `license`        | `TEXT`            | <_generated_>                       |
| `source`         | `TEXT`            | <_generated_>                       |
| `latest_version` | `TEXT`            | <_generated_>                       |
| `versions`       | `TEXT[]`          | <_generated_>                       |
| `articles`       | `JSON` or `JSONB` | <_generated_>                       |
| `accent_color`   | `TEXT` **\***     | `cornflowerblue`                    |
| `tags`           | `TEXT[]` **\***   | `["Documentation", "GitHubAction"]` |

\* These column data types must match the custom data supplied in the metadata
file.

## Example: Custom Column Mappings

If your database schema differes from the action's defaults, you can map
metadata fields to custom columns or omit certain fields. For more information
see [Configuration: Column Mappings](./03-configuration.md#column-mappings).

### Workflow Configuration

```yaml continue=before|highlight=10-12
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-key: ${{ secrets.SUPABASE_KEY }}
    articles-path: docs/articles
    meta-path: docs/meta.yml
    storage-bucket: documentation
    meta-table: projects
    column-mappings: |
      title: project_name,
      source: _
```

### Metadata File

> [!IMPORTANT]
>
> Metadata fields use already mapped names.

```yaml
slug: my-project-slug
project_name: Custom Title
```

### Expected outcome

- File upload is handled the same way as in the
  [Basic Example](#basic-example-upload-documentation-to-supabase-storage).

The uploaded metadata will be:

| Table Column     | Type              | Value             |
| ---------------- | ----------------- | ----------------- |
| `slug`           | `TEXT`            | `my-project-slug` |
| `project_name`   | `TEXT`            | `Custom Title`    |
| `description`    | `TEXT`            | <_generated_>     |
| `license`        | `TEXT`            | <_generated_>     |
| `latest_version` | `TEXT`            | <_generated_>     |
| `versions`       | `TEXT[]`          | <_generated_>     |
| `articles`       | `JSON` or `JSONB` | <_generated_>     |

In this example:

- `title` is uploaded to `project_name` column instead.
- `source` is **not** uploaded, meaning the column is not required to exist.

## Example: Keep Numeric Prefixes

By default, numeric prefixes are **trimmed** from file and directory names. To
keep the prefixes set
[`trim-prefixes` input](./03-configuration.md#trim-prefixes) to `false`.

### Workflow Configuration

```yaml continue=before|highlight=4
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    # Basic configuration ...
    trim-prefixes: false
```

### Expected Outcome

With this change to the basic configuration, the files inside the storage bucket
will be structured in the following way:

```tree
<storage bucket>/
└── <slug>/
    └── articles/
        ├── 00-getting-started.md
        └── 01-features/
            └── 00-basic-features.md
```

## Next

- [Troubleshooting](./05-troubleshooting.md) - If you're having issues, check
  the troubleshooting guide.
- [Best Practices](./06-best-practices.md) - If you're unsure how to organize
  your documentation and configure the action, check my recommendations.
- [Contributing](./07-contributing.md) - If you found a bug, have an idea for a
  new feature, or just want to help improve the action, check the contributing
  guide.
- [v2 Roadmap](./08-v2-roadmap.md) - See plans for the future.
- [How I Use It](./08-how-i-use-it.md) - If you're interested in my personal
  insight on how I use it and what guided my decisions on the action's design.

# Supabase Upload Docs Action

![GitHub License](https://img.shields.io/github/license/rafalberezin/supabase-upload-docs-action?style=for-the-badge&logo=github)

A GitHub Action that automated the process of uploading and managing project
documentation in Supabase. This action handles both file storage and metadata
management, making it easy to maintain documentation alongside your codebase.

## Features

- Uploads documentation articles and assets to Supabase Storage
- Optional metadata management in Supabase Database
- Generates ordered, hierarchical article map trees
- Automatically generates slugs and titles from file names
- Handles file updates efficiently using ETags
- Supports custom metadata fields
- Optional numeric prefix trimming for ordering while maintaining clean paths

## Usage

> [!IMPORTANT]
>
> This action works on local files so you need to download those before, for
> example using the [checkout action](https://github.com/actions/checkout)

```yaml
- uses: actions/checkout@v4
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-key: ${{ secrets.SUPABASE_KEY }}
    articles-path: docs/articles
    storage-bucket: projects
```

## Inputs

| Input                  | Description                                                                  | Required | Default         |
| ---------------------- | ---------------------------------------------------------------------------- | -------- | --------------- |
| `github-token`         | GitHub token for repository access                                           | ✓        | -               |
| `supabase-url`         | Supabase project URL                                                         | ✓        | -               |
| `supabase-key`         | Supabase project API key with storage permissions                            | ✓        | -               |
| `articles-path`        | Path to documentation articles directory                                     | ✓        | `docs/articles` |
| `assets-path`          | Path to documentation assets directory                                       |          | -               |
| `meta-path`            | Path to metadata file (.yml, .yaml, or .json)                                |          | -               |
| `storage-bucket`       | Supabase storage bucket name                                                 | ✓        | -               |
| `storage-articles-dir` | Path to articles directory in storage                                        | ✓        | `articles`      |
| `storage-assets-dir`   | Path to assets directory in storage (required if `assets-path` is specified) | \*       | -               |
| `trim-prefixes`        | Whether to trim numeric prefixes from file names                             | ✓        | `true`          |
| `meta-table`           | Database table for storing project metadata. Required for metadata upload    |          | -               |
| `column-mappings`      | YAML string mapping generated column names to custom ones                    |          | -               |

## Storage structure

Files are uploaded to your Supabase storage bucket using the following path
structure:

```
<slug>/<storage-articles-dir>/<generated path> # For articles
<slug>/<storage-assets-dir>/<generated path> # For assets
```

The paths are generated from local file paths, with optional prefix trimming.

## Metadata Management

Metadata management is optional and only runs when `meta-table` is specified.
The metadata file can include any custom fields, but they must match column
names in your database table. The metadata file can be a yaml (.yml and .yaml)

The generated project metadata is upserted into the `meta-table` database table.
The row to be updated is found based on the slug. It doesn't need to be unique,
but it probably should be.

### Generated Data

The action generates the following data that can be mapped to custom column
names:

| Field            | Type       | Description                                                      |
| ---------------- | ---------- | ---------------------------------------------------------------- |
| `slug`           | `string`   | Project identifier in URLs. Generated from metadata or repo name |
| `title`          | `string`   | Project display name                                             |
| `description`    | `string`   | Project description                                              |
| `license`        | `string`   | Project license name                                             |
| `source`         | `string`   | Projectr URL                                                     |
| `latest_version` | `string`   | Latest release tag                                               |
| `versions`       | `string[]` | Array of all release tags                                        |
| `articles`       | `json`     | Generated article map tree structure                             |

### Slug generation

The project slug is determined in the following order:

1. Read from metadta file using mapped column name
2. Generated from title in metadata file (if exists)
3. Generated from repository name

For example, with this column mappings:

```yaml
column-mappings: |
  slug: project_slug
  title: project_name
```

And this metadata file:

```yaml
project_name: 'My Project'
```

The project slug will be "my-project" generated from the mapped title field.

### Column mappings

You can customize database column names using YAML mappings. Mapping to `_`
excludes the generated data.

```yaml
column-mappings: |
  slug: project_slug
  title: project_name
  versions: project_versions
  articles: article_tree
  latest_version: _
  source: _
```

Using the above mappings `latest_version` and `source` will not be uploaded to
the database. The other 4 fields will be uploaded under their mapped names and
the rest with the default ones.

### Metadata file

The metadata file should use already mapped column names that exist in your
database table:

```yaml
# Example meta.yml using custom mapped names
project_slug: my-project
project_name: My Project
custom_field: Custom Value # Must match a column in the database
```

### Article Map

The action generates a hierarchical map of your documentation structure.
Directories and articles are ordered alphabetically. You can use numeric
prefixes for custom ordering (e.g., `01-getting-started.md`,
`02-directory/01-nested-article.md`) and optionally trim them from the final
paths using the `trim-prefixes` input.

An example article map generated by the action:

```json
{
	"type": "root",
	"children": [
		{
			"type": "article",
			"title": "Getting Started",
			"path": "<slug>/<storage-articles-dir>/getting-started.md"
		},
		{
			"type": "directory",
			"title": "Configuration",
			"children": [
				{
					"type": "article",
					"title": "Basics",
					"path": "<slug>/<storage-articles-dir>/configuration/basics.md"
				}
			]
		}
	]
}
```

`<slug>` is the project slug generated by the action. `<storage-articles-dir>`
is the value of the action input of the same name.

This article map can is generated with an example structure like so:

```
project_dir/
├── <articles-path>
│   ├── 00-getting-started.md
│   └── configuration
│       └── 00-basics.md
└── (other files)
```

`<articles-path>` is the path defined by the input of the same name.

## Examples

### Basic usage

```yaml
name: Upload docs
on:
  push:
    branches: [master, main]
    paths: [docs/**]

jobs:
  upload-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rafalberezin/supabase-upload-docs-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          supabase-url: ${{ secrets.SUPABASE_URL }}
          supabase-key: ${{ secrets.SUPABASE_KEY }}
          articles-path: docs/articles
          storage-bucket: projects
```

### With Assets, Metadata and Custom Column Names

```yaml
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-key: ${{ secrets.SUPABASE_KEY }}
    articles-path: docs/articles
    assets-path: docs/assets
    meta-path: docs/meta.yml
    storage-bucket: documentation
    storage-articles-dir: articles
    storage-assets-dir: assets
    meta-table: projects
    column-mappings: |
      slug: project_slug
      title: project_name
      latest_version: _
```

### Full Setup With Explanation

Let's create an example setup that shows different functionalities in action.

#### Supabase setup:

Let's make the database table different that what's expected b default to show
how we can adjust the action.

- Storage Bucket: `documentation`
- Metadata table: `projects`

  Columns:

  - `id`: **int8** _primary_
  - `project_slug`: **text** _unique_
  - `project_name`: **text**
  - `description`: **text**
  - `license`: **text**
  - `version`: **text**
  - `articles`: **json** (or **jsonb**)
  - `featured`: **bool**
  - `accent_color`: **text**

(The `project_slug` could have been the primary key in that table instead of
`id`)

First, let's use different column names for some of the generated data:
`project_slug` for `slug`, `project_name` for `title` and `version` for
`latest_version`.

Next, let's skip `source` and `versions` (which would have been: **text**
_defined as array_)).

And last, let's store some custom data: `featured` and `accent_color`

#### Project structure

The articles and their subdirectories will use numeric prefixes like `00-` or
`15-` for ordering. This helps with maintaining the documentation and ensures
the generated article map will be in the right order.

```
project_dir/
├── .github/
│   └── workflows/
│       └── docs.yml
├── docs/
│   ├── articles/
│   │   ├── 00-getting-started.md
│   │   └── ...
│   ├── assets/
│   │   ├── logo.svg
│   │   └── ...
│   └── meta.yml
└── (project files...)
```

#### Github workflow:

We'll update the documentation when it changes on the `main` or `master` branch
or when a new version is released.

```yaml
name: Upload docs
on:
  push:
    branches: [master, main]
    paths: [docs/**]
  release:
    types: [published]

jobs:
  upload-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rafalberezin/supabase-upload-docs-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          supabase-url: ${{ secrets.SUPABASE_URL }}
          supabase-key: ${{ secrets.SUPABASE_KEY }}
          articles-path: docs/articles
          assets-path: docs/assets
          meta-path: docs/meta.yml
          storage-bucket: documentation
          storage-articles-dir: articles
          storage-assets-dir: assets
          meta-table: projects
          column-mappings: |
            slug: project_slug
            title: project_name
            latest_version: version
            versions: _
            source: _
```

You also need to setup the supabase secrets. To do that go to
`repository > Settings > Secrets and Variables > Action` then add the supabase
url and key in the `Repository Secrets` section.

#### Metadata file:

```yaml
project_slug: my-project-slug
project_name: My Project
featured: true
accent_color: '#32a852'
```

#### Explanation:

With the following setup when contents of the `docs` directory on `master` or
`main` branch change, the action will be triggered. Then the following happens:

- `docs/meta.yml` metadata file will be read and repository details will be
  fetched from github.
- Slug and Title will be generated.
- The contents of the `docs/articles` and `docs/assets` directories will be
  compared with the contents of the storage bucket based on the
  [S3 ETags](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Object.html).
- New or modified files will be uploaded to the storage bucket.
- Files inside the storage that are no longer present locally will be removed
  from the storage.
- The map of articles is generated excluding files that failed to upload.
- The database entry is created or updated with the new data.

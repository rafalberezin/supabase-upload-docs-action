# Storage Structure

## Path Structure

The action is designed to allow storage of multiple projects in a single storage
bucket. The files of each project are organized into 2 directories:

```path
<project slug>/<storage-articles-dir>/<generated path> # For articles
<project slug>/<storage-assets-dir>/<generated path>   # For assets (if enabled)
```

Where:

- `<project slug>` is the project slug. (e.g., `my-project`)
- `<storage-articles-dir>` is the value specified by the input of the same name.
  (default: `articles`)
- `<storage-assets-dir>` is the value specified by the input of the same name.
  (optional)
- `<generated slug path>` is a path mirroring your local directory structure,
  composed of slugs, with optional prefix trimming.

## Generated Slug Path

The `<generated slug path>` is composed of slugs generated from the file and
directory names. By default these slugs also have numeric prefixes like `01-`
trimmed. This can be changed with the
[`trim-prefixes` input](../03-configuration.md#trim-prefixes).

> [!TIP]
>
> Using the prefixes along with prefix trimming you can keep your project's
> documentation organized, while maintaining clean paths.

For example, if you had a file `02-Core Concepts/01-Storage Structure.md`, the
generated slug path would be `core-concepts/storage-structure.md`.

The slugs are generated as described in
[Slugs and Titles](./02-core-concepts/00-slugs-and-titles.md).

## Full Example

With this local structure:

```tree
docs/
├── articles/
│   ├── 00-getting-started.md
│   └── 01-advanced/
│       └── 00-configuration.md
└── assets/
    └── diagram.svg
```

And this configuration:

```yaml continue=before
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    # ... other required inputs ...
    articles-path: docs/articles
    assets-path: docs/assets
    storage-bucket: projects
    storage-articles-dir: articles
    storage-assets-dir: assets
	  trim-prefixes: true
```

Assuming that the **project slug** is `my-project`, the files inside Supabase
would be structured in the following way:

```tree
projects/
└── my-project/
    ├── articles/
    │   ├── getting-started.md
    │   └── advanced/
    │       └── configuration.md
    └── assets/
        └── diagram.svg
```

## Multi-Project Storage Bucket

A single storage bucket can contain documentation for multiple projects:

```tree
<storage bucket>/
├── project-a/
│   ├── articles/
│   │   ├── getting-started.md
│   │   └── ...
│   └── assets/
│       └── ...
├── project-b/
│   ├── articles/
│   │   └── ...
│   └── assets/
│       └── ...
└── ...
```

This structure ensures that:

- Each project's content is isolated.
- Files can be easily located.
- Access controls can be applied at the project level.

## Next Steps

- [Metadata Management](./02-metadata-management.md) - Understand what metadata
  is available and how it's managed.

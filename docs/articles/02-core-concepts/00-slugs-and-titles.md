# Slugs and Titles

## Generation

Slug is a URL-friendly identifier derived from an input string. For example,
this action's slug is `supabase-upload-docs-action`.

This action generates slugs from texts by converting them into
[kebab-case](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case).

---

The titles are derived from slugs by capitalizing words and separating them with
spaces. For example:

- `my-article` -> `My Article`
- `getting-started` -> `Getting Started`

## Project Slug and Title Priority

### Slugs

The **project slug** is determined with the following priority:

1. Read directly from metadata file.
2. Generated from title read from metadata file.
3. Generated from repository name.

### Titles

The **project title** is determined with the following priority:

1. Read directly from metadata file.
2. Generated from the previously defined slug.

You can learn more about **metadata file** in
[Metadata Management](./02-metadata-management.md#metadata-file)

## File and Directory Naming

The file and directory names are directly used to generate the slugs and titles
using the process described [above](#generation).

For file and directory names within the same depth level, the slugs are kept
unique by appending a numerical postfix. For example:

- `My Article` -> `my-article`
- Then `my article` -> `my-article-2`

## Next Steps

- [Storage Structure](./01-storage-structure.md) - Understand how files are
  organized in Supabase Storage.

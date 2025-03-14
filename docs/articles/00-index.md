# Supabase Upload Docs Action

A GitHub Action that automates the process of publishing and managing project
documentation in Supabase. This action handles both file storage and metadata
management, making it easy to maintain documentation alongside your codebase.

> [!NOTE]
>
> This documentation is itself maintained using the Supabase Upload Docs Action,
> serving as a practical example of the action's capabilities.

## Key Features

- **Automated Uploads**: Automatically upload documentation articles and assets
  to Supabase Storage.
- **Metadata Management**: Optionally manage metadata in Supabase Database.
- **Hierarchical Organization**: Generate ordered, hierarchical article map
  trees.
- **Smart Naming**: Automatically generate slugs and titles from file names.
- **Efficient Updates**: Handle file updates efficiently using **ETags**.
- **Customizable Fields**: Support for custom metadata fields.
- **Clean paths**: Optional trimming of numeric prefixes used for ordering while
  maintaining clean paths.

## Why Use This Action?

- **Keep Documentation with Code**: Maintain documentation in your repository
  alongside your code.
- **Automated Publishing**: Publish updates automatically when you push changes.
- **Structured Content**: Maintain a clean hierarchical structure in your
  documentation.

## When to Use This Action?

This action is ideal if you:

- Want to keep the documentation updated automatically alongside your
  repository.
- Have multiple projects and need a **single source of truth**.

> [!TIP]
>
> If you only have one small project, consider a **GitHub Wiki** or a
> **statically generated site** instead.

## Where to Go Next?

- [Getting Started](./01-getting-started.md) - Get started quickly with a basic
  setup.
- [Core Concepts](./02-core-concepts/00-slugs-and-titles.md) - Learn how it
  works first.

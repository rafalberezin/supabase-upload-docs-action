# Article Mapping

If you enable prefix trimming for file and directory names (default), you can
have cleaner paths, but you lose natural ordering in the Supabase storage. And
even with the prefixes, it is inconvenient to map the articles inside the
storage by yourself.

To solve that, the action generates a structured map of the articles, which is
uploaded to the database as explain in
[Metadata Management](./02-metadata-management.md).

## Data Structure

### Node Types

This article map is a **tree structure** that represents the documentation
hierarchy. It consiste of three types of nodes:

#### 1. Root Node

- The `top-level node` that contains all the documentation content.
- Has properties:
  - `type` - string `root`.
  - `children` - array of directories and articles.

#### 2. Directory Node

- Represents a **folder** in the documentation structure.
- Has properties:
  - `type` - string `directory`.
  - `title` - generated from directory name.
  - `children` - array of nested articles and directories.

#### 2. Article Node

- Represents an **individual documentation file**.
- Has properties:
  - `type` - string `article`.
  - `title` - generated from file name.
  - `path` - path relative to the Supabase storage structure.

The `path` consists of **slugs** as explained in
[Storage Structure](./01-storage-structure.md#generated-slug-path).

The **titles** are generated as explained in
[Slugs and Titles](./00-slugs-and-titles.md#file-and-directory-naming).

### Type Definition

These are the exact data types for the article map:

```ts
interface ArticleMap {
	type: 'root'
	children: Children
}

type Children = (Directory | Article)[]

interface Directory {
	type: 'directory'
	title: string
	children: Children
}

interface Article {
	type: 'article'
	title: string
	path: string
}
```

## Example

With this local structure:

```tree
docs/
├── articles/
│   ├── 00-getting-started.md
│   └── 01-advanced/
│       └── 00-configuration.md
└── ...
```

And this configuration:

```yaml
- uses: rafalberezin/supabase-upload-docs-action@v1
  with:
    # ... other required inputs ...
    articles-path: docs/articles
    storage-bucket: projects
```

Assuming your project slug is `my-project`, the files would be uploaded to these
paths:

```path
projects/my-project/articles/getting-started.md
projects/my-project/articles/advanced/configuration.md
```

With `projects` being the storage bucket.

And the article map would be:

```json
{
	"type": "root",
	"children": [
		{
			"type": "article",
			"title": "Getting Started",
			"path": "my-project/articles/getting-started.md"
		},
		{
			"type": "directory",
			"title": "Advanced",
			"children": [
				{
					"type": "article",
					"title": "Configuration",
					"path": "my-project/articles/advanced/configuration.md"
				}
			]
		}
	]
}
```

> [!NOTE]
>
> This only maps files inside the directory defined by `articles-path` input.

## Next

- [Configuration](../03-configuration.md) - See all configuration options.

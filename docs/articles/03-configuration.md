# Configuration

## All Available Inputs

| Input                  | Description                                                                   | Required | Default         |
| ---------------------- | ----------------------------------------------------------------------------- | :------: | --------------- |
| `github-token`         | GitHub token for repository access.                                           |    ✓     |                 |
| `supabase-url`         | Supabase project URL.                                                         |    ✓     |                 |
| `supabase-key`         | Supabase project API with necessary permissions.                              |    ✓     |                 |
| `articles-path`        | Path to documentation articles directory.                                     |    ✓     | `docs/articles` |
| `assets-path`          | Path to documentation assets directory.                                       |          |                 |
| `meta-path`            | Path to metadata file (.yml, .yaml, or .json).                                |          |                 |
| `storage-bucket`       | Supabase storage bucket name.                                                 |    ✓     |                 |
| `storage-articles-dir` | Path to articles directory in storage.                                        |          | `articles`      |
| `storage-assets-dir`   | Path to assets directory in storage. (required if `assets-path` is specified) |    \*    |                 |
| `trim-prefixes`        | Whether to trim numeric prefixes from file and directory names.               |    ✓     | `true`          |
| `meta-table`           | Database table for storing project metadata.                                  |          |                 |
| `column-mappings`      | YAML string mapping database column names to custom ones.                     |          |                 |

## Input Details

### Authentication and Connection

#### `github-token`

- **Required**: Yes.
- **Description**: GitHub token used to access repository information.
- **Usage**: Typically set to `${{ secrets.GITHUB_TOKEN }}`.
- **Permissions**: Needs read access to repository metadata.

#### `supabase-url`

- **Required**: Yes.
- **Description**: Your Supabase project URL.
- **Usage**: Set to `${{ secrets.SUPABASE_URL }}`.

#### `supabase-key`

- **Required**: Yes.
- **Description**: Your Supabase project URL.
- **Usage**: Set to `${{ secrets.SUPABASE_KEY }}`.
- **Security**: Always use secrets for sensitive data, never hardcode.

The supabase key requires the following permissions:

- **Storage Bucket**: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- **Database Table**: `SELECT`, `INSERT`, `UPDATE`. (only when using
  [Metadata Management](./02-core-concepts/02-metadata-management.md) - enabled
  by specifying [`meta-table` input](#meta-table))

> [!NOTE]
>
> The secret names can be different, but must match what you set up in the
> repository secrets settings. For more information see
> [Getting Started: Step 2](./01-getting-started.md#step-2-add-secrets-to-github-repository).

### File Paths

#### `articles-path`

- **Required**: Yes.
- **Default**: `docs/articles`.
- **Description**: Path to the directory containing documentation articles in
  your repository.
- **Format**: Relative to repository root.

#### `assets-path`

- **Required**: No.
- **Description**: Path to the directory containing documentation assets in your
  repository.
- **Format**: Relative to repository root.

> [!NOTE]
>
> Only needed if you want to upload assets.

#### `meta-path`

- **Required**: No.
- **Description**: Path to your metadata file. It can be used to overwrite
  generated data, like project's `slug` or `title`, and to define custom data
  that will be uploaded to your database.
- **Format**: Relative to repository root.
- **Supported File Formats**: YAML (.yml, .yaml) or JSON (.json).

To learn more about metadata file see
[Metadata Management](./02-core-concepts/02-metadata-management.md#metadata-file).

### Storage Configuration

#### `storage-bucket`

- **Required**: Yes.
- **Description**: Name of your Supabase storage bucket.

#### `storage-articles-dir`

- **Required**: Yes.
- **Default**: `articles`.
- **Description**: Directory withing your storage bucket where articles will be
  uploaded.

#### `storage-assets-dir`

- **Required**: Only if `assets-path` is specified.
- **Description**: Directory within yout storage bucket where assets will be
  uploaded.

To learn more about storage organization see
[Storage Structure](./02-core-concepts/01-storage-structure.md).

### Behavior Settings

#### `trim-prefixes`

- **Required**: Yes.
- **Default**: `true`.
- **Description**: Whether to trim numeric prefixes from file and directory
  names.
- **Usage**: Set to `false` to keep prefixes in uploaded file paths and article
  map.
- **Example**: When `true`, `01-getting-started.md` becomes
  `getting-started.md`.

> [!TIP]
>
> Use these prefixes and prefix trimming to keep your documentation orginized,
> while maintaining clean file URLs in storage.

### Database Settings

#### `meta-table`

- **Required**: No.
- **Description**: Database table name for storing project metadata.
- **Usage**: Required to enable functionality.

> [!IMPORTANT]
>
> The table schema must match the uploaded data, which consists of your custom
> data defined in
> [metadata file](./02-core-concepts/02-metadata-management.md#metadata-file)
> and the
> [data generated by this action](./02-core-concepts/02-metadata-management.md#generated-data).
> If the uploaded data and table schema is mismatched the action will fail.
>
> If you want a different schema than the default one, use the
> [next input](#column-mappings).

#### `column-mappings`

- **Required**: No.
- **Description**: YAML string representation of an object mapping default
  database table column names to custom ones.
- **Special Value**: Map to `_` to exclude a field.

Since actions can only accept strings and booleans as inputs, we need to pass it
as a string.

First, define the input like a normal YAML object, then turn it into a multiline
string by adding `|` after the input name like this:

```yaml highlight=1
column-mappings: |
  slug: project_slug
  source: _
```

With this configuration:

- `slug` will be uploaded to your database column `project_slug`.
- `source` will **not** be uploaded.

> [!NOTE]
>
> To avoid mistakes, if you try to map a non existent name, the action will fail
> early.

## Next

- [Examples](./04-examples.md) - See different configuration examples.

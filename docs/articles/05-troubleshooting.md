# Troubleshooting

This section adresses common issues you might encounter when using the
**Supabase Upload Docs Action** and provides solutions to resolve them.

## Debugging Checklist

When troubleshooting, go through this checklist:

- [x] Are all required inputs provided?
- [x] Do all referenced paths exist in your repository?
- [x] Are your Supabase secrets correctly configured?
- [x] Does your database schema match the data being uploaded?
- [x] Are your storage bucket and RLS policies correctly configured?
- [x] Is your workflow triggered on the right events and paths?

## Common Issues

### Authentication Failures

Action fails with authentication errors.

#### Possible Causes and Solutions:

- **Invalid Supabase _URL_ or _API Key_**: Verify your `supabase-url` and
  `supabase-key` inputs are correct. Make sure you have set up their respective
  secrets in the repository secrets settings.
- **Permission Issues**: Ensure your Supabase API Key has the necessery
  permissions for both storage and database (if using) as explained in
  [Configuration: Authentication and Connection](./03-configuration.md#authentication-and-connection).

### Storage Issues

Action fails with storage-related errors.

#### Possible Causes and Solutions:

- **Bucket Doesn't Exist**: The action **does not** create storage buckets
  automatically. Create the storage bucket specified in `storage-bucket` in your
  Supabase dashboard.
- **RLS Policies**: Configure proper Row Level Security policies to allow the
  action to write to your bucket.

### Database Issues

Action fails with database-related errors.

#### Possible Causes and Solutions:

- **Missing Table**: The action **does not** create the database table
  automatically. Create the table specified in `meta-table` in your Supabase
  dashboard.
- **Schema Mismatch**: Verify that your table schema matches the data being
  uploaded. If you don't want to upload certain data, you can use
  [Column Mappings](./03-configuration.md#column-mappings) special value `_` to
  omit it.
- **Type Errors**: Ensure your column types match the uploaded data types as
  explained in
  [Metadata Management](./02-core-concepts/02-metadata-management.md#generated-data)

This occurs when you specify a mapping for a field that doesn't exist. To avoid
mistakes the action will fail early. Check your `column-mappings` input and
ensure all fields exist.

## Getting Support

If you're still experiencing issues after trying the solutions above:

1. Check
   [existing issues](https://github.com/rafalberezin/supabase-upload-docs-action/issues)
   to see if your problem has been reported.
2. If not,
   [report the issue](https://github.com/rafalberezin/supabase-upload-docs-action/issues/new?template=bug_report.yml).

## Next

- [Best Practices](./06-best-practices.md) - If you're unsure how to organize
  your documentation and configure the action, check my recommendations.
- [Contributing](./07-contributing.md) - If you found a bug, have an idea for a
  new feature, or just want to help improve the action, check the contributing
  guide.
- [v2 Roadmap](./08-v2-roadmap.md) - See plans for the future.
- [How I Use It](./08-how-i-use-it.md) - If you're interested in my personal
  insight on how I use it and what guided my decisions on the action's design.

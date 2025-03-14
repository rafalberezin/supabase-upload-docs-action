# Supabase Upload Docs Action v2 Roadmap

This document outlines the planned changes and improvements for **v2** of the
Supabase Upload Docs Action. The goal of v2 is to provide, **better defaults**,
**greater flexibility**, **and improve configuration options** while maintaining
ease of use.

## Goals for v2

- Introduce a full set of opinionated defaults while keeping everything
  configurable.
- Extend behavior configuration to allow more controll over storage paths,
  metadata handling and article mapping.
- Better organize configuration options.
- Provide better reporting and debugging tools.

## Major Changes

### Expanded Configuration Options

#### Upload Path Handling

- [ ] **Make the paths fully configurable**
  - Make slug prefix optional.
  - Make `storage-articles-dir` and `storage-assets-dir` optional.
- [ ] **Versioned storage support** with multiple modes:
  - Store all versions. (e.g., `my-project/v1.2.3/articles/...`)
  - Store only latest major releases. (e.g., `my-project/v1/articles/...`)
  - Disabled versioning. (default)
- [ ] **Allow disabling automatic slug conversion** (retain original file names)
- [ ] **Allow using filenames directly titles**

#### Article Map Path Customization

- [ ] **Allow chosing how paths are formed in the article map**. Option to
      choose relative to which part should the map paths be. For example with
      the storage path `my-project-slug/v1.2.3/articles/my-article.md` the
      options will be:
  - `articles` directory - `my-article-md`
  - `version` - `articles/my-article-md`
  - `slug` - `v1.2.3/articles/my-article-md`
  - `bucket` - `my-project-slug/v1.2.3/articles/my-article-md`

### New Features & Improvements

#### Article Titles

- [ ] **Keep the titles same as file names**
  - When configured to do so using new input.
  - When slug conversion is disabled.
- [ ] **Allow to explicitly define titles** in the metadata file.

#### Improved Action Feedback

- [ ] Add **action run reports** including information about the action run
  - Always report.
  - Report on errors only. (default)

#### Dry Run Mode

- [ ] Implement **dry run mode**. Generate reports without modifying any data.

#### Upload Strictness

- [ ] **Allow choosing failure behavior**
  - Fail on any upload issue.
  - Fail only if all uploads fail.

## Migration Plan

A detailed migration guide will be provided when v2 is released.

## Next

- [How I Use It](./09-how-i-use-it.md) - If you're interested in my personal
  insight on how I use it and what guided my decisions on the action's design.

import fs from 'fs'
import {
	buildDatabaseEntry,
	filterSuccessfulUploads,
	findLeftoverPaths,
	processName,
	validateDocsPath
} from '../src/utils'
import type {
	ArticleMap,
	ArticleMapChildren,
	DatabaseEntry,
	ProjectMetadata,
	RepositoryDetails
} from '../src/types'

describe('Utility Function', () => {
	describe('validateDocsPath', () => {
		beforeEach(() => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(true)
			jest
				.spyOn(fs, 'statSync')
				.mockReturnValue({ isDirectory: () => true } as fs.Stats)
		})

		it('should not throw for valid directory', () => {
			expect(() => validateDocsPath('/valid/path')).not.toThrow()
		})

		it('should throw for non-existent path', () => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(false)
			expect(() => validateDocsPath('/invalid/path')).toThrow(
				'Documentation path does not exist'
			)
		})

		it('should throw for non-directory path', () => {
			jest
				.spyOn(fs, 'statSync')
				.mockReturnValue({ isDirectory: () => false } as fs.Stats)
			expect(() => validateDocsPath('/not/a/directory')).toThrow(
				'Documentation path is not a directory'
			)
		})
	})

	describe('processName', () => {
		it('should convert file and directory names to slugs and titles', () => {
			const { slug: fileSlug, title: fileTitle } =
				processName('00-Hello World.md')
			expect(fileSlug).toBe('hello-world')
			expect(fileTitle).toBe('Hello World')

			const { slug: dirSlug, title: dirTitle } = processName('01-nested_dir')
			expect(dirSlug).toBe('nested-dir')
			expect(dirTitle).toBe('Nested Dir')
		})

		it('should postfix repeating slugs', () => {
			const slugs = {}

			const { slug: slug1, title: title1 } = processName(
				'01-Getting_started.md',
				slugs
			)
			expect(slug1).toBe('getting-started')
			expect(title1).toBe('Getting Started')
			expect(slugs).toEqual({
				'getting-started': 1
			})

			const { slug: slug2, title: title2 } = processName(
				'01-Getting Started.md',
				slugs
			)
			expect(slug2).toBe('getting-started-1')
			expect(title2).toBe('Getting Started 1')
			expect(slugs).toEqual({
				'getting-started': 2
			})
		})
	})

	describe('buildDatabaseEntry', () => {
		const mockMinimalArticles: ArticleMap = {
			type: 'root',
			children: []
		}
		const mockMinimalMetadata: ProjectMetadata = {}
		const mockMinimalRepoDetails: RepositoryDetails = {
			title: 'test-project',
			source: 'https://github.com/test/test-project'
		}

		it('should create a new database entry with minimal data', () => {
			const entry = buildDatabaseEntry(
				'Test Project',
				'test-project',
				mockMinimalArticles,
				mockMinimalMetadata,
				mockMinimalRepoDetails,
				null
			)

			expect(entry).toEqual({
				title: 'Test Project',
				slug: 'test-project',
				articles: mockMinimalArticles,
				source: 'https://github.com/test/test-project'
			})
		})

		const mockFilledArticles: ArticleMap = {
			type: 'root',
			children: [
				{
					type: 'article',
					title: 'Article 1',
					path: 'article-1'
				},
				{
					type: 'directory',
					title: 'Nested',
					children: [
						{
							type: 'article',
							title: 'Nested Article 1',
							path: 'nested/nested-article-1'
						}
					]
				}
			]
		}
		const mockFilledMetadata: ProjectMetadata = {
			title: 'Test Project',
			description: 'A test project',
			tags: {
				'tag-1': 'blue',
				'tag-2': 'red'
			},
			featured: true,
			meta: {
				accent_color: 'green'
			}
		}
		const mockFilledRepoDetails: RepositoryDetails = {
			title: 'test-repo',
			source: 'https://github.com/test/test-project',
			description: 'repo description',
			license: 'MIT',
			latest_version: 'v1.1.0'
		}
		const mockExistingEntry: DatabaseEntry = {
			title: 'Old Test Project',
			slug: 'old-test-project',
			description: 'An old test project',
			source: 'https://github.com/test/old-test-project',
			articles: mockMinimalArticles,
			latest_version: 'v1.0.0',
			versions: ['v1.0.0'],
			tags: {
				'tag-1': 'blue'
			},
			featured: false,
			meta: {
				accent_color: 'blue'
			}
		}

		it('should update existing entry with full data', () => {
			const entry = buildDatabaseEntry(
				'Test Project',
				'test-project',
				mockFilledArticles,
				mockFilledMetadata,
				mockFilledRepoDetails,
				mockExistingEntry
			)

			expect(entry).toEqual({
				title: 'Test Project',
				slug: 'test-project',
				description: 'A test project',
				license: 'MIT',
				source: 'https://github.com/test/test-project',
				latest_version: 'v1.1.0',
				versions: ['v1.0.0', 'v1.1.0'],
				articles: mockFilledArticles,
				tags: mockFilledMetadata.tags,
				featured: true,
				meta: mockFilledMetadata.meta
			})
		})
	})

	describe('filterSuccessfulUploads', () => {
		it('should remove local paths from articles and', () => {
			const mockArticles: ArticleMap = {
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Article 1',
						path: 'article-1',
						_localPath: 'docs/00-article-1.md'
					},
					{
						type: 'directory',
						title: 'Nested',
						children: [
							{
								type: 'article',
								title: 'Nested Article 1',
								path: 'nested/nested-article-1',
								_localPath: 'docs/01-nested/00-nested-article-1.md'
							}
						]
					}
				]
			}
			const mockSuccessfulUploadPaths = new Set<string>([
				'article-1',
				'nested/nested-article-1'
			])

			const uploadedArticles = filterSuccessfulUploads(
				mockArticles,
				mockSuccessfulUploadPaths
			)

			const checkNoLocalPaths = (children: ArticleMapChildren) => {
				Object.values(children).forEach(child => {
					if (child.type === 'article') {
						expect(child._localPath).toBeUndefined()
					} else if (child.type === 'directory') {
						checkNoLocalPaths(child.children)
					}
				})
			}

			checkNoLocalPaths(uploadedArticles.children)
		})

		it('should remove local paths, unsuccessful uploads and empty upload directories', () => {
			const mockArticles: ArticleMap = {
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Article 1',
						path: 'article-1',
						_localPath: 'docs/00-article-1.md'
					},
					{
						type: 'directory',
						title: 'Nested',
						children: [
							{
								type: 'article',
								title: 'Nested Article 1',
								path: 'nested/nested-article-1',
								_localPath: 'docs/01-nested/00-nested-article-1.md'
							}
						]
					}
				]
			}
			const mockSuccessfulUploadPaths = new Set<string>(['article-1'])

			const uploadedArticles = filterSuccessfulUploads(
				mockArticles,
				mockSuccessfulUploadPaths
			)

			expect(uploadedArticles).toEqual({
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Article 1',
						path: 'article-1'
					}
				]
			})
		})
	})

	describe('findLeftoverPaths', () => {
		const mockUploadedArticles: ArticleMap = {
			type: 'root',
			children: [
				{
					type: 'article',
					title: 'Article 1',
					path: 'article-1'
				},
				{
					type: 'directory',
					title: 'Nested',
					children: [
						{
							type: 'article',
							title: 'Nested Article 1',
							path: 'nested/nested-article-1'
						}
					]
				}
			]
		}

		const mockPreviousArticles: ArticleMap = {
			type: 'root',
			children: [
				{
					type: 'article',
					title: 'Article 1',
					path: 'article-1'
				}
			]
		}

		it('should return empty array when nothing has changed', () => {
			expect(
				findLeftoverPaths(mockPreviousArticles, mockPreviousArticles)
			).toHaveLength(0)
		})

		it('should return uploaded articles if previous articles are undefined', () => {
			expect(findLeftoverPaths(mockUploadedArticles)).toEqual([
				'article-1',
				'nested/nested-article-1'
			])
		})

		it('should return paths present in uploaded articles but not in previous articles', () => {
			expect(
				findLeftoverPaths(mockUploadedArticles, mockPreviousArticles)
			).toHaveLength(0)
		})
	})
})

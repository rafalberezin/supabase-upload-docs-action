import { buildDatabaseEntry, getCurrentFilePaths } from '../src/meta'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	ArticleMap,
	DatabaseEntry,
	ProjectMetadata,
	RepositoryDetails
} from '../src/types'

describe('Metadata functions', () => {
	describe('getCurrentFilePaths', () => {
		let mockSupabase: jest.Mocked<SupabaseClient>

		beforeAll(() => {
			mockSupabase = {
				storage: {
					from: jest.fn().mockReturnValue({
						list: jest.fn()
					})
				}
			} as unknown as jest.Mocked<SupabaseClient>
		})

		it('should create a list of file paths', async () => {
			;(mockSupabase.storage.from('').list as jest.Mock).mockImplementation(
				path => {
					if (path === 'test-project')
						return Promise.resolve({
							data: [
								{ id: 'id1', name: 'article-1.md' },
								{ id: null, name: 'nested' }
							],
							error: null
						})
					if (path === 'test-project/nested')
						return Promise.resolve({
							data: [{ id: 'id1', name: 'nested-article-1.md' }],
							error: null
						})
					return Promise.resolve({ data: null, error: null })
				}
			)

			await expect(
				getCurrentFilePaths(mockSupabase, 'test-bucket', 'test-project')
			).resolves.toEqual(
				new Set<string>(['article-1.md', 'nested/nested-article-1.md'])
			)
		})

		it('should throw an error', async () => {
			;(mockSupabase.storage.from('').list as jest.Mock).mockResolvedValue({
				data: null,
				error: new Error('Unable to list files')
			})

			await expect(
				getCurrentFilePaths(mockSupabase, 'test-bucket', 'test-project')
			).rejects.toThrow(
				'Failed to list supabase storage files: Unable to list files'
			)
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
})

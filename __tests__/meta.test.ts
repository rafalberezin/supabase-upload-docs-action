import fs from 'fs'
import * as core from '@actions/core'
import {
	buildDatabaseEntry,
	fetchDatabaseEntry,
	fetchRemoteFilesMetadata,
	generateArticleMap,
	fetchRepositoryDetails,
	loadMetadata,
	upsertDatabaseEntry
} from '../src/meta'
import type * as github from '@actions/github'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArticleMap, Inputs } from '../src/types'

jest.mock('fs', () => ({ ...jest.requireActual('fs') })) // jest.spyOn(fs, 'readFileSync') breaks without that

describe('Metadata functions', () => {
	const fsReadFileSyncSpy = jest.spyOn(fs, 'readFileSync') as jest.Mock
	const fsReaddirSyncSpy = jest.spyOn(fs, 'readdirSync') as jest.Mock

	const coreInfoSpy = jest.spyOn(core, 'info') as jest.Mock
	coreInfoSpy.mockImplementation(() => {})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('loadMetadata', () => {
		const yamlContent = Buffer.from(
			'slug: custom-slug\nmapped_slug: mock-slug\ntitle: mock-title'
		)
		const jsonContent = Buffer.from(
			'{"slug":"custom-slug","mapped_slug":"mock-slug","title":"mock-title"}'
		)
		const columnMappings = { slug: 'mapped_slug' }

		const metadata = {
			data: {
				slug: 'custom-slug',
				mapped_slug: 'mock-slug',
				title: 'mock-title'
			},
			slug: 'mock-slug',
			title: 'mock-title'
		}

		it('should load metadata', () => {
			fsReadFileSyncSpy.mockReturnValue(yamlContent)
			expect(loadMetadata('', {})).toEqual({ data: {} })

			fsReadFileSyncSpy.mockReturnValueOnce(jsonContent)
			expect(loadMetadata('meta.json', columnMappings)).toEqual(metadata)

			expect(loadMetadata('meta.yml', columnMappings)).toEqual(metadata)

			expect(loadMetadata('meta.yml', {})).toEqual({
				data: {
					slug: 'custom-slug',
					mapped_slug: 'mock-slug',
					title: 'mock-title'
				},
				slug: 'custom-slug',
				title: 'mock-title'
			})
		})

		it('should throw error when metadata cannot be loaded', () => {
			expect(() => loadMetadata('meta.md', {})).toThrow(
				'Could not load metadata: Unsupported metadata file type'
			)

			fsReadFileSyncSpy.mockImplementationOnce(() => {
				throw 'non error throw'
			})
			expect(() => loadMetadata('meta.yml', {})).toThrow(
				'Could not load metadata: Unknown Error'
			)
		})
	})

	describe('fetchRepositoryDetails', () => {
		const mockContext = {
			repo: {
				repo: 'mock-repo'
			}
		} as typeof github.context

		const mockOctokitGet = jest.fn()
		const mockOctokitListReleases = jest.fn()

		const mockOctokit = {
			rest: {
				repos: {
					get: mockOctokitGet,
					listReleases: mockOctokitListReleases
				}
			}
		} as unknown as ReturnType<typeof github.getOctokit>

		it('should retrieve the details', async () => {
			const mockRepoResponse = {
				data: {
					html_url: 'https://mock-repo.url',
					description: 'mock description',
					license: { name: 'mock license' }
				}
			}
			const mockListReleasesResponse = {
				data: [{ draft: false, tag_name: 'vMockRelease' }, { draft: true }]
			}

			const mockDetails = {
				title: 'mock-repo',
				source: 'https://mock-repo.url',
				license: 'mock license',
				description: 'mock description',
				versions: ['vMockRelease'],
				latest_version: 'vMockRelease'
			}

			mockOctokitGet.mockResolvedValue(mockRepoResponse)
			mockOctokitListReleases.mockResolvedValueOnce(mockListReleasesResponse)
			await expect(
				fetchRepositoryDetails(mockOctokit, mockContext)
			).resolves.toEqual(mockDetails)

			mockOctokitListReleases.mockResolvedValueOnce({ data: [] })
			await expect(
				fetchRepositoryDetails(mockOctokit, mockContext)
			).resolves.toEqual({
				...mockDetails,
				versions: [],
				latest_version: undefined
			})

			expect(coreInfoSpy).toHaveBeenCalledWith(
				'No releases found for this repository'
			)
		})

		it('should throw error when detail retrieval fails', async () => {
			mockOctokitGet.mockRejectedValueOnce(new Error('mock error'))
			mockOctokitGet.mockRejectedValueOnce('mock error')

			await expect(
				fetchRepositoryDetails(mockOctokit, mockContext)
			).rejects.toThrow('Failed to retrieve repository details: mock error')
			await expect(
				fetchRepositoryDetails(mockOctokit, mockContext)
			).rejects.toThrow('Failed to retrieve repository details: Unknown Error')
		})
	})

	const mockStorageUpload = jest.fn()
	const mockStorageRemove = jest.fn()
	const mockStorageList = jest.fn()

	const mockDatabaseEq = jest.fn()
	const mockDatabaseMaybeSingle = jest.fn()
	const mockDatabaseUpsert = jest.fn()

	const mockSupabaseClient = {
		from: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		eq: mockDatabaseEq.mockReturnThis(),
		maybeSingle: mockDatabaseMaybeSingle,
		upsert: mockDatabaseUpsert,
		storage: {
			from: jest.fn().mockReturnThis(),
			upload: mockStorageUpload,
			remove: mockStorageRemove,
			list: mockStorageList
		}
	} as unknown as SupabaseClient

	describe('fetchRemoteFilesMetadata', () => {
		const mockStorageContents: Record<string, unknown> = {
			'slug/articles': [
				{
					name: 'unchanged.md',
					id: 'unchanged',
					metadata: { eTag: '"etag-unchanged"' }
				},
				{
					name: 'changed.md',
					id: 'changed',
					metadata: { eTag: '"etag-changed-2"' }
				},
				{ name: 'nested', id: null, metadata: null }
			],
			'slug/articles/nested': [
				{ name: 'new.md', id: 'new', metadata: { eTag: '"etag-new"' } }
			]
		}

		const inputs: Inputs = {
			githubToken: '',
			supabaseUrl: '',
			supabaseKey: '',
			articlesPath: '',
			assetsPath: '',
			metaPath: '',
			storageBucket: 'bucket',
			storageArticlesDir: 'articles',
			storageAssetsDir: 'assets',
			trimPrefixes: true,
			metaTable: '',
			columnMappings: {}
		}

		it('should retrieve metadata of remote files', async () => {
			mockStorageList.mockImplementation((path: string) =>
				Promise.resolve({ data: mockStorageContents[path] ?? [], error: null })
			)

			await expect(
				fetchRemoteFilesMetadata(mockSupabaseClient, inputs, 'slug')
			).resolves.toEqual({
				'slug/articles/unchanged.md': 'etag-unchanged',
				'slug/articles/changed.md': 'etag-changed-2',
				'slug/articles/nested/new.md': 'etag-new'
			})
		})

		it('should throw error when metadata retrieval fails', async () => {
			mockStorageList.mockResolvedValueOnce({
				data: null,
				error: new Error('mock error')
			})

			await expect(
				fetchRemoteFilesMetadata(mockSupabaseClient, inputs, 'slug')
			).rejects.toThrow('Failed to list supabase storage files: mock error')
		})
	})

	describe('generateArticleMap', () => {
		it('should generate map of articles excluding failed uploads', () => {
			const files = [
				'docs/articles/meta.yml',
				'docs/articles/00-unchanged.md',
				'docs/articles/01-changed.md',
				'docs/articles/02-nested/00-new.md',
				'docs/articles/03-failed-dir/00-failed.md'
			]
			const fsStatSyncSpy = jest.spyOn(fs, 'statSync') as jest.Mock
			fsStatSyncSpy.mockImplementation((path: string) => ({
				isFile: () => files.includes(path),
				isDirectory: () => path in directoryContents
			}))
			const directoryContents: Record<string, string[]> = {
				'docs/articles': [
					'meta.yml',
					'00-unchanged.md',
					'01-changed.md',
					'02-nested',
					'03-failed-dir'
				],
				'docs/articles/02-nested': ['00-new.md'],
				'docs/articles/03-failed-dir': ['00-failed.md']
			}
			fsReaddirSyncSpy.mockImplementation(
				(path: string) => directoryContents[path] ?? []
			)

			const slug = 'slug'
			const inputs: Inputs = {
				githubToken: '',
				supabaseUrl: '',
				supabaseKey: '',
				articlesPath: 'docs/articles',
				assetsPath: 'docs/assets',
				metaPath: 'docs/articles/meta.yml',
				storageBucket: '',
				storageArticlesDir: 'articles',
				storageAssetsDir: 'assets',
				trimPrefixes: true,
				metaTable: '',
				columnMappings: {}
			}
			const failedUploadPaths = ['slug/articles/failed-dir/failed.md']

			const articleMap: ArticleMap = {
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Unchanged',
						path: 'slug/articles/unchanged'
					},
					{
						type: 'article',
						title: 'Changed',
						path: 'slug/articles/changed'
					},
					{
						type: 'directory',
						title: 'Nested',
						children: [
							{
								type: 'article',
								title: 'New',
								path: 'slug/articles/nested/new'
							}
						]
					}
				]
			}

			expect(generateArticleMap(inputs, slug, failedUploadPaths)).toEqual(
				articleMap
			)
		})
	})

	// Let's be honest. Does the rest need to be tested?

	describe('fetchDatabaseEntry', () => {
		const mockSlug = 'slug'
		const mockMetaTable = 'table'
		const mockColumnMappings = { slug: 'mapped-slug' }
		const mockData = {
			slug: mockSlug,
			title: 'Mock Title'
		}

		it('should fetch existing database entry', async () => {
			mockDatabaseMaybeSingle.mockResolvedValue({
				data: mockData
			})

			await expect(
				fetchDatabaseEntry(
					mockSupabaseClient,
					mockMetaTable,
					mockSlug,
					mockColumnMappings
				)
			).resolves.toEqual(mockData)
			expect(mockDatabaseEq).toHaveBeenCalledWith('mapped-slug', mockSlug)

			await expect(
				fetchDatabaseEntry(mockSupabaseClient, mockMetaTable, mockSlug, {})
			).resolves.toEqual(mockData)
			expect(mockDatabaseEq).toHaveBeenCalledWith('slug', mockSlug)
		})

		it('should throw error when data retrieval fails', async () => {
			mockDatabaseMaybeSingle.mockResolvedValueOnce({
				data: null,
				error: new Error('mock error')
			})

			await expect(
				fetchDatabaseEntry(mockSupabaseClient, mockMetaTable, mockSlug, {})
			).rejects.toThrow('Could not retrieve database entry: mock error')
		})
	})

	describe('buildDatabaseEntry', () => {
		expect(
			buildDatabaseEntry(
				'Mock Title',
				'mock-slug',
				{
					type: 'root',
					children: [
						{
							type: 'article',
							title: 'Mock Article',
							path: 'mock-slug/articles/mock-article'
						}
					]
				},
				{
					data: {
						slug: 'custom-slug',
						custom_data: 'custom data'
					}
				},
				{
					title: 'overwritten',
					description: 'Mock description',
					versions: ['vMockVersion'],
					latest_version: 'vMockVersion'
				},
				{ id: 'mock-id', project_slug: 'mock-slug' },
				{ slug: 'project_slug' }
			)
		).toEqual({
			id: 'mock-id',
			slug: 'custom-slug',
			title: 'Mock Title',
			project_slug: 'mock-slug',
			custom_data: 'custom data',
			description: 'Mock description',
			versions: ['vMockVersion'],
			latest_version: 'vMockVersion',
			articles: {
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Mock Article',
						path: 'mock-slug/articles/mock-article'
					}
				]
			}
		})
	})

	describe('upsertDatabaseEntry', () => {
		const table = 'table'
		const entry = { slug: 'mock-slug' }

		it('should upsert database entry', async () => {
			mockDatabaseUpsert.mockResolvedValue({ error: null })
			await expect(
				upsertDatabaseEntry(mockSupabaseClient, table, entry)
			).resolves.not.toThrow()

			expect(mockDatabaseUpsert).toHaveBeenCalledWith(entry)
		})

		it('should throw error id database upsert fails', async () => {
			mockDatabaseUpsert.mockResolvedValueOnce({
				error: new Error('mock error')
			})
			await expect(
				upsertDatabaseEntry(mockSupabaseClient, table, entry)
			).rejects.toThrow('Failed to upsert database entry: mock error')
		})
	})
})

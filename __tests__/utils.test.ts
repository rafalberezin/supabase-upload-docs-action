import fs from 'fs'
import * as core from '@actions/core'
import {
	processName,
	hasFileChanged,
	mapKeys,
	getInputs,
	processProjectName
} from '../src/utils'

jest.mock('fs', () => ({ ...jest.requireActual('fs') })) // jest.spyOn(fs, 'readFileSync') breaks without that

describe('Utility Functions', () => {
	const fsExistsSyncSpy = jest.spyOn(fs, 'existsSync') as jest.Mock
	const fsStatSyncSpy = jest.spyOn(fs, 'statSync') as jest.Mock

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('getInputs', () => {
		const mockMinimalInputs: Record<string, string> = {
			'github-token': 'mock-token',
			'supabase-url': 'mock-url',
			'supabase-key': 'mock-key',
			'articles-path': 'docs/articles',
			'storage-bucket': 'docs',
			'storage-articles-dir': 'articles',
			'trim-prefixes': 'true'
		}

		const mockFullInputs: Record<string, string> = {
			'github-token': 'mock-token',
			'supabase-url': 'mock-url',
			'supabase-key': 'mock-key',
			'articles-path': 'docs/articles',
			'assets-path': 'docs/assets',
			'meta-path': 'docs/meta.yml',
			'storage-bucket': 'docs',
			'storage-articles-dir': 'articles',
			'storage-assets-dir': 'assets',
			'trim-prefixes': 'true',
			'meta-table': 'projects',
			'column-mappings': 'slug: project_slug\ntitle: project_name'
		}

		function mockInputs(inputs: Record<string, string>) {
			jest
				.spyOn(core, 'getInput')
				.mockImplementation((name: string) => inputs[name] ?? '')
		}
		jest.spyOn(core, 'getBooleanInput').mockReturnValue(true)

		beforeEach(() => {
			jest.clearAllMocks()

			mockInputs(mockFullInputs)
			fsExistsSyncSpy.mockReturnValue(true)
			fsStatSyncSpy.mockReturnValue({
				isFile: () => true,
				isDirectory: () => true
			})
		})

		it('should load required inputs correctly', () => {
			expect(getInputs()).toEqual({
				githubToken: 'mock-token',
				supabaseUrl: 'mock-url',
				supabaseKey: 'mock-key',
				articlesPath: 'docs/articles',
				assetsPath: 'docs/assets',
				metaPath: 'docs/meta.yml',
				storageBucket: 'docs',
				storageArticlesDir: 'articles',
				storageAssetsDir: 'assets',
				trimPrefixes: true,
				metaTable: 'projects',
				columnMappings: {
					slug: 'project_slug',
					title: 'project_name'
				}
			})

			mockInputs(mockMinimalInputs)
			expect(getInputs()).toEqual({
				githubToken: 'mock-token',
				supabaseUrl: 'mock-url',
				supabaseKey: 'mock-key',
				articlesPath: 'docs/articles',
				assetsPath: '',
				metaPath: '',
				storageBucket: 'docs',
				storageArticlesDir: 'articles',
				storageAssetsDir: '',
				trimPrefixes: true,
				metaTable: '',
				columnMappings: {}
			})
		})

		it('should throw error when input paths are invalid', () => {
			fsExistsSyncSpy.mockReturnValue(false)
			expect(() => getInputs()).toThrow(
				'Directory does not exist: docs/articles'
			)

			fsExistsSyncSpy.mockImplementation(
				(path: string) => path !== 'docs/meta.yml'
			)
			expect(() => getInputs()).toThrow('File does not exist: docs/meta.yml')

			fsExistsSyncSpy.mockReturnValue(true)

			fsStatSyncSpy.mockReturnValue({
				isFile: () => false,
				isDirectory: () => false
			})
			expect(() => getInputs()).toThrow(
				'Path is not a directory: docs/articles'
			)

			fsStatSyncSpy.mockReturnValue({
				isFile: () => false,
				isDirectory: () => true
			})
			expect(() => getInputs()).toThrow('Path is not a file: docs/meta.yml')
		})

		it('should throw error when column mappings are invalid', () => {
			mockInputs({ ...mockMinimalInputs, 'column-mappings': 'invalid: _' })
			expect(() => getInputs()).toThrow(
				'Invalid column name mapping: invalid\nOnly generated keys can be mapped: slug, title, description, license, source, latest_version, versions, articles'
			)

			mockInputs({ ...mockMinimalInputs, 'column-mappings': 'slug: 0' })
			expect(() => getInputs()).toThrow(
				'Invalid mapping for column: slug. Mapping must be string'
			)
		})

		it('should throw error when required input is missing', () => {
			delete mockFullInputs['storage-assets-dir']
			expect(() => getInputs()).toThrow(
				"Input 'storage-assets-dir' is required when 'assets-path' is specified"
			)
		})
	})

	describe('mapKeys', () => {
		it('should map and filter keys of an object', () => {
			const original = {
				slug: 'mock-slug',
				title: 'mock-title',
				description: 'mock-description'
			}
			const mappings = {
				slug: 'mapped-slug',
				title: '_'
			}
			const mapped = {
				'mapped-slug': 'mock-slug',
				description: 'mock-description'
			}

			expect(mapKeys(original, {})).toEqual(original)
			expect(mapKeys(original, mappings)).toEqual(mapped)
			expect(true).toBe(true)
		})
	})

	describe('processProjectName', () => {
		it('should generate project slug and title', () => {
			expect(
				processProjectName(
					{ data: {}, slug: 'meta slug', title: 'meta title' },
					{ title: 'repo title', versions: [] }
				)
			).toEqual({ slug: 'meta slug', title: 'meta title' })

			expect(
				processProjectName(
					{ data: {}, title: 'meta title' },
					{ title: 'repo title', versions: [] }
				)
			).toEqual({ slug: 'meta-title', title: 'meta title' })

			expect(
				processProjectName(
					{ data: {}, slug: 'meta slug' },
					{ title: 'repo title', versions: [] }
				)
			).toEqual({ slug: 'meta slug', title: 'Meta Slug' })

			expect(
				processProjectName({ data: {} }, { title: 'repo_title', versions: [] })
			).toEqual({ slug: 'repo-title', title: 'Repo Title' })
		})
	})

	describe('processName', () => {
		it('should generate slugs and titles with prefix trimming', () => {
			expect(processName('00-Getting Started.md', true)).toEqual({
				slug: 'getting-started',
				title: 'Getting Started'
			})
		})

		it('should handle duplicate slugs', () => {
			const slugTracker = {}
			expect(processName('00-Getting Started.md', true, slugTracker)).toEqual({
				slug: 'getting-started',
				title: 'Getting Started'
			})
			expect(processName('10-Getting-Started.md', true, slugTracker)).toEqual({
				slug: 'getting-started-2',
				title: 'Getting Started 2'
			})
		})
	})

	describe('hasFileChanged', () => {
		jest
			.spyOn(fs, 'readFileSync')
			.mockReturnValue(Buffer.from('mock file content'))

		beforeEach(() => {
			fsStatSyncSpy.mockReturnValue({
				isFile: () => true,
				size: 1000
			})
		})

		it('should handle missing remote ETag', () => {
			expect(hasFileChanged('test.md', undefined)).toBe(true)
		})

		it('should handle non-existent files', () => {
			fsStatSyncSpy.mockImplementation(() => {
				throw new Error('File not found')
			})
			expect(hasFileChanged('nonexistent.md', 'etag')).toBe(true)

			fsStatSyncSpy.mockReturnValue({
				isFile: () => false
			})
			expect(hasFileChanged('nonexistent.md', 'etag')).toBe(true)
		})

		it('should detect file changes based on mismatched size', () => {
			expect(hasFileChanged('test.md', 'etag-2')).toBe(true)

			fsStatSyncSpy.mockReturnValueOnce({
				isFile: () => true,
				size: 7864320
			})
			expect(hasFileChanged('test.md', 'etag')).toBe(true)
		})

		it('should detect file changes based on etag comparison', () => {
			expect(
				hasFileChanged('test.md', '8c45135b00c28b3b7fd8fa748bb7046f')
			).toBe(false)

			fsStatSyncSpy.mockReturnValueOnce({
				isFile: () => true,
				size: 1000
			})
			fsStatSyncSpy.mockReturnValueOnce({
				isFile: () => true,
				size: 7864320
			})
			expect(
				hasFileChanged('test.md', '2db2d8f76c5af6b496c1b50604eff4f0-1')
			).toBe(false)
		})
	})
})

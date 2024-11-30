import fs from 'fs'
import * as core from '@actions/core'
import {
	generateArticleMap,
	getCurrentFilePaths,
	manageDocumentStorage
} from '../src/docs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArticleMap } from '../src/types'

// Mock @actions/core to prevent import errors
jest.mock('@actions/core', () => ({
	info: jest.fn(),
	warning: jest.fn()
}))
jest.mock('fs')

describe('Documenation Functions', () => {
	describe('generateArticleMap', () => {
		it('should generate a complete article map for a directory structure', () => {
			;(fs.readdirSync as jest.Mock).mockImplementation(path => {
				if (path === 'docs')
					return [
						'00-article-1.md',
						'01-nested',
						'02-article-2.md',
						'03-empty-nested'
					]
				if (path === 'docs/01-nested') return ['00-nested-article-1.md']
				return []
			})
			;(fs.statSync as jest.Mock).mockImplementation(path => {
				const isDir =
					path === 'docs/01-nested' || path === 'docs/03-empty-nested'
				return {
					isDirectory: () => isDir,
					isFile: () => !isDir
				}
			})

			const articleMap = generateArticleMap('docs')

			expect(articleMap).toEqual({
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
					},
					{
						type: 'article',
						title: 'Article 2',
						path: 'article-2',
						_localPath: 'docs/02-article-2.md'
					}
				]
			})
		})
	})

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

	describe('manageDocumentStorage', () => {
		;(fs.readFileSync as jest.Mock).mockReturnValue('mock file content')
		let mockSupabase: jest.Mocked<SupabaseClient>

		const mockArticleMap: ArticleMap = {
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

		beforeEach(() => {
			jest.clearAllMocks()

			mockSupabase = {
				storage: {
					from: jest.fn().mockReturnValue({
						upload: jest.fn()
					})
				}
			} as unknown as jest.Mocked<SupabaseClient>
		})

		it('should upload files successfully', async () => {
			const uploadMock = mockSupabase.storage.from('').upload as jest.Mock
			uploadMock.mockResolvedValue({
				error: null
			})

			const successfulUploads = await manageDocumentStorage(
				mockSupabase,
				'project-docs',
				'test-project',
				mockArticleMap
			)

			expect(fs.readFileSync).toHaveBeenCalledWith(
				'docs/00-article-1.md',
				'utf-8'
			)
			expect(fs.readFileSync).toHaveBeenCalledWith(
				'docs/01-nested/00-nested-article-1.md',
				'utf-8'
			)

			expect(uploadMock).toHaveBeenCalledWith(
				'test-project/article-1.md',
				'mock file content',
				{ upsert: true }
			)
			expect(uploadMock).toHaveBeenCalledWith(
				'test-project/nested/nested-article-1.md',
				'mock file content',
				{ upsert: true }
			)

			expect(successfulUploads).toEqual(
				new Set(['article-1', 'nested/nested-article-1'])
			)

			expect(core.info).toHaveBeenCalledWith(
				'File uploads complete: 2 succeeded, 0 failed'
			)
		})

		it('should handle mixed upload results', async () => {
			const uploadMock = mockSupabase.storage.from('').upload as jest.Mock
			uploadMock
				.mockResolvedValueOnce({
					error: null
				})
				.mockResolvedValueOnce({
					error: new Error('Test error')
				})

			const successfulUploads = await manageDocumentStorage(
				mockSupabase,
				'project-docs',
				'test-project',
				mockArticleMap
			)

			expect(successfulUploads).toEqual(new Set(['article-1']))

			expect(core.warning).toHaveBeenCalledWith(
				'Failed to upload docs/01-nested/00-nested-article-1.md: Test error'
			)

			expect(core.info).toHaveBeenCalledWith(
				'File uploads complete: 1 succeeded, 1 failed'
			)
		})

		it('should handle upload failures', async () => {
			const uploadMock = mockSupabase.storage.from('').upload as jest.Mock
			uploadMock.mockResolvedValue({
				error: new Error('Test error')
			})

			await expect(
				manageDocumentStorage(
					mockSupabase,
					'project-docs',
					'test-project',
					mockArticleMap
				)
			).rejects.toThrow('All file uploads failed')

			expect(core.info).toHaveBeenCalledWith(
				'File uploads complete: 0 succeeded, 2 failed'
			)

			expect(core.warning).toHaveBeenCalledWith(
				'Failed to upload docs/01-nested/00-nested-article-1.md: Test error'
			)

			expect(core.warning).toHaveBeenCalledWith(
				'Failed to upload docs/00-article-1.md: Test error'
			)
		})
	})
})

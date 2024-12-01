import fs from 'fs'
import * as core from '@actions/core'
import {
	deleteFiles,
	generateArticleMap,
	manageDocumentStorage
} from '../src/docs'
import type { SupabaseClient } from '@supabase/supabase-js'

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

	describe('manageDocumentStorage', () => {
		;(fs.readFileSync as jest.Mock).mockReturnValue('mock file content')
		let mockSupabase: jest.Mocked<SupabaseClient>

		const mockUploadPaths = {
			'article-1': 'docs/00-article-1.md',
			'nested/nested-article-1': 'docs/01-nested/00-nested-article-1.md'
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

			const failedUploadPaths = await manageDocumentStorage(
				mockSupabase,
				'project-docs',
				'test-project',
				mockUploadPaths
			)

			expect(fs.readFileSync).toHaveBeenCalledWith('docs/00-article-1.md')
			expect(fs.readFileSync).toHaveBeenCalledWith(
				'docs/01-nested/00-nested-article-1.md'
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

			expect(failedUploadPaths).toEqual(new Set<string>())

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

			const failedUploadPaths = await manageDocumentStorage(
				mockSupabase,
				'project-docs',
				'test-project',
				mockUploadPaths
			)

			expect(failedUploadPaths).toEqual(new Set(['nested/nested-article-1']))

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
					mockUploadPaths
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

	describe('deleteFiles', () => {
		const remotePaths = ['article-1', 'nested/nested-article-1']
		let mockSupabase: jest.Mocked<SupabaseClient>

		beforeAll(() => {
			jest.clearAllMocks()

			mockSupabase = {
				storage: {
					from: jest.fn().mockReturnValue({
						remove: jest.fn()
					})
				}
			} as unknown as jest.Mocked<SupabaseClient>
		})

		it('should delete leftover files', async () => {
			const remove = mockSupabase.storage.from('').remove as jest.Mock
			remove.mockResolvedValue({
				error: null
			})

			await deleteFiles(
				mockSupabase,
				'test-bucket',
				'test-project',
				remotePaths
			)

			expect(remove).toHaveBeenCalledWith([
				'test-project/article-1.md',
				'test-project/nested/nested-article-1.md'
			])
			expect(core.warning).toHaveBeenCalledTimes(0)
		})

		it('should fail to delete leftover', async () => {
			;(mockSupabase.storage.from('').remove as jest.Mock).mockResolvedValue({
				error: new Error('Test error')
			})

			await deleteFiles(
				mockSupabase,
				'test-bucket',
				'test-project',
				remotePaths
			)

			expect(core.warning).toHaveBeenCalledWith(
				'Failed to delete files: Test error'
			)
		})
	})
})

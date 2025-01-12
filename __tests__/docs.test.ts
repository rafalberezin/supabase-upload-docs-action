import fs from 'fs'
import * as core from '@actions/core'
import * as utils from '../src/utils'
import { removeFiles, diffRemoteFiles, uploadFiles } from '../src/docs'
import type { Inputs } from '../src/types'
import type { SupabaseClient } from '@supabase/supabase-js'

jest.mock('fs', () => ({ ...jest.requireActual('fs') })) // jest.spyOn(fs, 'readFileSync') breaks without that

describe('Documenation Functions', () => {
	const fsStatSyncSpy = jest.spyOn(fs, 'statSync') as jest.Mock
	const fsReaddirSyncSpy = jest.spyOn(fs, 'readdirSync') as jest.Mock

	const coreInfoSpy = jest.spyOn(core, 'info') as jest.Mock
	const coreWarningSpy = jest.spyOn(core, 'warning') as jest.Mock
	coreInfoSpy.mockImplementation(() => {})
	coreWarningSpy.mockImplementation(() => {})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	const files = [
		'docs/articles/meta.yml',
		'docs/articles/00-unchanged.md',
		'docs/articles/01-changed.md',
		'docs/articles/02-nested/00-new.md',
		'docs/articles/03-failed-dir/00-failed.md'
	]

	const directoryContents: Record<string, string[]> = {
		'docs/articles': [
			'meta.yml',
			'00-unchanged.md',
			'01-changed.md',
			'02-nested',
			'03-failed-dir'
		],
		'docs/articles/02-nested': ['00-new.md'],
		'docs/articles/03-failed-dir': ['00-failed.md'],
		'docs/assets': []
	}

	fsReaddirSyncSpy.mockImplementation(
		(path: string) => directoryContents[path] ?? []
	)

	fsStatSyncSpy.mockImplementation((path: string) => ({
		isFile: () => files.includes(path),
		isDirectory: () => path in directoryContents
	}))

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

	const uploadPaths = new Map([
		['slug/articles/changed.md', 'docs/articles/01-changed.md'],
		['slug/articles/nested/new.md', 'docs/articles/02-nested/00-new.md']
	])

	describe('diffRemoteFiles', () => {
		it('should determine files to be uploaded and removed', () => {
			const remoteFilesMetadata = {
				'slug/articles/unchanged.md': 'unchanged',
				'slug/articles/changed.md': 'changed',
				'slug/articles/nested/removed.md': 'removed',
				'slug/articles/failed-dir/failed.md': 'unchanged' // ignore for this test
			}

			jest
				.spyOn(utils, 'hasFileChanged')
				.mockImplementation((_, etag) => etag !== 'unchanged')

			expect(diffRemoteFiles(inputs, slug, remoteFilesMetadata)).toEqual({
				upload: uploadPaths,
				remove: ['slug/articles/nested/removed.md']
			})
		})
	})

	const mockStorageUpload = jest.fn()
	const mockStorageRemove = jest.fn()
	const mockStorageFrom = jest.fn()

	const mockSupabaseClient = {
		storage: {
			from: mockStorageFrom.mockReturnThis(),
			upload: mockStorageUpload,
			remove: mockStorageRemove
		}
	} as unknown as SupabaseClient

	const storageBucket = 'bucket'

	describe('uploadFiles', () => {
		const mockContentBuffer = Buffer.from('mock file content')
		;(jest.spyOn(fs, 'readFileSync') as jest.Mock).mockReturnValue(
			mockContentBuffer
		)

		it('should upload files', async () => {
			await expect(
				uploadFiles(mockSupabaseClient, storageBucket, new Map())
			).resolves.toEqual([])
			expect(coreInfoSpy).toHaveBeenCalledWith('No files to upload')

			mockStorageUpload.mockResolvedValue({ error: null })
			mockStorageUpload.mockResolvedValueOnce({
				error: new Error('mock error')
			})

			await expect(
				uploadFiles(mockSupabaseClient, storageBucket, uploadPaths)
			).resolves.toEqual(['slug/articles/changed.md'])

			expect(mockStorageFrom).toHaveBeenCalledWith(storageBucket)

			for (const remote of uploadPaths.keys()) {
				expect(mockStorageUpload).toHaveBeenCalledWith(
					remote,
					mockContentBuffer,
					{
						upsert: true
					}
				)
			}

			expect(coreWarningSpy).toHaveBeenCalledWith(
				'Failed to upload docs/articles/01-changed.md: mock error'
			)
			expect(coreInfoSpy).toHaveBeenCalledWith(
				'File uploads complete: 1 succeeded, 1 failed'
			)
		})

		it('should throw error when all uploads fail', async () => {
			mockStorageUpload.mockResolvedValue({ error: new Error('mock error') })

			await expect(
				uploadFiles(mockSupabaseClient, storageBucket, uploadPaths)
			).rejects.toThrow('All file uploads failed')

			expect(mockStorageFrom).toHaveBeenCalledWith(storageBucket)

			for (const local of uploadPaths.values()) {
				expect(coreWarningSpy).toHaveBeenCalledWith(
					`Failed to upload ${local}: mock error`
				)
			}

			expect(coreInfoSpy).toHaveBeenCalledWith(
				'File uploads complete: 0 succeeded, 2 failed'
			)
		})
	})

	describe('removeFiles', () => {
		const filesToDelete = ['slug/articles/nested/removed.md']
		it('should remove files', async () => {
			mockStorageRemove.mockResolvedValue({ error: null })

			await removeFiles(mockSupabaseClient, storageBucket, filesToDelete)

			expect(mockStorageFrom).toHaveBeenCalledWith(storageBucket)
			expect(mockStorageRemove).toHaveBeenCalledWith(filesToDelete)
			expect(coreInfoSpy).toHaveBeenCalledWith('Deleted 1 files')
		})

		it('should display warning when remove fails', async () => {
			mockStorageRemove.mockResolvedValue({ error: new Error('mock error') })

			await removeFiles(mockSupabaseClient, storageBucket, filesToDelete)

			expect(coreWarningSpy).toHaveBeenCalledWith(
				'Failed to remove files: mock error'
			)
		})
	})
})

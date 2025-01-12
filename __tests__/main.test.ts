import * as core from '@actions/core'
import * as github from '@actions/github'
import * as supabase from '@supabase/supabase-js'
import * as utils from '../src/utils'
import * as meta from '../src/meta'
import * as docs from '../src/docs'
import { run } from '../src/main'
import type { Inputs } from '../src/types'

describe('Full Action Workflow', () => {
	const utilsGetInputsSpy = jest.spyOn(utils, 'getInputs')
	const metaLoadMetadataSpy = jest.spyOn(meta, 'loadMetadata')
	const metaFetchRepositoryDetailsSpy = jest.spyOn(
		meta,
		'fetchRepositoryDetails'
	)
	const metaFetchRemoteFilesMetadataSpy = jest.spyOn(
		meta,
		'fetchRemoteFilesMetadata'
	)
	const docsDiffRemoteFilesSpy = jest.spyOn(docs, 'diffRemoteFiles')
	const doscUploadFilesSpy = jest.spyOn(docs, 'uploadFiles')
	const docsRemoveFilesSpy = jest.spyOn(docs, 'removeFiles')
	const metaGenerateArticleMapSpy = jest.spyOn(meta, 'generateArticleMap')
	const metaFetchDatabaseEntrySpy = jest.spyOn(meta, 'fetchDatabaseEntry')
	const metaUpsertDatabaseEntrySpy = jest.spyOn(meta, 'upsertDatabaseEntry')
	docsRemoveFilesSpy.mockResolvedValue()
	metaUpsertDatabaseEntrySpy.mockResolvedValue()

	const mockInputs: Inputs = {
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
		metaTable: 'table',
		columnMappings: {
			slug: 'project_slug',
			title: 'project_name',
			latest_version: 'version'
		}
	}
	utilsGetInputsSpy.mockReturnValue(mockInputs)

	const coreInfoSpy = jest.spyOn(core, 'info')
	const coreDebugSpy = jest.spyOn(core, 'debug')
	const coreSetFailedSpy = jest.spyOn(core, 'setFailed')
	coreInfoSpy.mockImplementation(() => {})
	coreDebugSpy.mockImplementation(() => {})
	coreSetFailedSpy.mockImplementation(() => {})

	const mockSupabaseClient = 'SupabaseClient' // this won't be used so it might as well be a string
	const createClientSpy = jest.spyOn(supabase, 'createClient') as jest.Mock
	createClientSpy.mockReturnValue(mockSupabaseClient)

	const mockGetOctokit = jest.spyOn(github, 'getOctokit') as jest.Mock
	mockGetOctokit.mockReturnValue('Octokit')

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should successfully run the action', async () => {
		// Full
		utilsGetInputsSpy.mockReturnValue(mockInputs)
		metaLoadMetadataSpy.mockReturnValue({
			data: { project_slug: 'slug', project_name: 'title', custom: 'data' },
			slug: 'slug',
			title: 'title'
		})
		metaFetchRepositoryDetailsSpy.mockResolvedValue({
			title: 'repo title',
			versions: ['version'],
			latest_version: 'version',
			license: 'license'
		})
		metaFetchRemoteFilesMetadataSpy.mockResolvedValue({})
		docsDiffRemoteFilesSpy.mockReturnValue({
			upload: new Map(),
			remove: ['slug/articles/removed.md']
		})
		doscUploadFilesSpy.mockResolvedValue(['slug/assets/image.png'])
		metaGenerateArticleMapSpy.mockReturnValue({ type: 'root', children: [] })
		metaFetchDatabaseEntrySpy.mockResolvedValue({ project_slug: 'slug' })
		metaUpsertDatabaseEntrySpy.mockResolvedValue()

		await run()

		expect(docsRemoveFilesSpy).toHaveBeenCalledWith(
			mockSupabaseClient,
			mockInputs.storageBucket,
			['slug/articles/removed.md', 'slug/assets/image.png']
		)
		expect(coreInfoSpy).not.toHaveBeenCalledWith('No files to remove')
		expect(coreInfoSpy).not.toHaveBeenCalledWith(
			'Upload completed successfully (files only)'
		)
		expect(coreInfoSpy).toHaveBeenCalledWith(
			'Uploading metadata for project: slug'
		)
		expect(metaUpsertDatabaseEntrySpy).toHaveBeenCalledWith(
			mockSupabaseClient,
			mockInputs.metaTable,
			{
				project_slug: 'slug',
				project_name: 'title',
				custom: 'data',
				articles: { type: 'root', children: [] },
				versions: ['version'],
				version: 'version',
				license: 'license'
			}
		)
		expect(coreInfoSpy).toHaveBeenCalledWith('Upload completed successfully')

		// Minimal
		utilsGetInputsSpy.mockReturnValueOnce({ ...mockInputs, metaTable: '' })
		docsDiffRemoteFilesSpy.mockReturnValueOnce({
			upload: new Map(),
			remove: []
		})
		doscUploadFilesSpy.mockResolvedValueOnce([])

		await run()

		expect(coreInfoSpy).toHaveBeenCalledWith('No files to remove')
		expect(coreInfoSpy).toHaveBeenCalledWith(
			'Upload completed successfully (files only)'
		)
	})

	it('should fail when an error is encountered', async () => {
		utilsGetInputsSpy.mockImplementationOnce(() => {
			throw new Error('mock error')
		})
		await run()
		expect(coreSetFailedSpy).toHaveBeenCalledWith('mock error')
		expect(coreDebugSpy).toHaveBeenCalled()
		expect(coreDebugSpy).not.toHaveBeenCalledWith('No stack trace')

		utilsGetInputsSpy.mockImplementationOnce(() => {
			const error = new Error('no stack error')
			error.stack = undefined
			throw error
		})
		await run()
		expect(coreSetFailedSpy).toHaveBeenCalledWith('no stack error')
		expect(coreDebugSpy).toHaveBeenCalledWith('No stack trace')

		utilsGetInputsSpy.mockImplementationOnce(() => {
			throw 'non error throw'
		})
		await run()
		expect(coreSetFailedSpy).toHaveBeenCalledWith('Unknown Error')
	})
})

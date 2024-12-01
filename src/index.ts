import * as core from '@actions/core'
import * as github from '@actions/github'
import { createClient } from '@supabase/supabase-js'
import {
	findUploadPaths,
	findLeftoverPaths,
	generateSlug,
	processName,
	validateDocsPath,
	prepareArticleMapForUpload,
	flattenArticlePaths
} from './utils'
import {
	buildDatabaseEntry,
	fetchDatabaseEntry,
	fetchRemoteFilesMetadata,
	getRepositoryDetails,
	loadMetadata,
	upsertDatabaseEntry
} from './meta'
import { deleteFiles, generateArticleMap, manageDocumentStorage } from './docs'

async function run() {
	try {
		const githubToken = core.getInput('github-token', { required: true })
		const supabaseUrl = core.getInput('supabase-url', { required: true })
		const supabaseKey = core.getInput('supabase-key', { required: true })
		const docsPath = core.getInput('docs-path', { required: true })
		const metaPath = core.getInput('meta-path', { required: true })
		const dbTable = core.getInput('db-table', { required: true })
		const storageBucket = core.getInput('storage-bucket', { required: true })

		validateDocsPath(docsPath)

		const supabase = createClient(supabaseUrl, supabaseKey)
		const octokit = github.getOctokit(githubToken)

		const repoDetails = await getRepositoryDetails(octokit, github.context)
		const projectMetadata = loadMetadata(metaPath)

		const slug =
			projectMetadata.slug ??
			generateSlug(projectMetadata.title ?? repoDetails.title)

		const localArticleMap = generateArticleMap(docsPath)
		const remoteFilesMetadata = await fetchRemoteFilesMetadata(
			supabase,
			storageBucket,
			slug
		)

		const articlePaths = flattenArticlePaths(localArticleMap)

		const uploadPaths = await findUploadPaths(articlePaths, remoteFilesMetadata)
		const failedUploadPaths = await manageDocumentStorage(
			supabase,
			storageBucket,
			slug,
			uploadPaths
		)

		const leftoverPaths = findLeftoverPaths(
			articlePaths,
			remoteFilesMetadata,
			failedUploadPaths
		)
		if (leftoverPaths.length > 0)
			await deleteFiles(supabase, storageBucket, slug, leftoverPaths)

		const title =
			projectMetadata.title ??
			processName(projectMetadata.slug ?? repoDetails.title).title
		const filteredArticleMap = prepareArticleMapForUpload(
			localArticleMap,
			failedUploadPaths
		)

		const existingDatabaseEntry = await fetchDatabaseEntry(
			supabase,
			dbTable,
			slug
		)
		const newDatabaseEntry = buildDatabaseEntry(
			title,
			slug,
			filteredArticleMap,
			projectMetadata,
			repoDetails,
			existingDatabaseEntry
		)
		await upsertDatabaseEntry(supabase, dbTable, newDatabaseEntry)

		core.info('Upload completed successfully')
	} catch (error) {
		if (error instanceof Error) {
			core.debug(error.stack || 'No stack trace')
			core.setFailed(error.message)
		} else {
			core.setFailed('Unknown error')
		}
	}
}

run()

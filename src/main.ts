import * as core from '@actions/core'
import * as github from '@actions/github'
import { createClient } from '@supabase/supabase-js'
import {
	loadMetadata,
	fetchRepositoryDetails,
	fetchRemoteFilesMetadata,
	fetchDatabaseEntry,
	generateArticleMap,
	buildDatabaseEntry,
	upsertDatabaseEntry
} from './meta'
import { getInputs, processProjectName } from './utils'
import { removeFiles, diffRemoteFiles, uploadFiles } from './docs'

export async function run() {
	try {
		const inputs = getInputs()

		const octokit = github.getOctokit(inputs.githubToken)
		const supabase = createClient(inputs.supabaseUrl, inputs.supabaseKey)

		const projectMetadata = loadMetadata(inputs.metaPath, inputs.columnMappings)
		const repoDetails = await fetchRepositoryDetails(octokit, github.context)

		const { slug, title } = processProjectName(projectMetadata, repoDetails)

		const remoteFilesMetadata = await fetchRemoteFilesMetadata(
			supabase,
			inputs,
			slug
		)

		const filesDiff = diffRemoteFiles(inputs, slug, remoteFilesMetadata)

		const failedUploadPaths = await uploadFiles(
			supabase,
			inputs.storageBucket,
			filesDiff.upload
		)
		const pathsToDelete = filesDiff.remove.concat(failedUploadPaths)

		if (pathsToDelete.length > 0)
			await removeFiles(supabase, inputs.storageBucket, pathsToDelete)
		else core.info('No files to remove')

		if (!inputs.metaTable) {
			core.info('Upload completed successfully (files only)')
			return
		}

		core.info(`Uploading metadata for project: ${slug}`)

		const articleMap = generateArticleMap(inputs, slug, failedUploadPaths)
		const existingDatabaseEntry = await fetchDatabaseEntry(
			supabase,
			inputs.metaTable,
			slug,
			inputs.columnMappings
		)
		const newDatabaseEntry = buildDatabaseEntry(
			title,
			slug,
			articleMap,
			projectMetadata,
			repoDetails,
			existingDatabaseEntry,
			inputs.columnMappings
		)
		await upsertDatabaseEntry(supabase, inputs.metaTable, newDatabaseEntry)

		core.info('Upload completed successfully')
	} catch (error) {
		if (error instanceof Error) {
			core.debug(error.stack || 'No stack trace')
			core.setFailed(error.message)
		} else {
			core.setFailed('Unknown Error')
		}
	}
}

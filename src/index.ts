import * as core from '@actions/core'
import * as github from '@actions/github'
import { createClient } from '@supabase/supabase-js'
import {
	filterSuccessfulUploads,
	generateSlug,
	slugToTitle,
	validateDocsPath
} from './utils'
import {
	buildDatabaseEntry,
	getCurrentFilePaths,
	getRepositoryDetails,
	loadMetadata,
	upsertDatabaseEntry
} from './meta'
import {
	deleteLeftoverFiles,
	generateArticleMap,
	manageDocumentStorage
} from './docs'
import type { DatabaseEntry } from './types'

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
		const metadata = loadMetadata(metaPath)

		const titleSlug = generateSlug(metadata.title ?? repoDetails.title)
		const title = slugToTitle(titleSlug)
		const slug = metadata.slug ? generateSlug(metadata.slug) : titleSlug

		const articles = generateArticleMap(docsPath)
		const previousFullFilePaths = await getCurrentFilePaths(
			supabase,
			storageBucket,
			slug
		)

		const successfulUploadPaths = await manageDocumentStorage(
			supabase,
			storageBucket,
			slug,
			articles
		)

		await deleteLeftoverFiles(
			supabase,
			storageBucket,
			slug,
			successfulUploadPaths,
			previousFullFilePaths
		)

		const uploadedArticles = filterSuccessfulUploads(
			articles,
			successfulUploadPaths
		)

		const { data: existingDatabaseEntry }: { data: DatabaseEntry | null } =
			await supabase.from(dbTable).select('*').eq('slug', slug).single()

		const newDatabaseEntry = buildDatabaseEntry(
			title,
			slug,
			uploadedArticles,
			metadata,
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

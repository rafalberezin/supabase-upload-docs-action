import fs from 'fs'
import path from 'path/posix'
import * as core from '@actions/core'
import yaml from 'js-yaml'
import type * as github from '@actions/github'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	ProjectMetadata,
	RepositoryDetails,
	RemoteFilesMetadata,
	ColumnMappings,
	Inputs,
	DatabaseEntry,
	ArticleMap,
	ArticleMapChildren
} from './types'
import { mapKeys, processName } from './utils'

export function loadMetadata(
	metaPath: string,
	columnMappings: ColumnMappings
): ProjectMetadata {
	if (!metaPath) return { data: {} }

	try {
		const fileContent = fs.readFileSync(metaPath, 'utf-8')
		const ext = path.extname(metaPath).toLowerCase()

		let data: Record<string, unknown>
		if (['.yml', '.yaml'].includes(ext)) {
			data = yaml.load(fileContent) as Record<string, unknown>
		} else if (ext === '.json') {
			data = JSON.parse(fileContent)
		} else {
			throw new Error('Unsupported metadata file type')
		}

		const meta: ProjectMetadata = {
			data
		}

		const slug = data[columnMappings.slug ?? 'slug']
		if (slug && typeof slug === 'string') meta.slug = slug

		const title = data[columnMappings.title ?? 'title']
		if (title && typeof title === 'string') meta.title = title

		return meta
	} catch (error) {
		throw new Error(
			`Could not load metadata: ${error instanceof Error ? error.message : 'Unknown Error'}`
		)
	}
}

export async function fetchRepositoryDetails(
	octokit: ReturnType<typeof github.getOctokit>,
	context: typeof github.context
): Promise<RepositoryDetails> {
	try {
		const repoResponse = await octokit.rest.repos.get(context.repo)
		const releasesListResponse = await octokit.rest.repos.listReleases(
			context.repo
		)

		const versions = releasesListResponse.data
			.filter(response => !response.draft)
			.map(response => response.tag_name)

		const latestVersion = versions?.[0]
		if (versions.length === 0)
			core.info('No releases found for this repository')

		const details: RepositoryDetails = {
			title: context.repo.repo,
			source: repoResponse.data.html_url,
			versions
		}

		if (repoResponse.data.description) {
			details.description = repoResponse.data.description
		}
		if (repoResponse.data.license) {
			details.license = repoResponse.data.license.name
		}
		if (latestVersion) {
			details.latest_version = latestVersion
		}

		return details
	} catch (error) {
		throw new Error(
			`Failed to retrieve repository details: ${error instanceof Error ? error.message : 'Unknown Error'}`
		)
	}
}

export async function fetchRemoteFilesMetadata(
	supabase: SupabaseClient,
	inputs: Inputs,
	slug: string
): Promise<RemoteFilesMetadata> {
	const filesMeta: RemoteFilesMetadata = {}

	async function list(dirPath: string) {
		const { data, error } = await supabase.storage
			.from(inputs.storageBucket)
			.list(dirPath)

		if (error) {
			throw new Error(`Failed to list supabase storage files: ${error.message}`)
		}

		for (const file of data) {
			const fullRemotePath = path.join(dirPath, path.basename(file.name))

			// Directories are simulated, not real,
			// and have null values for all properties except name
			if (file.id === null) {
				await list(fullRemotePath)
			} else {
				if (file.metadata?.eTag) {
					filesMeta[fullRemotePath] = file.metadata.eTag.slice(
						1,
						file.metadata.eTag.length - 1
					)
				}
			}
		}
	}

	await list(path.join(slug, inputs.storageArticlesDir))
	if (inputs.storageAssetsDir)
		await list(path.join(slug, inputs.storageAssetsDir))

	return filesMeta
}

export function generateArticleMap(
	inputs: Inputs,
	slug: string,
	failedUploadPaths: string[]
): ArticleMap {
	function processDir(
		localPath: string,
		remotePath: string
	): ArticleMapChildren {
		const files = fs.readdirSync(localPath).sort()
		const children: ArticleMapChildren = []
		const slugs = {}

		files.forEach(file => {
			const fullLocalPath = path.join(localPath, file)
			if (inputs.metaPath === fullLocalPath) return
			const stats = fs.statSync(fullLocalPath)

			const { slug, title } = processName(file, inputs.trimPrefixes, slugs)
			const fullRemotePath = path.join(remotePath, slug)

			if (stats.isDirectory()) {
				const dirChildren = processDir(fullLocalPath, fullRemotePath)
				if (dirChildren.length === 0) return

				children.push({
					type: 'directory',
					title,
					children: dirChildren
				})
			} else if (stats.isFile()) {
				if (failedUploadPaths.includes(fullRemotePath + path.extname(file)))
					return

				children.push({
					type: 'article',
					title,
					path: fullRemotePath
				})
			}
		})

		return children
	}

	return {
		type: 'root',
		children: processDir(
			inputs.articlesPath,
			path.join(slug, inputs.storageArticlesDir)
		)
	}
}

export async function fetchDatabaseEntry(
	supabase: SupabaseClient,
	metaTable: string,
	slug: string,
	columnMappings: ColumnMappings
): Promise<DatabaseEntry | null> {
	const { data, error } = await supabase
		.from(metaTable)
		.select('*')
		.eq(columnMappings.slug ?? 'slug', slug)
		.limit(1)
		.maybeSingle()

	if (error)
		throw new Error(`Could not retrieve database entry: ${error.message}`)

	return data
}

export function buildDatabaseEntry(
	title: string,
	slug: string,
	articles: ArticleMap,
	projectMetadata: ProjectMetadata,
	repoDetails: RepositoryDetails,
	existingEntry: DatabaseEntry | null,
	columnMappings: ColumnMappings
): DatabaseEntry {
	return {
		...existingEntry,
		...mapKeys(
			repoDetails as unknown as Record<string, unknown>,
			columnMappings
		),
		...projectMetadata.data,
		...mapKeys({ articles, slug, title }, columnMappings)
	}
}

export async function upsertDatabaseEntry(
	supabase: SupabaseClient,
	table: string,
	databaseEntry: DatabaseEntry
) {
	const { error } = await supabase.from(table).upsert(databaseEntry)

	if (error) {
		throw new Error(`Failed to upsert database entry: ${error.message}`)
	}
}

import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import yaml from 'js-yaml'
import type * as github from '@actions/github'
import type {
	ArticleMap,
	DatabaseEntry,
	ProjectMetadata,
	RepositoryDetails
} from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

export function loadMetadata(metaPath: string): ProjectMetadata {
	if (!metaPath) return {}

	try {
		if (!fs.existsSync(metaPath)) {
			core.warning(`Metadata file not found: ${metaPath}`)
			return {}
		}

		const fileContent = fs.readFileSync(metaPath, 'utf-8')
		const ext = path.extname(metaPath).toLowerCase()

		let metadata: ProjectMetadata
		if (['.yml', '.yaml'].includes(ext)) {
			metadata = yaml.load(fileContent) as ProjectMetadata
		} else if (ext === '.json') {
			metadata = JSON.parse(fileContent)
		} else {
			throw new Error('Unsupported metadata file type')
		}

		return metadata
	} catch (error) {
		core.warning(`Could not load metadata: ${error}`)
		return {}
	}
}

export async function getCurrentFilePaths(
	supabase: SupabaseClient,
	bucket: string,
	slug: string
): Promise<Set<string>> {
	const paths = new Set<string>()

	async function list(dirPath: string) {
		const fullDirPath = path.posix.join(slug, dirPath)
		const { data, error } = await supabase.storage
			.from(bucket)
			.list(fullDirPath)
		if (error) {
			throw new Error(`Failed to list supabase storage files: ${error.message}`)
		}

		for (const file of data) {
			const fullPath = path.posix.join(dirPath, file.name)
			// Directories ara not a simulated not real and have null values for all properties except name
			if (file.id === null) {
				await list(fullPath)
			} else {
				paths.add(fullPath)
			}
		}
	}

	await list('')
	return paths
}

export async function getRepositoryDetails(
	octokit: ReturnType<typeof github.getOctokit>,
	context: typeof github.context
): Promise<RepositoryDetails> {
	try {
		const repoResponse = await octokit.rest.repos.get(context.repo)

		let latestVersion: string | undefined
		try {
			const releaseResponse = await octokit.rest.repos.getLatestRelease(
				context.repo
			)
			latestVersion = releaseResponse.data.tag_name
		} catch {
			core.info('No releases found for this repository')
		}

		return {
			title: context.repo.repo,
			description: repoResponse.data.description || undefined,
			source: repoResponse.data.html_url,
			license: repoResponse.data.license?.name,
			latest_version: latestVersion
		}
	} catch (error) {
		core.warning(
			`Could not retrieve repository details: ${error instanceof Error ? error.message : 'Unknown Error'}`
		)
		return {
			title: context.repo.repo
		}
	}
}

export function buildDatabaseEntry(
	title: string,
	slug: string,
	articles: ArticleMap,
	metadata: ProjectMetadata,
	repoDetails: RepositoryDetails,
	existingEntry: DatabaseEntry | null
): DatabaseEntry {
	return {
		...existingEntry,
		...repoDetails,
		...metadata,
		articles,
		slug,
		title,
		versions: updateVersions(
			existingEntry?.versions,
			repoDetails.latest_version
		)
	}
}

function updateVersions(
	versions?: string[],
	newVersion?: string
): string[] | undefined {
	if (!newVersion) return versions

	const updateVersions = new Set(versions)
	updateVersions.add(newVersion)

	return Array.from(updateVersions)
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

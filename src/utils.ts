import fs from 'fs'
import * as core from '@actions/core'
import kebabCase from 'lodash/kebabCase'
import type * as github from '@actions/github'
import type {
	ArticleMap,
	ArticleMapChildren,
	DatabaseEntry,
	ProjectMetadata,
	RepositoryDetails
} from './types'

export function validateDocsPath(docsPath: string): void {
	if (!fs.existsSync(docsPath)) {
		throw new Error(`Documentation path does not exist: ${docsPath}`)
	}

	const stats = fs.statSync(docsPath)
	if (!stats.isDirectory()) {
		throw new Error(`Documentation path is not a directory: ${docsPath}`)
	}
}

export async function getRepositoryDetail(
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
			name: context.repo.repo,
			summary: repoResponse.data.description || undefined,
			source: repoResponse.data.html_url,
			license: repoResponse.data.license?.name || 'No License',
			latest_version: latestVersion
		}
	} catch (error) {
		core.warning(
			`Could not retrieve repository details: ${error instanceof Error ? error.message : 'Unknown Error'}`
		)
		return {
			name: context.repo.repo,
			source: ''
		}
	}
}

export function processName(
	name: string,
	trimFile: boolean = true
): { slug: string; title: string } {
	if (trimFile) name = name.replaceAll(/^\d+-|\.md$/g, '')

	const slug = kebabCase(name)

	const title = slug
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')

	return {
		slug,
		title
	}
}

export function buildDatabaseEntry(
	name: string,
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
		name,
		versions: updateVersions(
			existingEntry?.versions,
			repoDetails.latest_version
		)
	}
}

export function cleanArticlesMap(article: ArticleMap): ArticleMap {
	function removeLocalPaths(children: ArticleMapChildren) {
		Object.values(children).forEach(child => {
			if (child.type === 'article') {
				delete child._localPath
			} else {
				removeLocalPaths(child.children)
			}
		})
	}

	removeLocalPaths(article.children)
	return article
}

export function findRemovedArticlePaths(
	newArticles: ArticleMap,
	existingArticles?: ArticleMap
): string[] {
	const newPaths = extractArticlePaths(newArticles)
	const existingPaths = existingArticles
		? extractArticlePaths(existingArticles)
		: new Set<string>()

	return Array.from(existingPaths).filter(p => !newPaths.has(p))
}

function extractArticlePaths(articleMap: ArticleMap): Set<string> {
	const paths = new Set<string>()

	function traverse(children: ArticleMapChildren) {
		Object.values(children).forEach(child => {
			if (child.type === 'article') {
				paths.add(child.path)
			} else {
				traverse(child.children)
			}
		})
	}

	traverse(articleMap.children)
	return paths
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

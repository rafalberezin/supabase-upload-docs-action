import fs from 'fs'
import * as core from '@actions/core'
import kebabCase from 'lodash/kebabCase'
import type * as github from '@actions/github'
import type {
	ArticleMap,
	ArticleMapChildren,
	DatabaseEntry,
	ProjectMetadata,
	RepositoryDetails,
	SlugTracker
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

export function processName(
	fileName: string,
	slugTracker?: SlugTracker
): { slug: string; title: string } {
	const trimmedName = fileName.replaceAll(/^\d+-|\.md$/g, '')
	const slug = generateSlug(trimmedName, slugTracker)
	const title = slugToTitle(slug)

	return {
		slug,
		title
	}
}

export function generateSlug(name: string, slugTracker?: SlugTracker) {
	const baseSlug = kebabCase(name)
	if (slugTracker === undefined) return baseSlug

	if (!(baseSlug in slugTracker)) {
		slugTracker[baseSlug] = 1
		return baseSlug
	}
	return `${baseSlug}-${slugTracker[baseSlug]++}`
}

export function slugToTitle(slug: string): string {
	return slug
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
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

export function filterSuccessfulUploads(
	articleMap: ArticleMap,
	successfulPaths: Set<string>
): ArticleMap {
	function pruneChildren(children: ArticleMapChildren): ArticleMapChildren {
		return children
			.map(child => {
				if (child.type === 'article') {
					return child._localPath && successfulPaths.has(child.path)
						? {
								type: 'article',
								title: child.title,
								path: child.path
								// Do not include _localPath
							}
						: null
				} else {
					const prunedChildren = pruneChildren(child.children)
					return prunedChildren.length > 0
						? {
								type: 'directory',
								title: child.title,
								children: prunedChildren
							}
						: null
				}
			})
			.filter(Boolean) as ArticleMapChildren
	}

	return {
		type: 'root',
		children: pruneChildren(articleMap.children)
	}
}

export function findLeftoverPaths(
	uploadedArticles: ArticleMap,
	previousArticles?: ArticleMap
): string[] {
	const uploadedPaths = extractArticlePaths(uploadedArticles)
	if (previousArticles === undefined) return Array.from(uploadedPaths)

	const previousPaths = extractArticlePaths(previousArticles)
	return Array.from(previousPaths).filter(p => !uploadedPaths.has(p))
}

function extractArticlePaths(articleMap: ArticleMap): Set<string> {
	const paths = new Set<string>()

	function collectPaths(children: ArticleMapChildren) {
		children.forEach(child => {
			if (child.type === 'article') {
				paths.add(child.path)
			} else {
				collectPaths(child.children)
			}
		})
	}

	collectPaths(articleMap.children)
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

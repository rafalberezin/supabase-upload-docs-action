import fs from 'fs'
import kebabCase from 'lodash/kebabCase'
import type { ArticleMap, ArticleMapChildren, SlugTracker } from './types'

export function validateDocsPath(docsPath: string): void {
	if (!fs.existsSync(docsPath)) {
		throw new Error(`Documentation path does not exist: ${docsPath}`)
	}

	const stats = fs.statSync(docsPath)
	if (!stats.isDirectory()) {
		throw new Error(`Documentation path is not a directory: ${docsPath}`)
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
	uploadedFilePaths: Set<string>,
	previousFilePaths: Set<string>
): string[] {
	return Array.from(previousFilePaths).filter(p => !uploadedFilePaths.has(p))
}

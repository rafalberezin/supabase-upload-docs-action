import fs from 'fs'
import crypto from 'crypto'
import kebabCase from 'lodash/kebabCase'
import type {
	ArticleMap,
	ArticleMapChildren,
	SlugTracker,
	RemoteFilesMetadata,
	RemoteToLocalPaths
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

export function flattenArticlePaths(
	articleMap: ArticleMap
): RemoteToLocalPaths {
	const paths: RemoteToLocalPaths = {}

	function collectPaths(children: ArticleMapChildren) {
		children.forEach(child => {
			if (child.type === 'directory') {
				collectPaths(child.children)
			} else if (child._localPath !== undefined) {
				paths[child.path] = child._localPath
			}
		})
	}

	collectPaths(articleMap.children)
	return paths
}

export async function findUploadPaths(
	articlePaths: RemoteToLocalPaths,
	remoteFilesMetadata: RemoteFilesMetadata
): Promise<RemoteToLocalPaths> {
	const uploadPaths: RemoteToLocalPaths = {}

	await Promise.all(
		Object.entries(articlePaths).map(async entry => {
			const expectedEtag = remoteFilesMetadata[entry[0]]
			const hasChanged = await hasFileChanged(entry[1], expectedEtag)
			if (hasChanged) uploadPaths[entry[0]] = entry[1]
		})
	)

	return uploadPaths
}

async function hasFileChanged(
	filePath: string,
	expectedEtag?: string
): Promise<boolean> {
	if (expectedEtag === undefined) return true

	const inExpectedSize = await isInExpectedSizeRange(filePath, expectedEtag)
	if (!inExpectedSize) return true

	const eTag = await generateEtag(filePath)
	return eTag !== expectedEtag
}

const CHUNK_SIZE = 5242880 // bytes
async function isInExpectedSizeRange(
	filePath: string,
	expectedEtag: string
): Promise<boolean> {
	try {
		const stats = await fs.promises.stat(filePath)
		if (!stats.isFile()) return false

		const chunks = Math.ceil(stats.size / CHUNK_SIZE)
		const expectedChunks = expectedEtag.split('-')[1] ?? '1'

		return chunks.toString() === expectedChunks
	} catch {
		return false
	}
}

async function generateEtag(filePath: string): Promise<string> {
	const stats = await fs.promises.stat(filePath)
	const file = await fs.promises.readFile(filePath)

	if (stats.size <= CHUNK_SIZE)
		return crypto.createHash('md5').update(file).digest('hex')

	const chunks = []

	for (let i = 0; i < file.length; i += CHUNK_SIZE) {
		chunks.push(
			crypto
				.createHash('md5')
				.update(file.subarray(i, i + CHUNK_SIZE))
				.digest()
		)
	}

	const combinedHash = crypto
		.createHash('md5')
		.update(Buffer.concat(chunks))
		.digest('hex')

	return `${combinedHash}-${chunks.length}`
}

export function findLeftoverPaths(
	articlePaths: RemoteToLocalPaths,
	remoteFilesMetadata: RemoteFilesMetadata,
	failedUploadPaths: Set<string>
): string[] {
	return Object.keys(remoteFilesMetadata).filter(
		p => failedUploadPaths.has(p) || !Object.hasOwn(articlePaths, p)
	)
}

export function prepareArticleMapForUpload(
	articleMap: ArticleMap,
	failedUploadPaths: Set<string>
): ArticleMap {
	function filterChildren(children: ArticleMapChildren): ArticleMapChildren {
		return children
			.map(child => {
				if (child.type === 'article') {
					return failedUploadPaths.has(child.path)
						? null
						: {
								type: 'article',
								title: child.title,
								path: child.path
								// Do not include _localPath
							}
				} else {
					const filteredChildren = filterChildren(child.children)
					return filteredChildren.length > 0
						? {
								type: 'directory',
								title: child.title,
								children: filteredChildren
							}
						: null
				}
			})
			.filter(Boolean) as ArticleMapChildren
	}

	return {
		type: 'root',
		children: filterChildren(articleMap.children)
	}
}

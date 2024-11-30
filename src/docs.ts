import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import { findLeftoverPaths, processName } from './utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Article, ArticleMap, ArticleMapChildren } from './types'

export function generateArticleMap(docsPath: string): ArticleMap {
	function processDir(
		localPath: string,
		slugPath: string = ''
	): ArticleMapChildren {
		const files = fs.readdirSync(localPath)
		const children: ArticleMapChildren = []
		const slugs = {}

		files.forEach(file => {
			const fullLocalPath = path.posix.join(localPath, file)
			const stats = fs.statSync(fullLocalPath)

			const { slug, title } = processName(file, slugs)
			const fullSlugPath = path.posix.join(slugPath, slug)

			if (stats.isDirectory()) {
				const dirChildren = processDir(fullLocalPath, fullSlugPath)
				if (dirChildren.length <= 0) return

				children.push({
					type: 'directory',
					title,
					children: dirChildren
				})
			} else if (stats.isFile() && file.endsWith('.md')) {
				children.push({
					type: 'article',
					title,
					path: fullSlugPath,
					_localPath: fullLocalPath
				})
			}
		})

		return children
	}

	return {
		type: 'root',
		children: processDir(docsPath)
	}
}

export async function manageDocumentStorage(
	supabase: SupabaseClient,
	storageBucket: string,
	projectSlug: string,
	newArticles: ArticleMap
): Promise<Set<string>> {
	core.info('Starting file uploads')

	function collectUploadPromises(
		children: ArticleMapChildren
	): Promise<string | null>[] {
		const uploads: Promise<string | null>[] = []

		for (const key in children) {
			const child = children[key]

			if (child.type === 'directory') {
				uploads.push(...collectUploadPromises(child.children))
			} else {
				uploads.push(uploadFile(supabase, storageBucket, projectSlug, child))
			}
		}

		return uploads
	}

	const uploadPromises = collectUploadPromises(newArticles.children)
	const results = await Promise.all(uploadPromises)

	const successfulUploadPaths = new Set(
		results.filter(res => typeof res === 'string')
	)
	const successCount = successfulUploadPaths.size
	const failureCount = results.length - successCount

	core.info(
		`File uploads complete: ${successCount} succeeded, ${failureCount} failed`
	)

	if (!successCount && failureCount) {
		throw new Error('All file uploads failed')
	}

	return successfulUploadPaths
}

async function uploadFile(
	supabase: SupabaseClient,
	storageBucket: string,
	projectSlug: string,
	article: Article
): Promise<string | null> {
	const localPath = article._localPath
	if (!localPath) return null

	const remotePath = `${projectSlug}/${article.path}.md`
	const fileContents = fs.readFileSync(localPath)

	const { error } = await supabase.storage
		.from(storageBucket)
		.upload(remotePath, fileContents, {
			upsert: true
		})

	if (error) {
		core.warning(`Failed to upload ${localPath}: ${error.message}`)
		return null
	}

	return article.path
}

export async function deleteLeftoverFiles(
	supabase: SupabaseClient,
	storageBucket: string,
	projectSlug: string,
	uploadedFilePaths: Set<string>,
	previousFilePaths: Set<string>
): Promise<void> {
	const removedPaths = findLeftoverPaths(
		uploadedFilePaths,
		previousFilePaths
	).map(p => path.posix.join(projectSlug, p))
	if (removedPaths.length === 0) return

	const { error } = await supabase.storage
		.from(storageBucket)
		.remove(removedPaths)

	if (error) core.warning(`Failed to delete leftover files: ${error.message}`)
}

import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import { findRemovedArticlePaths, processName } from './utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	Article,
	ArticleMap,
	ArticleMapChildren,
	DatabaseEntry
} from './types'

export function generateArticleMap(docsPath: string): ArticleMap {
	function processDir(
		currentPath: string,
		slugPath: string = ''
	): ArticleMapChildren {
		const files = fs.readdirSync(currentPath)
		const children: ArticleMapChildren = {}

		files.forEach(file => {
			const fullPath = path.join(currentPath, file)
			const stats = fs.statSync(fullPath)

			const { slug, title } = processName(file)
			const fullSlugPath = slugPath ? `${slugPath}/${slug}` : slug

			if (stats.isDirectory()) {
				children[slug] = {
					type: 'directory',
					title,
					children: processDir(fullPath, fullSlugPath)
				}
			} else if (stats.isFile() && file.endsWith('.md')) {
				children[slug] = {
					type: 'article',
					title,
					path: fullSlugPath,
					_localPath: fullPath
				}
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
) {
	function collectUploadPromises(
		children: ArticleMapChildren
	): Promise<boolean>[] {
		const uploads: Promise<boolean>[] = []

		for (const key in children) {
			const child = children[key]

			if (child.type === 'directory') {
				uploads.push(...collectUploadPromises(child.children))
			} else {
				uploads.push(
					uploadFile(supabase, storageBucket, projectSlug, child, children, key)
				)
			}
		}

		return uploads
	}

	const uploadPromises = collectUploadPromises(newArticles.children)
	const results = await Promise.all(uploadPromises)

	const successCount = results.filter(result => result).length
	const failureCount = results.length - successCount

	core.info(
		`File uploads complete: ${successCount} succeeded, ${failureCount} failed`
	)

	if (!successCount && failureCount) {
		throw new Error('All file uploads failed')
	}
}

async function uploadFile(
	supabase: SupabaseClient,
	storageBucket: string,
	projectSlug: string,
	child: Article,
	parentMap: ArticleMapChildren,
	key: string
): Promise<boolean> {
	const localPath = child._localPath
	if (!localPath) {
		delete parentMap[key]
		return false
	}

	const remotePath = `${projectSlug}/${child.path}.md`
	const fileContents = fs.readFileSync(localPath, 'utf-8')

	const { error } = await supabase.storage
		.from(storageBucket)
		.upload(remotePath, fileContents, {
			upsert: true
		})

	if (error) {
		core.warning(`Failed to upload ${localPath}: ${error.message}`)
		delete parentMap[key]
	}
	return !error
}

export async function deleteLeftoverFiles(
	supabase: SupabaseClient,
	storageBucket: string,
	projectSlug: string,
	newArticles: ArticleMap,
	existingArticles?: ArticleMap
): Promise<void> {
	const removedPaths = findRemovedArticlePaths(
		newArticles,
		existingArticles
	).map(p => path.join(projectSlug, p))

	supabase.storage.from(storageBucket).remove(removedPaths)
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

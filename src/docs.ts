import fs from 'fs'
import path from 'path/posix'
import * as core from '@actions/core'
import { processName } from './utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	ArticleMap,
	ArticleMapChildren,
	RemoteToLocalPaths
} from './types'

export function generateArticleMap(docsPath: string): ArticleMap {
	function processDir(
		localPath: string,
		slugPath: string = ''
	): ArticleMapChildren {
		const files = fs.readdirSync(localPath)
		const children: ArticleMapChildren = []
		const slugs = {}

		files.forEach(file => {
			const fullLocalPath = path.join(localPath, file)
			const stats = fs.statSync(fullLocalPath)

			const { slug, title } = processName(file, slugs)
			const fullSlugPath = path.join(slugPath, slug)

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
	uploadPaths: RemoteToLocalPaths
): Promise<Set<string>> {
	core.info('Starting file uploads')

	const results = await Promise.all(
		Object.entries(uploadPaths).map(async entry => {
			return await uploadFile(
				supabase,
				storageBucket,
				projectSlug,
				entry[1],
				entry[0]
			)
		})
	)

	const failedUploadPaths = new Set(
		results.filter(res => typeof res === 'string')
	)
	const failureCount = failedUploadPaths.size
	const successCount = results.length - failureCount

	core.info(
		`File uploads complete: ${successCount} succeeded, ${failureCount} failed`
	)

	if (!successCount && failureCount) {
		throw new Error('All file uploads failed')
	}

	return failedUploadPaths
}

async function uploadFile(
	supabase: SupabaseClient,
	storageBucket: string,
	projectSlug: string,
	localPath: string,
	remotePath: string
): Promise<string | null> {
	const fullRemotePath = `${projectSlug}/${remotePath}.md`
	const fileContents = fs.readFileSync(localPath)

	const { error } = await supabase.storage
		.from(storageBucket)
		.upload(fullRemotePath, fileContents, {
			upsert: true
		})

	if (error) {
		core.warning(`Failed to upload ${localPath}: ${error.message}`)
		return remotePath
	}

	return null
}

export async function deleteFiles(
	supabase: SupabaseClient,
	storageBucket: string,
	slug: string,
	remotePaths: string[]
): Promise<void> {
	const { error } = await supabase.storage
		.from(storageBucket)
		.remove(remotePaths.map(p => path.join(slug, `${p}.md`)))

	if (error) core.warning(`Failed to delete files: ${error.message}`)
}

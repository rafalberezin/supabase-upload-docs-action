import fs from 'fs'
import path from 'path/posix'
import * as core from '@actions/core'
import { hasFileChanged, processName } from './utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Inputs, RemoteFilesMetadata, RemoteToLocalPaths } from './types'

export function diffRemoteFiles(
	inputs: Inputs,
	slug: string,
	remoteFilesMetadata: RemoteFilesMetadata
): { upload: RemoteToLocalPaths; remove: string[] } {
	const uploadPaths: RemoteToLocalPaths = new Map()
	const removePaths: string[] = []
	const processedPaths = new Set<string>()

	function processDir(localPath: string, remotePath: string) {
		const slugs = {}
		const files = fs.readdirSync(localPath)

		files.forEach(file => {
			const fullLocalPath = path.join(localPath, file)
			if (inputs.metaPath === fullLocalPath) return
			const stats = fs.statSync(fullLocalPath)

			const slug = processName(file, inputs.trimPrefixes, slugs).slug
			const fullRemotePath = path.join(remotePath, slug) + path.extname(file)

			if (stats.isDirectory()) {
				processDir(fullLocalPath, fullRemotePath)
			} else if (stats.isFile()) {
				processedPaths.add(fullRemotePath)
				const expectedEtag = remoteFilesMetadata[fullRemotePath]
				if (hasFileChanged(fullLocalPath, expectedEtag)) {
					uploadPaths.set(fullRemotePath, fullLocalPath)
				}
			}
		})
	}

	processDir(inputs.articlesPath, path.join(slug, inputs.storageArticlesDir))
	if (inputs.assetsPath)
		processDir(inputs.assetsPath, path.join(slug, inputs.storageAssetsDir))

	for (const remotePath in remoteFilesMetadata) {
		if (!processedPaths.has(remotePath)) {
			removePaths.push(remotePath)
		}
	}

	return {
		upload: uploadPaths,
		remove: removePaths
	}
}

export async function uploadFiles(
	supabase: SupabaseClient,
	storageBucket: string,
	uploadPaths: RemoteToLocalPaths
): Promise<string[]> {
	if (uploadPaths.size === 0) {
		core.info('No files to upload')
		return []
	}
	core.info(`Starting uploads for ${uploadPaths.size} files`)

	const results = await Promise.all(
		Array.from(uploadPaths.entries()).map(async ([remotePath, localPath]) =>
			uploadFile(supabase, storageBucket, localPath, remotePath)
		)
	)

	const failedUploadPaths = results.filter(res => typeof res === 'string')
	const failureCount = failedUploadPaths.length
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
	localPath: string,
	remotePath: string
): Promise<string | null> {
	const fileContents = fs.readFileSync(localPath)

	const { error } = await supabase.storage
		.from(storageBucket)
		.upload(remotePath, fileContents, {
			upsert: true
		})

	if (error) {
		core.warning(`Failed to upload ${localPath}: ${error.message}`)
		return remotePath
	}

	return null
}

export async function removeFiles(
	supabase: SupabaseClient,
	storageBucket: string,
	remotePaths: string[]
) {
	const { error } = await supabase.storage
		.from(storageBucket)
		.remove(remotePaths)

	if (error) core.warning(`Failed to remove files: ${error.message}`)
	else core.info(`Deleted ${remotePaths.length} files`)
}

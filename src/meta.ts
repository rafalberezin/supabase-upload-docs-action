import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import yaml from 'js-yaml'
import type { ProjectMetadata } from './types'

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

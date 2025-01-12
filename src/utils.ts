import fs from 'fs'
import path from 'path/posix'
import crypto from 'crypto'
import * as core from '@actions/core'
import yaml from 'js-yaml'
import kebabCase from 'lodash/kebabCase'
import type {
	Inputs,
	ColumnMappings,
	SlugTracker,
	ProjectMetadata,
	RepositoryDetails
} from './types'

export function getInputs(): Inputs {
	const githubToken = core.getInput('github-token', { required: true })
	const supabaseUrl = core.getInput('supabase-url', { required: true })
	const supabaseKey = core.getInput('supabase-key', { required: true })

	const articlesPath = core.getInput('articles-path', { required: true })
	const assetsPath = core.getInput('assets-path')
	const metaPath = core.getInput('meta-path')

	validateDirPath(articlesPath)
	if (assetsPath) validateDirPath(assetsPath)
	if (metaPath) validateFilePath(metaPath)

	const storageBucket = core.getInput('storage-bucket', { required: true })
	const storageArticlesDir = core.getInput('storage-articles-dir', {
		required: true
	})
	const storageAssetsDir = core.getInput('storage-assets-dir')
	const trimPrefixes = core.getBooleanInput('trim-prefixes', {
		required: true
	})

	if (assetsPath && !storageAssetsDir) {
		throw new Error(
			"Input 'storage-assets-dir' is required when 'assets-path' is specified"
		)
	}

	const metaTable = core.getInput('meta-table')
	const columnMappingsStr = core.getInput('column-mappings')
	const columnMappings = parseColumnMappings(columnMappingsStr)

	return {
		githubToken,
		supabaseUrl,
		supabaseKey,
		articlesPath: path.normalize(articlesPath),
		assetsPath: assetsPath ? path.normalize(assetsPath) : '',
		metaPath: metaPath ? path.normalize(metaPath) : '',
		storageBucket,
		storageArticlesDir: path.normalize(storageArticlesDir),
		storageAssetsDir: storageAssetsDir ? path.normalize(storageAssetsDir) : '',
		trimPrefixes,
		metaTable,
		columnMappings
	}
}

function validateDirPath(path: string) {
	if (!fs.existsSync(path)) {
		throw new Error(`Directory does not exist: ${path}`)
	}

	const stats = fs.statSync(path)
	if (!stats.isDirectory()) {
		throw new Error(`Path is not a directory: ${path}`)
	}
}

function validateFilePath(path: string) {
	if (!fs.existsSync(path)) {
		throw new Error(`File does not exist: ${path}`)
	}

	const stats = fs.statSync(path)
	if (!stats.isFile()) {
		throw new Error(`Path is not a file: ${path}`)
	}
}

const DEFAULT_GENERATED_COLUMN_NAMES = [
	'slug',
	'title',
	'description',
	'license',
	'source',
	'latest_version',
	'versions',
	'articles'
]

function parseColumnMappings(mappingsStr: string): ColumnMappings {
	const mappings: ColumnMappings = {}

	const data = yaml.load(mappingsStr) as Record<string, unknown>
	for (const key in data) {
		if (!DEFAULT_GENERATED_COLUMN_NAMES.includes(key)) {
			throw new Error(
				`Invalid column name mapping: ${key}\nOnly generated keys can be mapped: ${DEFAULT_GENERATED_COLUMN_NAMES.join(', ')}`
			)
		}

		const value = data[key]
		if (typeof value != 'string') {
			throw new Error(
				`Invalid mapping for column: ${key}. Mapping must be string`
			)
		}

		mappings[key] = value
	}

	return mappings
}

export function mapKeys(
	data: Record<string, unknown>,
	mappings: ColumnMappings
): Record<string, unknown> {
	if (Object.keys(mappings).length === 0) return data

	const mapped: Record<string, unknown> = {}
	for (const key in data) {
		const newKey = mappings[key]
		if (newKey !== '_') mapped[mappings[key] ?? key] = data[key]
	}
	return mapped
}

export function processProjectName(
	projectMetadata: ProjectMetadata,
	repoDetails: RepositoryDetails
): { slug: string; title: string } {
	const slug =
		projectMetadata.slug ??
		generateSlug(projectMetadata.title ?? repoDetails.title, false)
	const title = projectMetadata.title ?? slugToTitle(slug)

	return { slug, title }
}

export function processName(
	fileName: string,
	trimPrefixes: boolean,
	slugTracker?: SlugTracker
): { slug: string; title: string } {
	const slug = generateSlug(fileName, trimPrefixes, slugTracker)
	const title = slugToTitle(slug)

	return {
		slug,
		title
	}
}

function generateSlug(
	fileName: string,
	trimPrefixes: boolean,
	slugTracker?: SlugTracker
): string {
	let trimmedName = path.parse(fileName).name
	if (trimPrefixes) {
		trimmedName = trimmedName.replace(/^\d+-/g, '')
	}

	const baseSlug = kebabCase(trimmedName)
	if (slugTracker === undefined) return baseSlug

	if (!(baseSlug in slugTracker)) {
		slugTracker[baseSlug] = 1
		return baseSlug
	}

	return `${baseSlug}-${++slugTracker[baseSlug]}`
}

export function slugToTitle(slug: string): string {
	return slug
		.split(/[\s-]+/g)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

export function hasFileChanged(
	filePath: string,
	expectedEtag?: string
): boolean {
	if (expectedEtag === undefined) return true

	if (!isInExpectedSizeRange(filePath, expectedEtag)) return true
	return generateEtag(filePath) !== expectedEtag
}

const CHUNK_SIZE = 5242880 // bytes
function isInExpectedSizeRange(
	filePath: string,
	expectedEtag: string
): boolean {
	try {
		const stats = fs.statSync(filePath)
		if (!stats.isFile()) return false

		const chunks = Math.ceil(stats.size / CHUNK_SIZE)
		const expectedChunks = expectedEtag.split('-')[1] ?? '1'

		return chunks.toString() === expectedChunks
	} catch {
		return false
	}
}

function generateEtag(filePath: string): string {
	const stats = fs.statSync(filePath)
	const file = fs.readFileSync(filePath)

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

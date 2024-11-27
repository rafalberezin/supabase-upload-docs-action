export interface ProjectMetadata {
	name?: string
	summary?: string
	tags?: Record<string, string>
	featured?: boolean
	meta?: unknown
}

export interface RepositoryDetails {
	name: string
	source: string
	summary?: string
	license?: string
	latest_version?: string
}

export interface DatabaseEntry {
	slug: string
	name: string
	summary?: string
	license?: string
	source?: string
	latest_version?: string
	versions?: string[]
	articles?: ArticleMap
	tags?: Record<string, string>
	featured?: boolean
	meta?: unknown
	[key: string]: unknown
}

export interface ArticleMap {
	type: 'root'
	children: ArticleMapChildren
}

export type ArticleMapChildren = (Directory | Article)[]

export interface Directory {
	type: 'directory'
	title: string
	children: ArticleMapChildren
}

export interface Article {
	type: 'article'
	title: string
	path: string
	_localPath?: string
}

export type SlugTracker = Record<string, number>

export interface ProjectMetadata {
	slug?: string
	title?: string
	description?: string
	[key: string]: unknown
}

export interface RepositoryDetails {
	title: string
	description?: string
	license?: string
	source?: string
	latest_version?: string
}

export interface DatabaseEntry {
	slug: string
	title: string
	description?: string
	license?: string
	source?: string
	latest_version?: string
	versions?: string[]
	articles?: ArticleMap
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
	path: string // remotePath
	_localPath?: string
}

export type SlugTracker = Record<string, number>

export type RemoteFilesMetadata = Record<string, string> // remotePath to eTag

export type RemoteToLocalPaths = Record<string, string>

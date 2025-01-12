export interface Inputs {
	githubToken: string
	supabaseUrl: string
	supabaseKey: string

	articlesPath: string
	assetsPath: string
	metaPath: string

	storageBucket: string
	storageArticlesDir: string
	storageAssetsDir: string

	trimPrefixes: boolean

	metaTable: string
	columnMappings: ColumnMappings
}

export type ColumnMappings = Record<string, string>

export interface ProjectMetadata {
	data: Record<string, unknown>
	slug?: string
	title?: string
}

export interface RepositoryDetails {
	title: string
	description?: string
	license?: string
	source?: string
	latest_version?: string
	versions: string[]
}

export type RemoteFilesMetadata = Record<string, string> // remotePath to eTag

export type SlugTracker = Record<string, number>

export type RemoteToLocalPaths = Map<string, string>

export type DatabaseEntry = Record<string, unknown>

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
}

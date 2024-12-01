import fs from 'fs'
import {
	findUploadPaths,
	findLeftoverPaths,
	processName,
	validateDocsPath,
	flattenArticlePaths,
	prepareArticleMapForUpload
} from '../src/utils'
import type { ArticleMap } from '../src/types'

describe('Utility Function', () => {
	describe('validateDocsPath', () => {
		beforeEach(() => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(true)
			jest
				.spyOn(fs, 'statSync')
				.mockReturnValue({ isDirectory: () => true } as fs.Stats)
		})

		it('should not throw for valid directory', () => {
			expect(() => validateDocsPath('/valid/path')).not.toThrow()
		})

		it('should throw for non-existent path', () => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(false)
			expect(() => validateDocsPath('/invalid/path')).toThrow(
				'Documentation path does not exist'
			)
		})

		it('should throw for non-directory path', () => {
			jest
				.spyOn(fs, 'statSync')
				.mockReturnValue({ isDirectory: () => false } as fs.Stats)
			expect(() => validateDocsPath('/not/a/directory')).toThrow(
				'Documentation path is not a directory'
			)
		})
	})

	describe('processName', () => {
		it('should convert file and directory names to slugs and titles', () => {
			const { slug: fileSlug, title: fileTitle } =
				processName('00-Hello World.md')
			expect(fileSlug).toBe('hello-world')
			expect(fileTitle).toBe('Hello World')

			const { slug: dirSlug, title: dirTitle } = processName('01-nested_dir')
			expect(dirSlug).toBe('nested-dir')
			expect(dirTitle).toBe('Nested Dir')
		})

		it('should postfix repeating slugs', () => {
			const slugs = {}

			const { slug: slug1, title: title1 } = processName(
				'01-Getting_started.md',
				slugs
			)
			expect(slug1).toBe('getting-started')
			expect(title1).toBe('Getting Started')
			expect(slugs).toEqual({
				'getting-started': 1
			})

			const { slug: slug2, title: title2 } = processName(
				'01-Getting Started.md',
				slugs
			)
			expect(slug2).toBe('getting-started-1')
			expect(title2).toBe('Getting Started 1')
			expect(slugs).toEqual({
				'getting-started': 2
			})
		})
	})

	describe('flattenArticlePaths', () => {
		const mockArticleMap: ArticleMap = {
			type: 'root',
			children: [
				{
					type: 'article',
					title: 'Article 1',
					path: 'article-1',
					_localPath: 'docs/00-article-1.md'
				},
				{
					type: 'directory',
					title: 'Nested',
					children: [
						{
							type: 'article',
							title: 'Nested Article 1',
							path: 'nested/nested-article-1',
							_localPath: 'docs/01-nested/00-nested-article-1.md'
						}
					]
				}
			]
		}

		it('should flatten the article paths', () => {
			expect(flattenArticlePaths(mockArticleMap)).toEqual({
				'article-1': 'docs/00-article-1.md',
				'nested/nested-article-1': 'docs/01-nested/00-nested-article-1.md'
			})
		})
	})

	describe('filterUploadPaths', () => {
		it('should filter file paths for files that have changed', async () => {
			const mockPaths = {
				'article-1': 'docs/00-article-1.md',
				'nested/nested-article-1': 'docs/01-nested/00-nested-article-1.md'
			}

			await expect(findUploadPaths(mockPaths, {})).resolves.toEqual(mockPaths)
		})
	})

	describe('findLeftoverPaths', () => {
		it('should return empty array when no files were deleted and all uploads succeeded', () => {
			expect(
				findLeftoverPaths(
					{
						'article-1': '',
						'nested/nested-article-1': ''
					},
					{
						'article-1': '',
						'nested/nested-article-1': ''
					},
					new Set<string>()
				)
			).toHaveLength(0)
		})

		it('should return remote file paths for files that were deleted or their upload has failed', () => {
			expect(
				findLeftoverPaths(
					{
						'article-1': '',
						'nested/nested-article-1': ''
					},
					{
						'article-1': '',
						'nested/nested-article-1': '',
						'nested/nested-article-2': ''
					},
					new Set<string>(['article-1'])
				)
			).toEqual(['article-1', 'nested/nested-article-2'])
		})
	})

	describe('prepareArticleMapForUpload', () => {
		it('should return upload ready map of articles', () => {
			const mockArticleMap: ArticleMap = {
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Article 1',
						path: 'article-1',
						_localPath: 'docs/00-article-1.md'
					},
					{
						type: 'directory',
						title: 'Nested',
						children: [
							{
								type: 'article',
								title: 'Nested Article 1',
								path: 'nested/nested-article-1',
								_localPath: 'docs/01-nested/00-nested-article-1.md'
							}
						]
					},
					{
						type: 'directory',
						title: 'Nested 2',
						children: [
							{
								type: 'article',
								title: 'Nested Article 1',
								path: 'nested-2/nested-article-1',
								_localPath: 'docs/02-nested-2/00-nested-article-1.md'
							}
						]
					}
				]
			}

			expect(
				prepareArticleMapForUpload(
					mockArticleMap,
					new Set<string>(['nested/nested-article-1'])
				)
			).toEqual({
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Article 1',
						path: 'article-1'
					},
					{
						type: 'directory',
						title: 'Nested 2',
						children: [
							{
								type: 'article',
								title: 'Nested Article 1',
								path: 'nested-2/nested-article-1'
							}
						]
					}
				]
			})
		})
	})
})

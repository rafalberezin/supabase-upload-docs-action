import fs from 'fs'
import {
	filterSuccessfulUploads,
	findLeftoverPaths,
	processName,
	validateDocsPath
} from '../src/utils'
import type { ArticleMap, ArticleMapChildren } from '../src/types'

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

	describe('filterSuccessfulUploads', () => {
		it('should remove local paths from articles and', () => {
			const mockArticles: ArticleMap = {
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
			const mockSuccessfulUploadPaths = new Set<string>([
				'article-1',
				'nested/nested-article-1'
			])

			const uploadedArticles = filterSuccessfulUploads(
				mockArticles,
				mockSuccessfulUploadPaths
			)

			const checkNoLocalPaths = (children: ArticleMapChildren) => {
				children.forEach(child => {
					if (child.type === 'article') {
						expect(child._localPath).toBeUndefined()
					} else if (child.type === 'directory') {
						checkNoLocalPaths(child.children)
					}
				})
			}

			checkNoLocalPaths(uploadedArticles.children)
		})

		it('should remove local paths, unsuccessful uploads and empty upload directories', () => {
			const mockArticles: ArticleMap = {
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
			const mockSuccessfulUploadPaths = new Set<string>(['article-1'])

			const uploadedArticles = filterSuccessfulUploads(
				mockArticles,
				mockSuccessfulUploadPaths
			)

			expect(uploadedArticles).toEqual({
				type: 'root',
				children: [
					{
						type: 'article',
						title: 'Article 1',
						path: 'article-1'
					}
				]
			})
		})
	})

	describe('findLeftoverPaths', () => {
		const mockMorePaths = new Set<string>([
			'article-1',
			'nested/nested-article-1'
		])
		const mockLessPaths = new Set<string>(['article-1'])

		it('should return empty array when nothing has changed', () => {
			expect(findLeftoverPaths(mockLessPaths, mockLessPaths)).toHaveLength(0)
		})

		it('should return paths present in previous paths but not in uploaded paths', () => {
			expect(findLeftoverPaths(mockLessPaths, mockMorePaths)).toEqual([
				'nested/nested-article-1'
			])
		})
	})
})

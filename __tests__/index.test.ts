import * as main from '../src/main'

const mockRun = jest.spyOn(main, 'run').mockImplementation()

// Why do I even test this?
// It was in the template repo so I might as well include it

describe('Action Entry Point', () => {
	it('calls run when imported', () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('../src/index')

		expect(mockRun).toHaveBeenCalled()
	})
})

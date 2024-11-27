/** @type {import('jest').Config} */
const config = {
	preset: 'ts-jest',
	verbose: true,
	clearMocks: true,
	testEnvironment: 'node',
	moduleFileExtensions: ['js', 'ts'],
	testMatch: ['**/*.test.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	transform: {
		'^.+\\.ts$': 'ts-jest'
	},
	coverageReporters: ['json-summary', 'text', 'lcov'],
	collectCoverage: true,
	collectCoverageFrom: ['./src/**']
}

export default config

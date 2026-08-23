// Fast unit/regression layer. Real-browser E2E tests live under tests/e2e
// and run separately in GitHub Actions against packaged extension builds.
module.exports = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  errorOnDeprecated: true,
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  setupFilesAfterEnv: [
    'jest-date-mock',
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/setup-mv3.js',
  ],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/*/**.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\\.tsx?$': '<rootDir>/tools/jest-typescript-transformer.cjs',
  },
  transformIgnorePatterns: ['/node_modules/'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/tests/e2e/'],
};

process.env = Object.assign(process.env, { JEST_TEST: true });

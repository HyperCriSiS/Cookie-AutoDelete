// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageDirectory: 'coverage',
  errorOnDeprecated: true,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  preset: 'ts-jest',
  setupFilesAfterEnv: [
    'jest-date-mock',
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/setup-mv3.js',
  ],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/*/**.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules/'],
};
process.env = Object.assign(process.env, { JEST_TEST: true });

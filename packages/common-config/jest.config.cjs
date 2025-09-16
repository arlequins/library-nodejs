/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/en/configuration.html
 */

module.exports = {
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  coveragePathIgnorePatterns: [
    'node_modules',
    'test-config',
    'interfaces',
    'jestGlobalMocks.ts',
    '.module.ts',
    'mocks',
    'tests',
    'sql',
    '.mock.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/utils/jest-mock-common.ts'],
  moduleNameMapper: {
    '@functions/(.*)': '<rootDir>/src/functions/$1',
    '@libs/(.*)': '<rootDir>/src/libs/$1',
    '@settings/(.*)': '<rootDir>/src/settings/$1',
    '@typing/(.*)': '<rootDir>/src/typing/$1',
    '@constants/(.*)': '<rootDir>/src/constants/$1',
    '@tests/(.*)': '<rootDir>/src/tests/$1',
  },
};

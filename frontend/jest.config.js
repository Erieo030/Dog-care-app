module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^expo/virtual/env$': '<rootDir>/__mocks__/expoVirtualEnv.js',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
};

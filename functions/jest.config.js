/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': '@swc/jest',
    // '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};

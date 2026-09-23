module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
};

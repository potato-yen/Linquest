// Two projects:
// - logic: pure TS (ts-jest / node) — all backend + pure-function unit tests (*.test.ts)
// - rn:    React Native component / hook tests (jest-expo) — *.test.tsx
module.exports = {
  watchman: false,
  projects: [
    {
      displayName: 'logic',
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/tests/setup/jest.setup.ts'],
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.test.ts',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
    },
    {
      displayName: 'rn',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/tests/unit/**/*.test.tsx'],
    },
  ],
};

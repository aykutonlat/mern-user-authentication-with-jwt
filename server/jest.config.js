module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.js"],
  moduleFileExtensions: ["js", "ts"],
  setupFiles: ["<rootDir>/setupEnv.ts"],
};

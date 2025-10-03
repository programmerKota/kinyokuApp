import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@app/(.*)$": "<rootDir>/src/app/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@features/(.*)$": "<rootDir>/src/features/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@project-types$": "<rootDir>/src/types/index.ts",
    "^@project-types/(.*)$": "<rootDir>/src/types/$1",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
};

export default config;



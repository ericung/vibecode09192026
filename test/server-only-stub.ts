// Test-only stub for the `server-only` package, which throws on plain
// Node.js imports. Aliased in vitest.config.mts so server modules can be
// unit-tested with mocked fetch. Never imported by application code.
export {};

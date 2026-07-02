import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globalSetup: './tests/globalSetup.js',
        setupFiles: ['./tests/setup.js'],
        environment: 'node',
        fileParallelism: false,
    }
})

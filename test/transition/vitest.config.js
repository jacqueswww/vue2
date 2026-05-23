const { resolve } = require('path')
const { defineConfig } = require('vitest/config')

const r = p => resolve(__dirname, '../..', p)

module.exports = defineConfig({
  resolve: {
    alias: {
      compiler: r('src/compiler'),
      core: r('src/core'),
      server: r('packages/server-renderer/src'),
      sfc: r('packages/compiler-sfc/src'),
      shared: r('src/shared'),
      web: r('src/platforms/web'),
      v3: r('src/v3'),
      vue: r('src/platforms/web/entry-runtime-with-compiler'),
      types: r('src/types')
    }
  },
  define: {
    __DEV__: true,
    __TEST__: true,
    'process.env.CI': JSON.stringify(process.env.CI || '')
  },
  test: {
    globals: true,
    include: ['test/transition/*.spec.ts'],
    setupFiles: r('test/transition/vitest.setup.ts'),
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        {
          browser: 'chromium',
          launch: {
            args: ['--no-sandbox', '--disable-dev-shm-usage']
          }
        }
      ]
    }
  }
})

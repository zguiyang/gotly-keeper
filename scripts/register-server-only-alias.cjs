/* eslint-disable @typescript-eslint/no-require-imports */
const Module = require('node:module')
const path = require('node:path')

const emptyServerOnlyModule = path.join(
  process.cwd(),
  'node_modules/next/dist/compiled/server-only/empty.js'
)

const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function resolveServerOnlyAlias(request, parent, isMain, options) {
  if (request === 'server-only') {
    return emptyServerOnlyModule
  }

  return originalResolveFilename.call(this, request, parent, isMain, options)
}
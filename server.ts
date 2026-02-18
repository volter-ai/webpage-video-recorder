import { watch } from 'fs'
import { join } from 'path'

const PUBLIC_DIR = join(import.meta.dir, 'public')
const BUNDLE_PATH = join(PUBLIC_DIR, 'bundle.js')

// Build the React app
async function buildApp() {
  console.log('🔨 Building React app...')
  const result = await Bun.build({
    entrypoints: ['./src/index.tsx'],
    outdir: './public',
    naming: 'bundle.js',
    minify: false,
    sourcemap: 'external',
  })

  if (!result.success) {
    console.error('❌ Build failed:')
    for (const log of result.logs) {
      console.error(log)
    }
    return false
  }

  console.log('✅ Build complete!')
  return true
}

// Initial build
await buildApp()

// Watch for changes in development
if (process.env.NODE_ENV !== 'production') {
  console.log('👀 Watching for changes...')

  watch('./src', { recursive: true }, async (event, filename) => {
    console.log(`📝 File changed: ${filename}`)
    await buildApp()
  })
}

// Start the Bun server with console: true
const server = Bun.serve({
  port: 8080,
  development: {
    console: true, // This enables frontend console logs to appear in backend!
  },
  async fetch(req) {
    const url = new URL(req.url)

    // Serve the bundle
    if (url.pathname === '/bundle.js') {
      return new Response(Bun.file(BUNDLE_PATH))
    }

    // Serve the bundle source map
    if (url.pathname === '/bundle.js.map') {
      return new Response(Bun.file(join(PUBLIC_DIR, 'bundle.js.map')))
    }

    // Serve index.html for all other routes
    return new Response(Bun.file(join(PUBLIC_DIR, 'index.html')), {
      headers: { 'Content-Type': 'text/html' }
    })
  },
})

console.log(`🚀 Bun server running at http://localhost:${server.port}`)
console.log(`🖥️  Frontend console.log() will appear here in the terminal!`)

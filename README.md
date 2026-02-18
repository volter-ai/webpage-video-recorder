# Bun 1.3.1 Boilerplate

A **true Bun boilerplate** using Bun's native development server, bundler, and the revolutionary `console: true` feature that pipes frontend console logs to your backend terminal.

## 🚀 Features

- ⚡️ **Bun 1.3.1** - Lightning-fast JavaScript runtime
- 🔥 **Native Bun Dev Server** - No Vite, no Webpack, pure Bun
- 🖥️ **`console: true`** - Frontend `console.log()` appears in backend terminal!
- ⚛️ **React 19** - Latest React with hooks
- 🎨 **TypeScript** - Full type safety
- 📦 **Native Bun Bundler** - Fast builds with `Bun.build()`
- 🔄 **Hot Reload** - File watching with automatic rebuilds

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yueranyuan/bun-boilerplate.git
cd bun-boilerplate

# Install dependencies
bun install
```

## 🛠️ Usage

### Development

```bash
bun run dev
```

This starts the Bun dev server at `http://localhost:3000` with:
- Hot reload watching `src/` directory
- Frontend console logs piped to terminal
- Source maps for debugging

### Production Build

```bash
bun run build
bun run start
```

### Deploy to Subscribe.dev

Deploy your app to production with one command:

```bash
# Build first
bun run build

# Deploy (requires Subscribe.dev platform API key)
SUBSCRIBE_DEV_PLATFORM_API_KEY=sdp_xxx bun run deploy
```

Get your platform API key from [Subscribe.dev Dashboard](https://subscribe.dev)

**What happens:**
1. Creates a ZIP bundle from your `public/` folder
2. Uploads to Subscribe.dev via S3
3. Deploys with deterministic project-based URL
4. Returns your live URL (e.g., `https://abc123.apps.subscribe.dev`)

The deployment script (`deploy.ts`) uses the same robust S3 upload flow that the Subscribe.dev dashboard uses, ensuring proper file extraction and serving.

## 🎯 The `console: true` Feature

The killer feature of Bun 1.3.1 is `development: { console: true }` in `Bun.serve()`.

**What it does:**
- All `console.log()`, `console.error()`, etc. from your **frontend React code**
- Automatically appear in your **backend terminal**
- Perfect for debugging without opening browser DevTools

**Example:**
```typescript
// In your React component
console.log('Button clicked!', someData)
```

**You'll see in terminal:**
```
[Frontend] Button clicked! { count: 5 }
```

## 📁 Project Structure

```
bun-boilerplate/
├── src/
│   ├── App.tsx          # Main React component
│   └── index.tsx        # React entry point
├── public/
│   ├── index.html       # HTML template
│   └── bundle.js        # Built bundle (generated)
├── server.ts            # Bun dev server with console: true
├── package.json
└── tsconfig.json
```

## 🔧 How It Works

1. **`server.ts`** - Bun server with `Bun.serve()` and `development: { console: true }`
2. **`Bun.build()`** - Native bundler compiles React/TypeScript to `public/bundle.js`
3. **File watcher** - Watches `src/` and rebuilds on changes
4. **Console proxying** - Frontend logs forwarded to backend terminal

## 🆚 Why Not Vite?

**Vite** is great, but it's not a "Bun boilerplate" - it's a Node.js tool that happens to work with Bun as a package manager.

**This boilerplate** uses:
- ✅ Bun's native dev server
- ✅ Bun's native bundler
- ✅ Bun-specific features like `console: true`
- ✅ Pure Bun runtime (no Node.js dependencies)

## 📚 Learn More

- [Bun Documentation](https://bun.sh/docs)
- [Bun.serve() API](https://bun.sh/docs/api/http)
- [Bun.build() API](https://bun.sh/docs/bundler)
- [React Documentation](https://react.dev)

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! This is meant to be a minimal, clean starting point for Bun + React projects.

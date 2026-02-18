# Deployment Guide

This boilerplate includes a built-in deployment script that deploys your app to Subscribe.dev using the proper ZIP upload flow.

## Quick Start

```bash
# 1. Build your app
bun run build

# 2. Deploy to Subscribe.dev
SUBSCRIBE_DEV_PLATFORM_API_KEY=sdp_xxx bun run deploy
```

## Get Your API Key

1. Sign up at [Subscribe.dev](https://subscribe.dev)
2. Get your platform API key from the dashboard
3. Use it in the deployment command

## What Happens During Deployment

The `deploy.ts` script:

1. **Creates a ZIP bundle** from your `public/` folder
2. **Uploads to S3** using presigned URLs
3. **Deploys via domain-handler** using the same flow as the dashboard
4. **Returns a live URL** (e.g., `https://abc123.apps.subscribe.dev`)

## Deployment Script Details

**File:** `deploy.ts` (190 lines / 5KB)

**Key Features:**
- ✅ Uses S3 upload flow (same as dashboard)
- ✅ Proper ZIP extraction and file serving
- ✅ Automatic project naming from `package.json`
- ✅ Deterministic project-based URLs
- ✅ Binary-safe (no base64 corruption)

**Dependencies:**
- `@subscribe.dev/sdk` - Platform SDK for API calls
- `jszip` - ZIP file creation

## How It Works

### Step 1: Create ZIP Bundle
```typescript
const zip = new JSZip()
zip.file('index.html', indexContent)
zip.file('bundle.js', bundleContent)
const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
```

### Step 2: Get S3 Upload URL
```typescript
const { uploadUrl, downloadUrl } = await getUploadUrls(
  projectApiKey,
  platformJwt,
  'bundle.zip',
  'application/zip'
)
```

### Step 3: Upload to S3
```typescript
await fetch(uploadUrl, {
  method: 'PUT',
  body: zipBuffer,
  headers: { 'Content-Type': 'application/zip' }
})
```

### Step 4: Deploy from S3 URL
```typescript
await fetch(`${DOMAIN_HANDLER_URL}/upload`, {
  method: 'POST',
  body: JSON.stringify({
    url: downloadUrl,
    projectToken: projectId,
    useProject: true
  })
})
```

## Why ZIP Upload?

The Platform SDK's `deployments.upload()` method only works for HTML/text content. For multi-file deployments (HTML + JS + assets), you need to use the ZIP upload flow that the dashboard uses.

**ZIP Upload Benefits:**
- Proper file separation (HTML, JS, CSS, images)
- No base64 encoding overhead
- Binary-safe (no corruption)
- Supports any file type
- Industry standard

## Customization

You can customize the deployment by modifying `deploy.ts`:

**Change project name:**
```typescript
const project = await sdk.projects.create({
  name: 'my-custom-name',  // Instead of reading from package.json
  type: 'production'
})
```

**Add more files to ZIP:**
```typescript
async function createZipFromDist(distPath: string): Promise<Buffer> {
  const zip = new JSZip()

  // Add index.html
  const indexContent = await readFile(join(distPath, 'index.html'), 'utf-8')
  zip.file('index.html', indexContent)

  // Add bundle.js
  const bundleContent = await readFile(join(distPath, 'bundle.js'), 'utf-8')
  zip.file('bundle.js', bundleContent)

  // Add CSS
  const cssContent = await readFile(join(distPath, 'styles.css'), 'utf-8')
  zip.file('styles.css', cssContent)

  // Add images
  const logoBuffer = await readFile(join(distPath, 'logo.png'))
  zip.file('logo.png', logoBuffer)

  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
}
```

## Troubleshooting

**Error: Missing SUBSCRIBE_DEV_PLATFORM_API_KEY**
- Make sure you set the environment variable
- Get your API key from Subscribe.dev dashboard

**Error: Failed to upload to S3**
- Check your internet connection
- Ensure the ZIP file is not corrupted
- Try again (S3 presigned URLs expire)

**Error: Deployment failed**
- Check that your `public/` folder exists
- Ensure `index.html` and `bundle.js` are built
- Run `bun run build` first

**Files not served correctly**
- The deployment script handles ZIP extraction automatically
- Files are served at their relative paths (e.g., `/bundle.js`)
- Check the deployment URL in your browser

## Example Output

```
🚀 Deploying to Subscribe.dev with ZIP upload...

🏗️  Creating project...
✅ Project created: 1c8f9720-6095-437f-b712-3a5920814984

📦 Creating ZIP bundle...
✅ ZIP created: 117KB

🔗 Getting S3 upload URL...
✅ Upload URL obtained

📤 Uploading ZIP to S3...
✅ ZIP uploaded to S3

🚀 Deploying from S3...
✅ Deployed successfully!

🌐 Your app is live at: https://1c8f97206095437fb7123a5920814984.apps.subscribe.dev
📋 Project ID: 1c8f9720-6095-437f-b712-3a5920814984
🔑 Project API Key: pub_xxx...
```

## Further Reading

- [Subscribe.dev Documentation](https://subscribe.dev/docs)
- [Platform SDK API Reference](https://subscribe.dev/docs/sdk)
- [Deployment Best Practices](https://subscribe.dev/docs/deployment)

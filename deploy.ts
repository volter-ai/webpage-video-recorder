#!/usr/bin/env bun
/**
 * Deploy to Subscribe.dev using ZIP upload with S3 flow
 * This mimics how the dashboard deploys applications
 * Usage: SUBSCRIBE_DEV_PLATFORM_API_KEY=sdp_xxx bun run deploy
 */

import { SubscribeDevSDK } from '@subscribe.dev/sdk'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import JSZip from 'jszip'

const API_KEY = process.env.SUBSCRIBE_DEV_PLATFORM_API_KEY
const DOMAIN_HANDLER_URL = 'https://apps.subscribe.dev'

if (!API_KEY) {
  console.error('❌ Missing SUBSCRIBE_DEV_PLATFORM_API_KEY environment variable')
  process.exit(1)
}

async function createZipFromDist(distPath: string): Promise<Buffer> {
  const zip = new JSZip()

  // Read index.html
  const indexPath = join(distPath, 'index.html')
  if (existsSync(indexPath)) {
    const indexContent = await readFile(indexPath, 'utf-8')
    zip.file('index.html', indexContent)
  }

  // Read bundle.js
  const bundlePath = join(distPath, 'bundle.js')
  if (existsSync(bundlePath)) {
    const bundleContent = await readFile(bundlePath, 'utf-8')
    zip.file('bundle.js', bundleContent)
  }

  // Generate ZIP buffer
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })

  return zipBuffer
}

interface UploadUrlResponse {
  uploadUrl: string
  downloadUrl: string
  fileId: string
  expiresIn: number
}

interface DeploymentResponse {
  url: string
  id: string
}

async function getUploadUrls(
  projectApiKey: string,
  platformJwt: string,
  filename: string,
  contentType: string
): Promise<UploadUrlResponse> {
  const response = await fetch(`${DOMAIN_HANDLER_URL}/upload-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${projectApiKey}`,
      'x-user-token': platformJwt,
      'Content-Type': 'application/json',
      'User-Agent': 'BunClock-Deploy/1.0'
    },
    body: JSON.stringify({
      filename,
      contentType,
      projectToken: projectApiKey
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to get upload URL: ${error.error?.message || response.statusText}`)
  }

  return await response.json()
}

async function uploadToS3(uploadUrl: string, zipBuffer: Buffer): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: zipBuffer,
    headers: {
      'Content-Type': 'application/zip',
      'x-amz-server-side-encryption': 'AES256'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to upload to S3: ${response.status} ${response.statusText}`)
  }
}

async function deployFromUrl(
  projectApiKey: string,
  platformJwt: string,
  downloadUrl: string,
  projectId: string
): Promise<DeploymentResponse> {
  const response = await fetch(`${DOMAIN_HANDLER_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${projectApiKey}`,
      'x-user-token': platformJwt,
      'Content-Type': 'application/json',
      'User-Agent': 'BunClock-Deploy/1.0'
    },
    body: JSON.stringify({
      url: downloadUrl,
      projectToken: projectId,
      useProject: true
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Deployment failed: ${error.error?.message || response.statusText}`)
  }

  return await response.json()
}

async function deploy() {
  console.log('🚀 Deploying to Subscribe.dev with ZIP upload...\n')

  // Initialize SDK
  const sdk = new SubscribeDevSDK({ apiKey: API_KEY })

  // Get project name from package.json or use default
  let projectName = 'bun-app'
  try {
    const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'))
    projectName = packageJson.name || projectName
  } catch (e) {
    // Use default if package.json not found
  }

  // Create project
  console.log('🏗️  Creating project...')
  const project = await sdk.projects.create({
    name: projectName,
    type: 'production'
  })
  console.log(`✅ Project created: ${project.id}\n`)

  // Create ZIP from dist folder
  console.log('📦 Creating ZIP bundle...')
  const zipBuffer = await createZipFromDist('./public')
  console.log(`✅ ZIP created: ${Math.round(zipBuffer.length / 1024)}KB\n`)

  // Get platform JWT (we'll use the platform API key as the JWT for now)
  // In production, the platform API would decode the platform key and create a proper JWT
  const platformJwt = API_KEY

  // Step 1: Get presigned upload URLs
  console.log('🔗 Getting S3 upload URL...')
  const { uploadUrl, downloadUrl } = await getUploadUrls(
    project.apiKey,
    platformJwt,
    'bundle.zip',
    'application/zip'
  )
  console.log(`✅ Upload URL obtained\n`)

  // Step 2: Upload ZIP to S3
  console.log('📤 Uploading ZIP to S3...')
  await uploadToS3(uploadUrl, zipBuffer)
  console.log(`✅ ZIP uploaded to S3\n`)

  // Step 3: Deploy from S3 URL
  console.log('🚀 Deploying from S3...')
  const deployment = await deployFromUrl(
    project.apiKey,
    platformJwt,
    downloadUrl,
    project.id
  )

  console.log(`✅ Deployed successfully!\n`)
  console.log(`🌐 Your app is live at: ${deployment.url}`)
  console.log(`📋 Project ID: ${project.id}`)
  console.log(`🔑 Project API Key: ${project.apiKey}\n`)
}

deploy().catch(error => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})

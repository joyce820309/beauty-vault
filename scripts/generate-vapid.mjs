// Run: node scripts/generate-vapid.mjs
// Outputs VAPID public/private keys to paste into .env and Supabase secrets

import { webcrypto } from 'node:crypto'

const { subtle } = webcrypto

async function generateVapidKeys() {
  const keyPair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  const publicKeyBuffer = await subtle.exportKey('raw', keyPair.publicKey)
  const privateKeyBuffer = await subtle.exportKey('pkcs8', keyPair.privateKey)

  const publicKey = Buffer.from(publicKeyBuffer).toString('base64url')
  const privateKey = Buffer.from(privateKeyBuffer).toString('base64url')

  console.log('\n✅ VAPID Keys Generated\n')
  console.log('Add to your .env:')
  console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`)
  console.log('')
  console.log('Add to Supabase Edge Function Secrets:')
  console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
  console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
  console.log(`VAPID_SUBJECT=mailto:${process.env.npm_package_author_email ?? 'your@email.com'}`)
  console.log('')
}

generateVapidKeys().catch(console.error)

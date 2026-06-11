// Supabase Edge Function: notify-expiry
// 排程觸發（每天一次），掃描快到期品項並發送 Web Push

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')! // mailto:xxx

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── VAPID JWT & Web Push helpers ────────────────────────────────────────────

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  return Uint8Array.from([...binary].map((c) => c.charCodeAt(0)))
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  }

  const encode = (obj: unknown) =>
    uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(obj)))

  const signingInput = `${encode(header)}.${encode(payload)}`

  const privateKeyBytes = base64urlToUint8Array(VAPID_PRIVATE_KEY)
  // VAPID private key from our generator is PKCS8 DER
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${uint8ArrayToBase64url(new Uint8Array(signature))}`
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: { title: string; body: string; url?: string }
) {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await buildVapidJwt(audience)

  // Encrypt payload using Web Push encryption (RFC 8291 / aes128gcm)
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))

  // Generate ephemeral ECDH key pair
  const localKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeys.publicKey)
  )

  // Import subscriber public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    base64urlToUint8Array(p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeys.privateKey,
    256
  )

  const authBytes = base64urlToUint8Array(auth)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF PRK (auth secret)
  const prkKey = await crypto.subtle.importKey(
    'raw', authBytes, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']
  )
  const authInfo = new TextEncoder().encode('WebPush: info\0')
  const authInfoBytes = new Uint8Array([
    ...authInfo,
    ...base64urlToUint8Array(p256dh),
    ...localPublicKey,
  ])
  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(sharedBits), info: authInfoBytes },
    prkKey,
    256
  )

  // HKDF CEK and nonce
  const prkCryptoKey = await crypto.subtle.importKey(
    'raw', prk, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']
  )
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0')
  const cek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
    prkCryptoKey,
    128
  )
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0')
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkCryptoKey,
    96
  )

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey(
    'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
  )
  const paddedPayload = new Uint8Array([...payloadBytes, 2]) // delimiter
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  )

  // Build aes128gcm content-encoding header
  // salt (16) + rs (4) + keyid_len (1) + keyid (65)
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  const header = new Uint8Array([...salt, ...rs, localPublicKey.length, ...localPublicKey])
  const body = new Uint8Array([...header, ...new Uint8Array(ciphertext)])

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body,
  })

  return response
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  let sent = 0
  let failed = 0

  // 取出所有推播訂閱
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (subErr || !subs?.length) {
    return Response.json({ ok: true, message: 'no subscriptions', sent: 0 })
  }

  // 取出所有未丟棄、有到期日的品項（所有用戶共用；如需 per-user 需擴充）
  const { data: items } = await supabase
    .from('items')
    .select('id, name_zh, name_en, exp_date')
    .not('exp_date', 'is', null)
    .neq('disposal_status', 'disposed')

  if (!items?.length) {
    return Response.json({ ok: true, message: 'no items with expiry', sent: 0 })
  }

  // 通知設定（從第一筆 subscription 的 metadata 讀；目前是單用戶 app，直接讀 localStorage key 不可行，
  // 改用預設值：7 天前 & 0 天前各檢查一次）
  const CHECK_DAYS = [0, 3, 7, 14, 30]

  const matchingItems = items.filter((item) => {
    const exp = new Date(item.exp_date!)
    const diffMs = exp.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    return CHECK_DAYS.includes(diffDays)
  })

  if (!matchingItems.length) {
    return Response.json({ ok: true, message: 'no items match today', sent: 0 })
  }

  for (const item of matchingItems) {
    const exp = new Date(item.exp_date!)
    const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const name = item.name_zh || item.name_en || '品項'
    const label = diffDays === 0 ? '今日到期' : `${diffDays} 天後到期`
    const payload = {
      title: `⏰ 即將到期：${name}`,
      body: `${name} 將在 ${label}，記得確認！`,
      url: `/items/${item.id}`,
    }

    for (const sub of subs) {
      try {
        const res = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, payload)
        if (res.status === 410 || res.status === 404) {
          // 訂閱已失效，清除
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        } else if (res.ok) {
          sent++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
  }

  return Response.json({
    ok: true,
    date: todayStr,
    itemsChecked: matchingItems.length,
    sent,
    failed,
  })
})

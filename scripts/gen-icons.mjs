// 用 Node canvas 產生 PWA icon，需要 npm i -D canvas
// 若 canvas 安裝失敗（需要 native build），改用 SVG 佔位即可
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // 圓角矩形背景
  const radius = size * 0.22
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fillStyle = '#C4768A'
  ctx.fill()

  // 文字
  ctx.fillStyle = 'white'
  ctx.font = `${size * 0.5}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('✦', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

writeFileSync('public/pwa-192x192.png', generateIcon(192))
writeFileSync('public/pwa-512x512.png', generateIcon(512))
console.log('Icons generated.')

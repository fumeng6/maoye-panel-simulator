<template>
  <div class="background-scene" :class="mode" aria-hidden="true"><canvas ref="canvas" /></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({ mode: { type: String, default: 'clouds' } })
const canvas = ref(null)
const pointer = { x: .5, y: .5, targetX: .5, targetY: .5 }
const points = Array.from({ length: 90 }, (_, i) => ({ x: (i * .61803398875) % 1, y: (i * .41421356237) % 1, phase: i * 2.37, size: .8 + i % 4 * .35 }))
let context, width = 0, height = 0, frame = 0, lastFrame = 0, elapsed = 0
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const rgba = (color, opacity) => `rgba(${color},${opacity})`
function move(event) { pointer.targetX = event.clientX / innerWidth; pointer.targetY = event.clientY / innerHeight }
function leave() { pointer.targetX = pointer.targetY = .5 }
function resize() {
  width = innerWidth; height = innerHeight
  const scale = Math.min(devicePixelRatio || 1, 1.5)
  canvas.value.width = Math.round(width * scale); canvas.value.height = Math.round(height * scale)
  context.setTransform(scale, 0, 0, scale, 0, 0)
  visibility()
}
function glow(x, y, radius, color, opacity) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, rgba(color, opacity)); gradient.addColorStop(1, rgba(color, 0))
  context.fillStyle = gradient; context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}
function clouds(t, blue, gold, dark, dx, dy) {
  glow(width * .18 + dx * 2, height * .15 + dy, width * .38, blue, dark ? .18 : .10)
  glow(width * .88 - dx, height * .75, width * .32, gold, dark ? .08 : .06)
  // 远山、近水的轮廓缓慢错动，细线给淡色山体增加层次。
  for (let layer = 0; layer < 5; layer++) {
    const baseline = height * (.72 + layer * .055)
    context.beginPath()
    for (let i = 0; i <= 100; i++) {
      const x = width * i / 100
      const y = baseline + Math.sin(i * .08 + layer * 1.9 + t * .025) * height * .045 + Math.sin(i * .19 + layer) * height * .018 + dy * (layer + 1) * .3
      if (!i) context.moveTo(x, y); else context.lineTo(x, y)
    }
    context.lineTo(width, height); context.lineTo(0, height); context.closePath()
    const gradient = context.createLinearGradient(0, baseline - height * .08, 0, height)
    gradient.addColorStop(0, rgba(blue, dark ? .08 : .045)); gradient.addColorStop(1, rgba(blue, dark ? .12 : .07))
    context.fillStyle = gradient; context.fill(); context.strokeStyle = rgba(blue, .10); context.lineWidth = .7; context.stroke()
  }
  for (let band = 0; band < 7; band++) {
    context.beginPath()
    for (let i = 0; i <= 80; i++) {
      const x = width * i / 80
      const y = height * (.06 + band * .023) + Math.sin(i * .065 + t * .05 + band * .25) * height * .055 + dy
      if (!i) context.moveTo(x, y); else context.lineTo(x, y)
    }
    context.strokeStyle = rgba(blue, dark ? .06 : .04); context.lineWidth = band % 3 ? .7 : 1.2; context.stroke()
  }
  for (const p of points.slice(0, 28)) {
    const x = (p.x * width + t * (2 + p.size) + dx + width) % width
    const y = p.y * height + Math.sin(t * .2 + p.phase) * 12
    glow(x, y, 3 + p.size, gold, .16)
  }
}
function stars(t, blue, gold, dark, dx, dy) {
  glow(width * .1 + dx, height * .2, width * .42, blue, dark ? .24 : .13)
  glow(width * .9 - dx, height * .8, width * .34, gold, dark ? .09 : .06)
  const nodes = points.map(p => {
    let x = p.x * width + Math.sin(t * .12 + p.phase) * 10 + dx * p.size
    let y = p.y * height + Math.cos(t * .09 + p.phase) * 12 + dy * p.size
    const distance = Math.hypot(x - pointer.x * width, y - pointer.y * height)
    const influence = Math.max(0, 1 - distance / 180)
    x += (pointer.x * width - x) * influence * .08; y += (pointer.y * height - y) * influence * .08
    return { ...p, x, y, influence }
  })
  const reach = Math.min(190, width * .12)
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j], distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (distance > reach) continue
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y)
      context.strokeStyle = rgba(blue, (1 - distance / reach) * (dark ? .16 : .10) + Math.min(a.influence, b.influence) * .08)
      context.lineWidth = .7; context.stroke()
    }
    const shimmer = .45 + Math.sin(t * .35 + a.phase) * .12
    glow(a.x, a.y, a.size * 4, i % 5 ? blue : gold, shimmer * .35)
    context.beginPath(); context.arc(a.x, a.y, a.size, 0, Math.PI * 2); context.fillStyle = rgba(i % 5 ? blue : gold, shimmer + a.influence * .2); context.fill()
  }
  // 细轨道缓慢转动；鼠标只影响附近的星点，避免大幅追逐。
  context.save(); context.translate(width * .5 + dx, height * .5 + dy); context.rotate(-.2 + Math.sin(t * .025) * .025)
  for (let i = 0; i < 3; i++) { context.beginPath(); context.ellipse(0, 0, width * (.48 + i * .06), height * (.4 + i * .06), 0, 0, Math.PI * 2); context.strokeStyle = rgba(blue, .07); context.lineWidth = .6; context.stroke() }
  context.restore()
}
function leaf(x, y, length, angle, color, opacity) {
  context.save(); context.translate(x, y); context.rotate(angle)
  context.beginPath(); context.moveTo(0, 0); context.quadraticCurveTo(length * .4, -length * .16, length, 0); context.quadraticCurveTo(length * .55, length * .15, 0, 0)
  const gradient = context.createLinearGradient(0, 0, length, 0); gradient.addColorStop(0, rgba(color, opacity)); gradient.addColorStop(1, rgba(color, opacity * .3))
  context.fillStyle = gradient; context.fill(); context.beginPath(); context.moveTo(0, 0); context.lineTo(length * .92, 0); context.strokeStyle = rgba(color, opacity * .5); context.lineWidth = .5; context.stroke(); context.restore()
}
function bamboo(t, green, gold, dark, dx) {
  glow(width * .05, height * .6, width * .4, green, dark ? .14 : .10); glow(width * .95, height * .3, width * .35, green, dark ? .12 : .08)
  for (let side = 0; side < 2; side++) {
    for (let stalk = 0; stalk < 4; stalk++) {
      const anchor = width * (side ? .91 + stalk * .04 : .09 - stalk * .04)
      const opacity = .14 + stalk * .045, sway = Math.sin(t * .16 + stalk * .8 + side) * 7 + dx * .4
      context.beginPath(); context.moveTo(anchor, height + 50); context.quadraticCurveTo(anchor - 14, height * .5, anchor + sway * 4, -50)
      context.strokeStyle = rgba(green, opacity); context.lineWidth = 2 + stalk * .45; context.stroke()
      for (let joint = 0; joint < 6; joint++) {
        const y = height * (.15 + joint * .15), x = anchor + sway * (1 - y / height) * 4
        context.beginPath(); context.moveTo(x - 4, y); context.lineTo(x + 5, y); context.lineWidth = 3; context.stroke()
        for (let branch = 0; branch < 2; branch++) {
          const direction = branch ? -1 : 1
          const tipX = x + direction * (40 + stalk * 8), tipY = y - 18 - joint * 3
          context.beginPath(); context.moveTo(x, y); context.quadraticCurveTo(x + direction * 20, y - 24, tipX, tipY); context.lineWidth = .8; context.stroke()
          for (let n = 0; n < 4; n++) {
            const fraction = .3 + n * .21, tilt = Math.sin(t * .19 + joint + n) * .025
            leaf(x + (tipX - x) * fraction, y + (tipY - y) * fraction, 35 + (joint * 7 + n * 13 + stalk * 9) % 44, (direction > 0 ? -.9 : -2.3) + n * .16 + tilt, green, opacity * .9)
          }
        }
      }
    }
  }
  for (const p of points.slice(0, 18)) {
    const x = p.x * width + Math.sin(t * .08 + p.phase) * 24
    const y = (p.y * height + t * (3 + p.size)) % (height + 60) - 30
    leaf(x, y, 8 + p.size * 2, .6 + Math.sin(t * .12 + p.phase) * .25, p.phase % 2 > 1 ? green : gold, .15)
  }
}
function draw(time) {
  if (document.hidden || width < 1024 || props.mode === 'plain') return
  frame = requestAnimationFrame(draw)
  if (time - lastFrame < 1000 / 30) return
  const delta = Math.min((time - lastFrame) / 1000, .1); lastFrame = time
  elapsed += delta * (reducedMotion.matches ? .3 : 1)
  pointer.x += (pointer.targetX - pointer.x) * .035; pointer.y += (pointer.targetY - pointer.y) * .035
  const dark = document.documentElement.classList.contains('dark')
  const blue = dark ? '143,162,232' : '88,111,176', gold = dark ? '210,179,117' : '184,151,83', green = dark ? '124,169,150' : '77,129,109'
  const amplitude = reducedMotion.matches ? 5 : 12, dx = (pointer.x - .5) * amplitude, dy = (pointer.y - .5) * amplitude
  context.clearRect(0, 0, width, height)
  if (props.mode === 'stars') stars(elapsed, blue, gold, dark, dx, dy)
  else if (props.mode === 'bamboo') bamboo(elapsed, green, gold, dark, dx)
  else clouds(elapsed, blue, gold, dark, dx, dy)
  glow(pointer.x * width, pointer.y * height, Math.min(width * .15, 230), props.mode === 'bamboo' ? green : blue, dark ? .07 : .04)
}
function visibility() {
  cancelAnimationFrame(frame)
  if (!context) return
  context.clearRect(0, 0, width, height)
  if (!document.hidden && width >= 1024 && props.mode !== 'plain') { lastFrame = performance.now(); frame = requestAnimationFrame(draw) }
}
watch(() => props.mode, visibility)
onMounted(() => {
  context = canvas.value.getContext('2d'); if (!context) return
  resize()
  window.addEventListener('resize', resize); window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave); document.addEventListener('visibilitychange', visibility)
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', visibility) })
</script>

<style scoped>
.background-scene{position:absolute;inset:0;overflow:hidden;pointer-events:none;background:var(--app-bg)}
.background-scene canvas{width:100%;height:100%;display:block}
.clouds{background:linear-gradient(150deg,color-mix(in srgb,var(--accent) 8%,var(--app-bg)),var(--app-bg) 48%,color-mix(in srgb,var(--tone-gold) 6%,var(--app-bg)))}
.stars{background:radial-gradient(ellipse at 0% 0%,color-mix(in srgb,var(--accent) 9%,var(--app-bg)),var(--app-bg) 70%)}
.bamboo{background:linear-gradient(110deg,color-mix(in srgb,var(--success) 4%,var(--app-bg)),var(--app-bg) 45%,color-mix(in srgb,var(--success) 5%,var(--app-bg)))}
.plain{background:radial-gradient(ellipse at 10% 10%,color-mix(in srgb,var(--accent) 8%,transparent),transparent 65%),var(--app-bg)}
@media(max-width:1023px){.background-scene{display:none}}
</style>

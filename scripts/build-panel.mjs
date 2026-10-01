import { build } from 'vite'
import { rm, writeFile } from 'node:fs/promises'

// Pages 与网关都保留 /panel/ 路径，直接 Pages 域名也可访问。
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true })
await build({ base: '/panel/', build: { outDir: 'dist/panel' } })
await writeFile(new URL('../dist/_redirects', import.meta.url), '/ /panel/ 302\n/panel /panel/ 301\n')

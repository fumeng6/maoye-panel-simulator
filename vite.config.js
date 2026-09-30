import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 独立小工具，默认部署在 maoye.world 的子路径下。
// 可用 BASE_PATH 环境变量覆盖，例如 BASE_PATH=/panel/ npm run build
const basePath = process.env.BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  plugins: [vue()],
  server: {
    port: 3100,
    host: true
  }
})

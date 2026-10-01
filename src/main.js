import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElButton, ElDialog, ElEmpty, ElIcon, ElInput, ElOption, ElSelect, ElTag } from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './styles.css'

const app = createApp(App)
for (const component of [ElButton, ElDialog, ElEmpty, ElIcon, ElInput, ElOption, ElSelect, ElTag]) app.component(component.name, component)
app.use(createPinia()).mount('#app')

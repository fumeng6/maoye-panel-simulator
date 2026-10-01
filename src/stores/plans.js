import { defineStore } from 'pinia'
import { 整理配置 } from './simulator.js'
const key = 'maoye-panel-plans-v1'
const copy = value => JSON.parse(JSON.stringify(value))
export const usePlansStore = defineStore('plans', {
  state: () => ({ items: [], activeId: '', error: '' }),
  getters: { visible: s => s.items.filter(p => !p.deleted), active: s => s.items.find(p => p.id === s.activeId && !p.deleted) },
  actions: {
    restore() {
      try { const data = JSON.parse(localStorage.getItem(key) || 'null'); if (data) { this.items = data.items; this.activeId = data.activeId } }
      catch { this.error = '本地方案无法读取' }
    },
    persist() {
      try { localStorage.setItem(key, JSON.stringify({ items: this.items, activeId: this.activeId })); this.error = '' }
      catch { this.error = '浏览器无法保存，请导出方案' }
    },
    save(name, config) {
      const plan = { id: crypto.randomUUID(), name: name.trim() || '未命名方案', config: copy(config), updatedAt: new Date().toISOString(), deleted: false }
      this.items.push(plan); this.activeId = plan.id; this.persist(); return plan
    },
    updateCurrent(config) { if (this.active) { this.active.config = copy(config); this.active.updatedAt = new Date().toISOString(); this.persist() } },
    select(id) { this.activeId = id; this.persist() },
    rename(id, name) { const p = this.items.find(p => p.id === id); p.name = name.trim() || p.name; p.updatedAt = new Date().toISOString(); this.persist() },
    remove(id) { const p = this.items.find(p => p.id === id); p.deleted = true; p.updatedAt = new Date().toISOString(); if (this.activeId === id) this.activeId = ''; this.persist() },
    importFile(file) {
      const incoming = file.方案版本 === 1 ? file.方案 : [{ name: '导入配装', config: file }]
      if (!Array.isArray(incoming) || !incoming.length) throw Error('文件中没有可导入的方案')
      const validated = incoming.map(p => ({ name: typeof p.name === 'string' ? p.name : '导入方案', config: { 格式版本: 1, 配置: 整理配置(p.config) } }))
      for (const p of validated) this.items.push({ ...p, id: crypto.randomUUID(), updatedAt: new Date().toISOString(), deleted: false })
      this.persist(); return validated.length
    },
    merge(remote) {
      const merged = new Map(this.items.map(p => [p.id, p]))
      for (const p of remote) {
        if (!p.deleted) 整理配置(p.config)
        const local = merged.get(p.id)
        if (!local || Date.parse(p.updatedAt) > Date.parse(local.updatedAt)) merged.set(p.id, p)
      }
      this.items = [...merged.values()]
      if (!this.active) this.activeId = ''
      this.persist()
    }
  }
})
export function downloadPlans(plans, name = '燕云面板方案') {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ 方案版本: 1, 方案: plans.map(({ name, config }) => ({ name, config })) }, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = `${name}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

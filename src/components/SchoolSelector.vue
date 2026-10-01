<template>
  <el-dialog v-model="schoolOpen" title="选择流派" width="min(540px, 94vw)" class="picker-dialog" append-to-body :close-on-click-modal="false">
    <p class="helper-text">保留通用心法和兼容词条，清除不适用的专属词条。</p>
    <div class="schools-grid">
      <button v-for="school in 流派卡片列表" :key="school.全名" class="school-card" :class="{ selected: chosenSchool === school.全名 }" :aria-pressed="chosenSchool === school.全名" @click="chosenSchool = school.全名">
        <strong>{{ school.全名 }}</strong>
      </button>
    </div>
    <div v-if="chosenConfig" class="requirements">
      <span v-for="requirement in [chosenConfig.五维需求, chosenConfig.属性需求]" :key="requirement.属性">天赋需求：{{ requirement.属性 }} {{ requirement.需求值 }}</span>
      <small>未达到需求时，对应天赋按比例生效。</small>
    </div>
    <template #footer><el-button @click="schoolOpen = false">取消</el-button><el-button type="primary" :disabled="!chosenSchool" @click="confirmSchool">应用流派</el-button></template>
  </el-dialog>
  <el-dialog v-model="heartOpen" title="配置心法" width="min(720px, 94vw)" class="picker-dialog" append-to-body :close-on-click-modal="false">
    <div class="picker-toolbar"><el-input v-model="search" placeholder="搜索心法或属性，例如会心、穿透" clearable /><span>{{ selected.length }} / 4</span></div>
    <div class="selected-books"><el-tag v-for="book in selected" :key="book" :class="qualityClass(book)" closable @close="toggle(book)">{{ book }}</el-tag><span v-if="!selected.length" class="helper-text">点击下方心法选择，最多四本</span></div>
    <div class="book-groups">
      <section v-for="group in groups" :key="group.name" class="book-group">
        <h4>{{ group.name }}</h4>
        <div class="books-grid"><button v-for="book in group.books" :key="book" class="book-card" :class="[qualityClass(book), { selected: selected.includes(book) }]" :aria-pressed="selected.includes(book)" :disabled="selected.length >= 4 && !selected.includes(book)" @click="toggle(book)"><strong>{{ book }}</strong><span>{{ bookCategory(book) }}</span><span>{{ attributes(book) }}</span></button></div>
      </section>
      <p v-if="!groups.length" class="helper-text">没有匹配的心法</p>
    </div>
    <template #footer><el-button @click="selected = []">清空选择</el-button><el-button @click="heartOpen = false">取消</el-button><el-button type="primary" @click="confirmHearts">应用心法</el-button></template>
  </el-dialog>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useSimulatorStore } from '../stores/simulator.js'
import { 流派卡片列表, 取流派配置 } from '../data/schools.js'
import { 心法分组, 心法属性, 心法记录 } from '../data/xinfa.js'
const schoolOpen = defineModel('schoolOpen', { type: Boolean })
const heartOpen = defineModel('heartOpen', { type: Boolean })
const store = useSimulatorStore()
const chosenSchool = ref('')
const search = ref('')
const selected = ref([])
const chosenConfig = computed(() => {
  const school = 流派卡片列表.find(s => s.全名 === chosenSchool.value)
  return school && 取流派配置(school.流派, school.变体)
})
const groups = computed(() => {
  const current = `${store.流派}·${store.变体}`
  return 心法分组.slice().sort((a, b) => Number(b.name === current) - Number(a.name === current))
    .map(g => ({ ...g, books: g.books.filter(n => (n + attributes(n)).includes(search.value.trim())) })).filter(g => g.books.length)
})
function qualityClass(name) { return 'quality-' + ({金色:'gold',紫色:'purple',蓝色:'blue'}[心法记录[name]?.品质] || 'unknown') }
function attributes(name) { return Object.entries(心法属性[name] || {}).map(([key, value]) => `${key} +${value}${/率|加成|增伤|增效/.test(key) ? '%' : ''}`).join(' · ') || '无固定面板加成' }
function bookCategory(name) { const book = 心法记录[name]; return `${book.归属} · ${book.品质 || '品质未记录'}${book.数值覆盖 ? ' · 单独数值' : ''}` }
function toggle(book) {
  if (selected.value.includes(book)) selected.value = selected.value.filter(n => n !== book)
  else if (selected.value.length < 4) selected.value.push(book)
}
function confirmSchool() {
  const school = 流派卡片列表.find(s => s.全名 === chosenSchool.value)
  const removed = store.选择流派(school.流派, school.变体)
  if (removed) ElMessage.info(`已保留通用配置，清除 ${removed} 条不适用词条`)
  schoolOpen.value = false
}
function confirmHearts() { store.设置心法列表(selected.value); heartOpen.value = false }
watch(schoolOpen, open => { if (open) chosenSchool.value = store.流派 + store.变体 })
watch(heartOpen, open => { if (open) { selected.value = [...store.心法列表]; search.value = '' } })
</script>
<style scoped>
.schools-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.school-card{min-height:65px;border:1px solid var(--border);border-radius:8px;background:var(--surface-soft);color:var(--text);cursor:pointer}.school-card strong,.school-card span{display:block}.school-card strong{font-size:14px;margin-bottom:6px}.school-card span{font-size:11px;color:var(--muted)}.school-card.selected{border-color:#667db8;color:var(--accent);background:var(--surface-soft)}.requirements{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:16px;font-size:12px;color:var(--text)}.requirements small{width:100%;color:var(--muted)}.picker-toolbar{display:flex;align-items:center;gap:16px}.picker-toolbar>span{white-space:nowrap}.selected-books{display:flex;gap:6px;flex-wrap:wrap;min-height:44px;align-items:center;padding:10px 0}.book-groups{max-height:48dvh;overflow-y:auto;overscroll-behavior:contain}.book-group{margin-bottom:18px}.book-group h4{color:var(--accent);margin:0 0 8px;font-size:14px}.books-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.book-card{border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--surface);text-align:left;cursor:pointer}.book-card strong{display:block;font-size:14px;margin-bottom:6px}.book-card span{display:block;color:var(--muted);font-size:12px;line-height:1.6}.book-card.selected{outline:2px solid var(--book-color, var(--accent));outline-offset:-2px;background:var(--book-bg, var(--surface-soft))} .book-card strong{color:var(--book-color,var(--text-strong))}.book-card{border-color:var(--book-border,var(--border));background:var(--book-bg,var(--surface))}.book-card:disabled{opacity:.45;cursor:default}
@media(max-width:600px){.schools-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.books-grid{grid-template-columns:1fr}.book-groups{max-height:44dvh}}
</style>

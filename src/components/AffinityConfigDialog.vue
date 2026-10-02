<template>
  <el-dialog :model-value="modelValue" :title="`配置 ${slotName} 词条`" :width="isMobile ? 'calc(100vw - 24px)' : '660px'" :class="['equipment-dialog', { 'mobile-sheet': isMobile }]" append-to-body :close-on-click-modal="false" @update:model-value="emit('update:modelValue', $event)">
    <div ref="slotsList" class="slots-list">
      <div v-for="slot in Object.values(词条槽)" :key="slot" class="slot-row">
        <label class="slot-label"><el-tag :type="slot === '宫' ? 'warning' : slot === '定音' ? 'success' : 'primary'">{{ slot }}</el-tag></label>
        <el-select :model-value="draft[slot]?.名称 || ''" :aria-label="`${slot}词条`" :filterable="!isMobile" clearable :placeholder="slot === '定音' && !unlocked ? '先配置宫商角徵羽' : isMobile ? '选择词条' : '搜索或选择词条'" :disabled="slot === '定音' && !unlocked" @change="changeAttribute(slot, $event)">
          <el-option v-for="name in pool(slot)" :key="name" :label="name" :value="name" :disabled="disabled(slot, name)">
            <span>{{ name }}</span><span class="option-value">{{ 格式化词条(name, 取词条范围(name)[1]) }}</span>
          </el-option>
        </el-select>
        <div class="value-field">
          <input v-model.number="draft[slot].值" type="number" inputmode="decimal" class="number-input" :aria-label="`${slot}数值`" :min="minimum(slot)" :max="maximum(slot)" step="0.01" :disabled="!draft[slot]?.名称" @change="clampValue(slot)" />
          <span class="value-unit">{{ 是百分比词条(draft[slot]?.名称) ? '%' : '' }}</span>
        </div>
      </div>
    </div>
    <div class="edit-actions">
      <el-button :disabled="!canChengyin" @click="toggleChengyin">{{ draft.承音 ? '解除承音' : '应用承音' }}</el-button>
      <el-button :disabled="!filled" @click="fillMax">填满已选词条</el-button>
      <el-button :disabled="!filled" @click="draft = 建空白装备()">清空此部位</el-button>
    </div>
    <div v-if="preview" class="preview-panel">
      <span>应用后外功攻击</span><strong>{{ Math.floor(preview.原始面板.最小外功攻击) }}～{{ Math.floor(preview.原始面板.最大外功攻击) }}</strong>
      <span v-if="delta !== '0 / 0'" class="preview-delta">变化 {{ delta }}</span>
    </div>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button v-if="hasNext" :disabled="Boolean(error)" @click="save(true)">保存并下一件</el-button>
      <el-button type="primary" :disabled="Boolean(error)" @click="save(false)">应用配置</el-button>
    </template>
  </el-dialog>
</template>
<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useSimulatorStore, 建空白装备, 整理装备 } from '../stores/simulator.js'
import { useMediaQuery } from '../composables/useMediaQuery.js'
import { 计算面板 } from '../domain/panel.js'
import { 词条槽, 部位顺序, 调律槽位, 五音槽位, 取词条池, 取词条范围, 取承音值, 是百分比词条, 是属性攻击, 格式化词条 } from '../data/affinities.js'
const props = defineProps({ modelValue: Boolean, slotKey: { type: String, required: true }, slotName: { type: String, required: true } })
const emit = defineEmits(['update:modelValue', 'next'])
const store = useSimulatorStore()
const isMobile = useMediaQuery('(max-width: 1023px)')
const draft = ref(建空白装备())
const slotsList = ref(null)
const unlocked = computed(() => 五音槽位.every(s => draft.value[s]?.名称))
const canChengyin = computed(() => unlocked.value && draft.value.定音.名称)
const filled = computed(() => Object.values(词条槽).some(s => draft.value[s]?.名称))
const hasNext = computed(() => 部位顺序.indexOf(props.slotKey) < 部位顺序.length - 1)
const error = computed(() => {
  if (!props.slotKey) return ''
  try { 整理装备(draft.value, props.slotKey, store.流派, store.变体); return '' }
  catch (e) { return e.message }
})
const preview = computed(() => {
  if (error.value || !store.已选流派) return null
  const equipment = 整理装备(draft.value, props.slotKey, store.流派, store.变体)
  return 计算面板({ ...store.$state, 装备词条: { ...store.装备词条, [props.slotKey]: equipment } })
})
const delta = computed(() => {
  const old = store.面板?.原始面板 || {}
  const after = preview.value?.原始面板 || {}
  return ['最小外功攻击', '最大外功攻击'].map(key => {
    const value = Math.floor(after[key] || 0) - Math.floor(old[key] || 0)
    return value > 0 ? `+${value}` : String(value)
  }).join(' / ')
})
function pool(slot) { return 取词条池(slot, props.slotKey, store.流派, store.变体) }
function disabled(slot, name) {
  if (!调律槽位.includes(slot)) return false
  const other = 调律槽位.filter(s => s !== slot).map(s => draft.value[s].名称)
  return other.includes(name) || (是属性攻击(name) && other.filter(是属性攻击).length >= 2)
}
function clampValue(slot) { if (Number.isFinite(draft.value[slot].值)) draft.value[slot].值 = Math.max(minimum(slot), Math.min(maximum(slot), draft.value[slot].值)) }
function minimum(slot) { return 取词条范围(draft.value[slot]?.名称)[0] }
function maximum(slot) {
  const name = draft.value[slot]?.名称
  return draft.value.承音 && 五音槽位.includes(slot) ? 取承音值(name) : 取词条范围(name)[1]
}
function changeAttribute(slot, name) {
  draft.value[slot] = { 名称: name || '', 值: name ? (draft.value.承音 && 五音槽位.includes(slot) ? 取承音值(name) : 取词条范围(name)[1]) : 0 }
  if (!unlocked.value) { draft.value.定音 = { 名称: '', 值: 0 }; draft.value.承音 = false; delete draft.value.承音前数值 }
}
function fillMax() { for (const slot of Object.values(词条槽)) if (draft.value[slot].名称) draft.value[slot].值 = maximum(slot) }
function toggleChengyin() {
  if (!draft.value.承音) {
    draft.value.承音前数值 = Object.fromEntries(五音槽位.map(s => [s, { ...draft.value[s] }]))
    draft.value.承音 = true
    for (const slot of 五音槽位) draft.value[slot].值 = 取承音值(draft.value[slot].名称)
  } else {
    draft.value.承音 = false
    for (const slot of 五音槽位) {
      const before = draft.value.承音前数值?.[slot]
      if (before?.名称 === draft.value[slot].名称) draft.value[slot].值 = before.值
    }
    delete draft.value.承音前数值
  }
}
function save(next) {
  store.保存部位(props.slotKey, draft.value)
  if (next) emit('next')
  else emit('update:modelValue', false)
}
watch(() => [props.modelValue, props.slotKey], () => {
  if (props.modelValue) {
    draft.value = JSON.parse(JSON.stringify(store.装备词条[props.slotKey] || 建空白装备()))
    nextTick(() => { if (slotsList.value) slotsList.value.parentElement.scrollTop = 0 })
  }
}, { immediate: true })
</script>
<style scoped>
.slots-list { display: flex; flex-direction: column; gap: 16px; }
.slot-row { display: grid; grid-template-columns: 48px minmax(0, 1fr) 138px; align-items: start; gap: 10px; }
.slot-label { padding-top: 4px; }
.value-field { display: grid; grid-template-columns: minmax(0, 1fr) 14px; align-items: center; gap: 4px; }
.number-input { background:var(--surface); width: 100%; min-height: 34px; border: 1px solid var(--color-border-base); border-radius: 4px; padding: 6px 10px; color: var(--color-text-primary); font: inherit; font-size: 14px; }
.number-input:disabled { background: var(--color-bg-secondary); color: var(--color-text-secondary); }
.number-input:focus { outline: 1px solid var(--color-primary); border-color: var(--color-primary); }
.value-field small { grid-column: 1 / -1; font-size: 11px; color: var(--color-text-secondary); text-align: center; margin-top: 2px; }
.value-unit { font-size: 12px; }
.option-value { float: right; margin-left: 14px; color: var(--color-text-secondary); font-size: 12px; }
.edit-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 18px; }
.edit-actions .el-button { margin-left: 0; }
.preview-panel { display: flex; gap: 10px; align-items: center; padding: 14px; border-radius: 8px; background: var(--color-bg-secondary); margin-top: 16px; font-size: 13px; flex-wrap: wrap; }
.preview-delta { color: var(--color-primary); font-size: 12px; }
.error-text { font-size: 13px; color: #b93a3a; }
@media (max-width: 1023px) {
  .slots-list { gap:12px }
  .slot-row { grid-template-columns:32px minmax(0,1fr) 84px; align-items:center; gap:6px }
  .slot-label { padding-top:0 }.slot-label .el-tag { padding:0 5px }
  .value-field { grid-template-columns:minmax(0,1fr) 10px; gap:2px }
  .number-input { min-height:36px; padding:6px; font-size:16px }
  .edit-actions { gap:6px; padding-top:16px }.edit-actions .el-button { padding:8px; font-size:12px }
  .preview-panel { padding:10px; gap:6px; font-size:12px }
}
</style>



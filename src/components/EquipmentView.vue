<template>
  <div class="equipment-view">
    <div class="view-header">
      <h3>装备配置</h3>
    </div>
    <div class="part-tabs">
      <button
        v-for="部位 in 部位顺序"
        :key="部位"
        class="tab"
        :class="{ active: 当前部位 === 部位, filled: 已填数量(部位) > 0 }"
        @click="当前部位 = 部位"
      >
        {{ 部位 }}
        <span v-if="已填数量(部位)" class="dot">{{ 已填数量(部位) }}</span>
      </button>
    </div>

    <el-scrollbar class="equip-scroll">
      <div v-if="!store.已选流派" class="empty-hint">请先选择流派</div>
      <div v-else class="slots">
        <div v-for="槽位 in 全部槽位" :key="槽位" class="slot-card">
          <div class="slot-head">
            <span class="slot-label" :class="{ dingyin: 槽位 === 词条槽.定音 }">
              {{ 槽位 }}
            </span>
            <span class="slot-hint">{{ 槽位提示(槽位) }}</span>
          </div>
          <button class="slot-main" :class="{ filled: 有词条(当前部位, 槽位) }" @click="打开选择(槽位)">
            <span class="slot-name">{{ 词条名称(当前部位, 槽位) || '点击选择词条' }}</span>
            <span class="slot-target">›</span>
          </button>
          <div v-if="有词条(当前部位, 槽位)" class="slot-value">
            <el-input-number
              :model-value="词条值(当前部位, 槽位)"
              size="small"
              :min="范围(当前部位, 槽位)[0]"
              :max="范围(当前部位, 槽位)[1]"
              :step="步长(当前部位, 槽位)"
              :precision="精度(当前部位, 槽位)"
              :controls="false"
              class="value-input"
              @update:model-value="(v) => store.设置词条值(当前部位, 槽位, v)"
            />
          </div>
        </div>
      </div>
    </el-scrollbar>

    <SlotPicker
      v-model:visible="选择器可见"
      :部位="当前部位"
      :槽位="选择槽位"
      :候选="当前候选"
      :已选="词条名称(当前部位, 选择槽位)"
      :占用集="已占用词条"
      @select="(v) => store.设置词条(当前部位, 选择槽位, v)"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { 部位顺序, 词条槽, 调律槽位, 取词条范围, 是百分比词条 } from '../data/affinities.js'
import SlotPicker from './SlotPicker.vue'

const store = useSimulatorStore()
const 当前部位 = ref(部位顺序[0])
const 选择器可见 = ref(false)
const 选择槽位 = ref('')

const 全部槽位 = [词条槽.宫, ...调律槽位, 词条槽.定音]

const 当前候选 = computed(() => store.取可选词条(当前部位.value, 选择槽位.value))

const 已占用词条 = computed(() =>
  调律槽位
    .filter((s) => s !== 选择槽位.value)
    .map((s) => 词条名称(当前部位.value, s))
    .filter(Boolean)
)

function 打开选择(槽位) {
  选择槽位.value = 槽位
  选择器可见.value = true
}

function 词条名称(部位, 槽位) {
  return store.装备词条[部位]?.[槽位]?.名称 || ''
}
function 有词条(部位, 槽位) {
  return Boolean(词条名称(部位, 槽位))
}
function 词条值(部位, 槽位) {
  return store.装备词条[部位][槽位].值
}
function 范围(部位, 槽位) {
  const 名称 = 词条名称(部位, 槽位)
  return 名称 ? 取词条范围(名称) : [0, 1]
}
function 步长(部位, 槽位) {
  const 名称 = 词条名称(部位, 槽位)
  return 名称 && 是百分比词条(名称) ? 0.001 : 0.1
}
function 精度(部位, 槽位) {
  const 名称 = 词条名称(部位, 槽位)
  return 名称 && 是百分比词条(名称) ? 3 : 1
}
function 已填数量(部位) {
  return 全部槽位.filter((s) => 词条名称(部位, s)).length
}
function 槽位提示(槽位) {
  if (槽位 === 词条槽.宫) return '初始固定'
  if (槽位 === 词条槽.定音) return '五音调律后解锁'
  return '可调律 / 转律'
}
</script>

<style scoped>
.equipment-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 16px 0;
}
.view-header {
  padding-bottom: 12px;
}
.view-header h3 {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: 600;
}
.part-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-light);
}
.tab {
  position: relative;
  border: 1px solid var(--color-border-base);
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 6px 12px;
  font-size: var(--font-size-md);
  color: var(--color-text-regular);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.tab.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.tab.filled:not(.active) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.dot {
  display: inline-block;
  margin-left: 4px;
  font-size: var(--font-size-sm);
  opacity: 0.85;
}
.equip-scroll {
  flex: 1;
  min-height: 0;
}
.equip-scroll :deep(.el-scrollbar__view) {
  padding: 12px 0 16px;
}
.slots {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.slot-card {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  background: #fff;
  transition: box-shadow 0.2s;
}
.slot-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.slot-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.slot-label {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 28px;
}
.slot-label.dingyin {
  color: var(--color-warning);
}
.slot-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.slot-main {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px dashed var(--color-border-base);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.slot-main.filled {
  border-style: solid;
  border-color: var(--color-primary);
  background: #fff;
  color: var(--color-text-primary);
}
.slot-main:hover {
  border-color: var(--color-primary);
}
.slot-target {
  color: var(--color-primary);
  font-size: 18px;
}
.slot-value {
  margin-top: 8px;
}
.value-input {
  width: 140px;
}

@media (min-width: 1024px) {
  .slots {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

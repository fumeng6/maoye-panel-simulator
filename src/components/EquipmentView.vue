<template>
  <div class="equipment-view">
    <div class="equip-head">
      <div class="tabs">
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
            <span class="value-range">范围 {{ 范围文本(当前部位, 槽位) }}</span>
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
import {
  部位顺序,
  词条槽,
  调律槽位,
  取词条范围,
  是百分比词条
} from '../data/affinities.js'
import SlotPicker from './SlotPicker.vue'

const store = useSimulatorStore()
const 当前部位 = ref(部位顺序[0])
const 选择器可见 = ref(false)
const 选择槽位 = ref('')

const 全部槽位 = [词条槽.宫, ...调律槽位, 词条槽.定音]

const 当前候选 = computed(() =>
  store.取可选词条(当前部位.value, 选择槽位.value)
)

/** 同部位其他调律槽已占用的词条 */
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

function 范围文本(部位, 槽位) {
  const 名称 = 词条名称(部位, 槽位)
  if (!名称) return '-'
  const [min, max] = 取词条范围(名称)
  if (是百分比词条(名称)) {
    return `${(min * 100).toFixed(1)}% ~ ${(max * 100).toFixed(1)}%`
  }
  return `${min} ~ ${max}`
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
  display: flex;
  flex-direction: column;
  height: 100%;
}
.equip-head {
  border-bottom: 1px solid var(--border);
  padding: 10px 16px;
  overflow-x: auto;
}
.tabs {
  display: flex;
  gap: 6px;
  min-width: max-content;
}
.tab {
  position: relative;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  white-space: nowrap;
}
.tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.tab.filled:not(.active) {
  border-color: var(--accent);
  color: var(--accent);
}
.dot {
  display: inline-block;
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.8;
}
.equip-scroll {
  flex: 1;
  min-height: 0;
}
.equip-scroll :deep(.el-scrollbar__view) {
  padding: 16px;
}
.slots {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.slot-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
}
.slot-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.slot-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  min-width: 28px;
}
.slot-label.dingyin {
  color: var(--accent);
}
.slot-hint {
  font-size: 11px;
  color: var(--text-soft);
}
.slot-main {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px dashed var(--border);
  background: #faf8f4;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-soft);
  cursor: pointer;
}
.slot-main.filled {
  border-style: solid;
  background: #fff;
  color: var(--text);
}
.slot-target {
  color: var(--accent);
  font-size: 18px;
}
.slot-value {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.value-input {
  width: 130px;
}
.value-range {
  font-size: 12px;
  color: var(--text-soft);
}

/* 宽屏时槽位两列 */
@media (min-width: 1024px) {
  .slots {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

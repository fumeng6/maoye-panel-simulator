<template>
  <div class="loadout-view">
    <div class="view-header">
      <h3>流派与心法</h3>
    </div>
    <el-scrollbar class="view-content">
      <div class="block">
        <div class="block-title">流派</div>
        <div class="chip-row">
          <button
            v-for="s in 流派列表"
            :key="s.流派"
            class="chip"
            :class="{ active: store.流派 === s.流派 }"
            @click="选流派(s.流派)"
          >
            {{ s.流派 }}
          </button>
        </div>
        <div v-if="store.流派" class="chip-row variant">
          <button
            v-for="v in 变体列表"
            :key="v"
            class="chip small"
            :class="{ active: store.变体 === v }"
            @click="选变体(v)"
          >
            {{ v }}
          </button>
        </div>
      </div>

      <div class="block">
        <div class="block-title">心法（最多 4 本）</div>
        <div class="picked">
          <span
            v-for="x in store.心法列表"
            :key="x"
            class="picked-tag"
            @click="store.切换心法(x)"
          >
            {{ x }} <i>×</i>
          </span>
          <span v-if="!store.心法列表.length" class="hint">从下方选择心法</span>
        </div>
        <input v-model="搜索" class="search" placeholder="搜索心法" />
        <div class="xinfa-pool">
          <button
            v-for="x in 过滤心法"
            :key="x"
            class="chip small"
            :class="{ active: store.心法列表.includes(x) }"
            :disabled="!store.心法列表.includes(x) && store.心法列表.length >= 4"
            @click="store.切换心法(x)"
          >
            {{ x }}
          </button>
        </div>
      </div>

      <div class="block">
        <div class="block-title">套装</div>
        <div class="set-field">
          <span class="set-label">弓诀</span>
          <el-select v-model="store.套装选择.弓决" placeholder="无" clearable>
            <el-option v-for="s in 套装列表('弓决')" :key="s.键" :label="s.名称" :value="s.键" />
          </el-select>
        </div>
        <div class="set-field">
          <span class="set-label">武器</span>
          <el-select v-model="store.套装选择.武器" placeholder="无" clearable>
            <el-option v-for="s in 套装列表('武器')" :key="s.键" :label="s.名称" :value="s.键" />
          </el-select>
        </div>
        <div class="set-field">
          <span class="set-label">防具</span>
          <el-select v-model="store.套装选择.防具" placeholder="无" clearable>
            <el-option v-for="s in 套装列表('防具')" :key="s.键" :label="s.名称" :value="s.键" />
          </el-select>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { 流派注册表 } from '../data/schools.js'
import { 心法列表 } from '../data/xinfa.js'
import { 取套装列表 } from '../data/sets.js'

const store = useSimulatorStore()
const 搜索 = ref('')

const 流派列表 = Object.entries(流派注册表).map(([流派, 变体表]) => ({
  流派,
  变体: Object.keys(变体表)
}))

const 变体列表 = computed(() =>
  store.流派 ? Object.keys(流派注册表[store.流派] || {}) : []
)

const 过滤心法 = computed(() => {
  const kw = 搜索.value.trim()
  return kw ? 心法列表.filter((x) => x.includes(kw)) : 心法列表
})

function 选流派(流派) {
  const 变体 = Object.keys(流派注册表[流派] || {})[0] || ''
  store.选择流派(流派, 变体)
}

function 选变体(变体) {
  store.切换变体(变体)
}

function 套装列表(分类) {
  return 取套装列表(分类)
}
</script>

<style scoped>
.loadout-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 16px 0;
}
.view-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-light);
}
.view-header h3 {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: 600;
}
.view-content {
  flex: 1;
  min-height: 0;
}
.view-content :deep(.el-scrollbar__view) {
  padding: 12px 0 16px;
}
.block {
  margin-bottom: 20px;
}
.block-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-row.variant {
  margin-top: 8px;
}
.chip {
  border: 1px solid var(--color-border-base);
  background: #fff;
  color: var(--color-text-regular);
  border-radius: var(--radius-lg);
  padding: 7px 14px;
  font-size: var(--font-size-lg);
  cursor: pointer;
  transition: all 0.2s;
}
.chip.small {
  padding: 5px 11px;
  font-size: var(--font-size-md);
}
.chip:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.picked {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 26px;
}
.picked-tag {
  background: #ecf5ff;
  color: #409eff;
  border: 1px solid #d9ecff;
  border-radius: var(--radius-md);
  padding: 3px 9px;
  font-size: var(--font-size-md);
  cursor: pointer;
}
.picked-tag i {
  font-style: normal;
  opacity: 0.6;
  margin-left: 2px;
}
.hint {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}
.search {
  width: 100%;
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-lg);
  padding: 7px 10px;
  font-size: var(--font-size-md);
  margin-bottom: 8px;
  outline: none;
}
.search:focus {
  border-color: var(--color-primary);
}
.xinfa-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 210px;
  overflow-y: auto;
}
.set-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.set-label {
  flex: 0 0 40px;
  font-size: var(--font-size-md);
  color: var(--color-text-regular);
}
.set-field :deep(.el-select) {
  flex: 1;
}
</style>

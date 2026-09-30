<template>
  <div class="loadout-view">
    <el-scrollbar class="loadout-scroll">
      <section class="block">
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
      </section>

      <section class="block">
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
      </section>

      <section class="block">
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
      </section>
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
}
.loadout-scroll :deep(.el-scrollbar__view) {
  padding: 16px;
}
.block {
  margin-bottom: 20px;
}
.block-title {
  font-size: 12px;
  color: var(--text-soft);
  letter-spacing: 1px;
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
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.chip.small {
  padding: 5px 11px;
  font-size: 13px;
}
.chip:hover:not(:disabled) {
  border-color: var(--accent);
}
.chip.active {
  background: var(--accent);
  border-color: var(--accent);
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
  background: var(--accent-soft);
  color: #8a6a34;
  border-radius: 6px;
  padding: 3px 9px;
  font-size: 13px;
  cursor: pointer;
}
.picked-tag i {
  font-style: normal;
  opacity: 0.6;
  margin-left: 2px;
}
.hint {
  font-size: 12px;
  color: var(--text-soft);
}
.search {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  margin-bottom: 8px;
  outline: none;
}
.search:focus {
  border-color: var(--accent);
}
.xinfa-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 200px;
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
  font-size: 13px;
  color: var(--text-soft);
}
.set-field :deep(.el-select) {
  flex: 1;
}
</style>

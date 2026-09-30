<template>
  <div class="attribute-panel-root">
    <div class="panel-header">
      <h3>战斗属性面板</h3>
      <el-tag
        v-if="mainElement"
        :type="getElementTagType(mainElement) || undefined"
        :style="getElementTagStyle(mainElement)"
      >
        {{ mainElement }}
      </el-tag>
    </div>

    <el-scrollbar class="panel-content">
      <div v-if="!面板" class="empty-panel">
        <el-empty description="请先选择流派" :image-size="60" />
      </div>

      <div v-else class="stats-list">
        <div class="section-title">基础属性</div>

        <template v-for="item in baseAttackStats" :key="item.id">
          <div v-if="hasAttackValue(item)" class="stat-row">
            <span class="stat-name">{{ item.name }}</span>
            <span class="stat-value">{{ formatAttackRangeValue(item) }}</span>
          </div>
        </template>

        <template v-for="item in basicStats" :key="item.id">
          <div v-if="hasValue(item.id)" class="stat-row">
            <span class="stat-name">{{ item.name }}</span>
            <span class="stat-value">{{ formatBasicStatValue(item.value) }}</span>
          </div>
        </template>

        <div class="section-title" style="margin-top: 8px;">判定属性</div>

        <div v-if="hasValue('精准率')" class="stat-row judgment">
          <span class="stat-name">精准率</span>
          <span class="stat-value">
            {{ 原始精准 }}%
            <span class="effective-value">({{ 有效精准 }}%)</span>
          </span>
        </div>
        <div v-if="hasValue('会心率')" class="stat-row judgment">
          <span class="stat-name">会心率</span>
          <span class="stat-value">
            {{ 原始会心 }}%
            <span class="effective-value">({{ 有效会心 }}%)</span>
          </span>
        </div>
        <div v-if="hasValue('会意率')" class="stat-row judgment">
          <span class="stat-name">会意率</span>
          <span class="stat-value">
            {{ 原始会意 }}%
            <span class="effective-value">({{ 有效会意 }}%)</span>
          </span>
        </div>

        <div v-if="hasValue('直接会心率')" class="stat-row direct-rate">
          <span class="stat-name">直接会心率</span>
          <span class="stat-value">{{ 原始直接会心 }}%</span>
        </div>
        <div v-if="hasValue('直接会意率')" class="stat-row direct-rate">
          <span class="stat-name">直接会意率</span>
          <span class="stat-value">{{ 原始直接会意 }}%</span>
        </div>

        <div class="section-title" style="margin-top: 8px;">穿透属性</div>

        <template v-for="item in penetrationStats" :key="item.id">
          <div v-if="hasValue(item.key)" class="stat-row" :class="{ judgment: item.有效 }">
            <span class="stat-name">{{ item.name }}</span>
            <span class="stat-value">
              {{ formatPenetrationValue(item.value) }}
              <span v-if="item.有效" class="effective-value">({{ item.有效 }})</span>
            </span>
          </div>
        </template>

        <div class="section-title" style="margin-top: 8px;">增伤属性</div>

        <template v-for="item in enhancedDamageBonusStats" :key="item.id">
          <div v-if="item.value" class="stat-row" :class="{ judgment: item.有效 }">
            <span class="stat-name">{{ item.name }}</span>
            <span class="stat-value">
              {{ item.displayValue }}
              <span v-if="item.有效" class="effective-value">({{ item.有效Value }})</span>
            </span>
          </div>
        </template>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { 是百分比词条 } from '../data/affinities.js'

const store = useSimulatorStore()
const 面板 = computed(() => store.面板)
const rawTotals = computed(() => 面板.value?.原始面板 || {})
const 增益有效 = computed(() => 面板.value?.增益有效面板 || {})

const allElements = ['裂石', '鸣金', '破竹', '牵丝']

const mainElement = computed(() => {
  const p = 面板.value
  if (!p || !p.本系属性) return null
  const ele = p.本系属性
  return ele === '无相' ? null : ele
})

// 基础攻击属性列表（合并最小/最大显示）
const baseAttackStats = computed(() => {
  const stats = [
    { id: 'wugongAttack', name: '外功攻击', minId: '最小外功攻击', maxId: '最大外功攻击' },
    { id: 'lieshiAttack', name: '裂石攻击', minId: '最小裂石攻击', maxId: '最大裂石攻击' },
    { id: 'mingjinAttack', name: '鸣金攻击', minId: '最小鸣金攻击', maxId: '最大鸣金攻击' },
    { id: 'pozhuAttack', name: '破竹攻击', minId: '最小破竹攻击', maxId: '最大破竹攻击' },
    { id: 'qiansiAttack', name: '牵丝攻击', minId: '最小牵丝攻击', maxId: '最大牵丝攻击' },
    { id: 'wuxiangAttack', name: '无相攻击', minId: '最小无相攻击', maxId: '最大无相攻击' }
  ]
  return stats.map((s) => ({
    ...s,
    minValue: rawTotals.value[s.minId],
    maxValue: rawTotals.value[s.maxId]
  }))
})

const basicStats = computed(() => {
  const stats = [
    { id: 'jin', name: '劲' },
    { id: 'min', name: '敏' },
    { id: 'shi', name: '势' }
  ]
  return stats.map((s) => ({ ...s, value: rawTotals.value[s.id] }))
})

// 判定属性
const 有效面板 = computed(() => 面板.value?.有效面板 || {})
const 原始精准 = computed(() => (rawTotals.value['精准率'] || 0).toFixed(1))
const 有效精准 = computed(() => ((有效面板.value['精准率'] || 0)).toFixed(1))
const 原始会心 = computed(() => (rawTotals.value['会心率'] || 0).toFixed(1))
const 有效会心 = computed(() => ((有效面板.value['会心率'] || 0)).toFixed(1))
const 原始会意 = computed(() => (rawTotals.value['会意率'] || 0).toFixed(1))
const 有效会意 = computed(() => ((有效面板.value['会意率'] || 0)).toFixed(1))
const 原始直接会心 = computed(() => (rawTotals.value['直接会心率'] || 0).toFixed(1))
const 原始直接会意 = computed(() => (rawTotals.value['直接会意率'] || 0).toFixed(1))

// 穿透属性
const penetrationStats = computed(() => {
  const 元素 = 面板.value?.本系属性
  const schoolPenetration = 元素 ? { id: 'schoolPen', key: `${元素}穿透`, name: `${元素}穿透` } : null
  const stats = [
    { id: 'wugongPenetration', key: '外功穿透', name: '外功穿透' },
    ...(schoolPenetration ? [schoolPenetration] : []),
    { id: 'wuxiangPenetration', key: '无相穿透', name: '无相穿透' }
  ]
  const extra = [
    { id: 'lieshiPenetration', key: '裂石穿透', name: '裂石穿透' },
    { id: 'mingjinPenetration', key: '鸣金穿透', name: '鸣金穿透' },
    { id: 'pozhuPenetration', key: '破竹穿透', name: '破竹穿透' },
    { id: 'qiansiPenetration', key: '牵丝穿透', name: '牵丝穿透' }
  ].filter((item) => item.key !== schoolPenetration?.key && (Number(rawTotals.value[item.key]) || 0) !== 0)

  return [...stats, ...extra].map((s) => {
    const 有效数值 = 增益有效.value[s.key]
    return {
      ...s,
      value: rawTotals.value[s.key],
      有效: 有效数值 !== undefined ? 有效数值.toFixed(1) : ''
    }
  })
})

// 增伤属性：仅展示来自装备的增伤/增效类词条
const enhancedDamageBonusStats = computed(() => {
  const 名称集 = new Set()
  for (const 装备 of Object.values(store.装备词条)) {
    for (const 词条 of Object.values(装备 || {})) {
      if (!词条?.名称 || !词条.值) continue
      if (!是百分比词条(词条.名称)) continue
      if (词条.名称.includes('伤害加成')) continue
      名称集.add(词条.名称)
    }
  }
  return [...名称集].map((名称) => {
    const 原始 = rawTotals.value[名称] || 0
    const 有效数值 = 增益有效.value[名称]
    return {
      id: `bonus_${名称}`,
      name: 名称,
      value: 原始,
      displayValue: `${原始.toFixed(1)}%`,
      有效: 有效数值 !== undefined,
      有效Value: 有效数值 !== undefined ? `${有效数值.toFixed(1)}%` : ''
    }
  })
})

function hasValue(statId) {
  const val = rawTotals.value[statId]
  return val !== undefined && val !== null && val !== 0
}

function hasAttackValue(item) {
  const minVal = Number(item.minValue) || 0
  const maxVal = Number(item.maxValue) || 0
  return minVal > 0 || maxVal > 0
}

function formatAttackRangeValue(item) {
  const minVal = Number(item.minValue) || 0
  const maxVal = Number(item.maxValue) || 0
  return `${Math.floor(minVal)}～${Math.floor(maxVal)}`
}

function formatBasicStatValue(value) {
  return String(Math.round(Number(value) || 0))
}

function formatPenetrationValue(value) {
  return (Number(value) || 0).toFixed(1)
}

function getElementTagType(element) {
  const typeMap = { 裂石: 'warning', 鸣金: '', 破竹: '', 牵丝: '' }
  return typeMap[element] || ''
}

function getElementTagStyle(element) {
  const styleMap = {
    破竹: {
      '--el-tag-bg-color': '#fcf6ff',
      '--el-tag-border-color': '#e9d5ff',
      '--el-tag-text-color': '#9333ea'
    },
    牵丝: {
      '--el-tag-bg-color': '#f0fdf4',
      '--el-tag-border-color': '#bbf7d0',
      '--el-tag-text-color': '#22c55e'
    },
    鸣金: {
      '--el-tag-bg-color': '#eff6ff',
      '--el-tag-border-color': '#bfdbfe',
      '--el-tag-text-color': '#3b82f6'
    }
  }
  return styleMap[element] || {}
}
</script>

<style scoped>
.attribute-panel-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 12px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.panel-header h3 {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
}
.panel-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.empty-panel {
  padding: 24px 0;
}
.stats-list {
  padding: 0;
}
.section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 0 8px;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  margin-bottom: 2px;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s;
}
.stat-row:hover {
  background-color: var(--color-bg-secondary);
}
.stat-name {
  font-size: var(--font-size-lg);
  color: var(--color-text-regular);
}
.stat-value {
  font-size: var(--font-size-lg);
  font-weight: 500;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
.stat-row.judgment .effective-value {
  color: var(--color-tag-amber-text);
  font-weight: 600;
}
.stat-row.direct-rate .stat-value {
  color: var(--color-success);
}
</style>

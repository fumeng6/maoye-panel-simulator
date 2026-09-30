<template>
  <div class="equipment-manager">
    <div class="manager-header">
      <h3 class="manager-title">装备调律</h3>
    </div>

    <el-scrollbar class="manager-content">
      <!-- 套装选择区 -->
      <div class="set-selection-section">
        <div class="section-title">
          <el-icon><Grid /></el-icon>
          <span>套装选择</span>
        </div>

        <div class="set-grid">
          <div class="set-item">
            <label class="set-label">弓决</label>
            <el-select
              :model-value="store.套装选择.弓决"
              @change="(val) => (store.套装选择.弓决 = val)"
              size="small"
              placeholder="选择弓决"
              clearable
            >
              <el-option
                v-for="set in 套装列表('弓决')"
                :key="set.键"
                :label="set.名称"
                :value="set.键"
              />
            </el-select>
          </div>

          <div class="set-item">
            <label class="set-label">武器套装</label>
            <el-select
              :model-value="store.套装选择.武器"
              @change="(val) => (store.套装选择.武器 = val)"
              size="small"
              placeholder="选择武器套装"
              clearable
            >
              <el-option
                v-for="set in 套装列表('武器')"
                :key="set.键"
                :label="set.名称"
                :value="set.键"
              />
            </el-select>
          </div>

          <div class="set-item">
            <label class="set-label">防具套装</label>
            <el-select
              :model-value="store.套装选择.防具"
              @change="(val) => (store.套装选择.防具 = val)"
              size="small"
              placeholder="选择防具套装"
              clearable
            >
              <el-option
                v-for="set in 套装列表('防具')"
                :key="set.键"
                :label="set.名称"
                :value="set.键"
              />
            </el-select>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 装备部位区 -->
      <div class="equipment-slots-section">
        <div class="section-title">
          <el-icon><Grid /></el-icon>
          <span>装备部位</span>
        </div>

        <div class="slots-grid">
          <div
            v-for="slot in equipmentSlots"
            :key="slot.key"
            class="slot-card"
            @click="openAffinityConfig(slot)"
          >
            <div class="slot-header">
              <span class="slot-name">{{ slot.name }}</span>
              <el-tag v-if="isChengyin(slot.key)" size="small" type="success" class="chengyin-tag">
                已承音
              </el-tag>
            </div>
            <div class="slot-content">
              <div v-if="hasAffinityConfig(slot.key)" class="affinity-display-list">
                <div
                  v-for="affinity in getAffinityDisplayList(slot.key)"
                  :key="affinity.slotType"
                  class="affinity-item"
                  :style="{
                    backgroundColor: affinity.slotColors.bg,
                    borderColor: affinity.slotColors.border
                  }"
                >
                  <span class="affinity-slot" :style="{ color: affinity.slotColors.text }">
                    {{ affinity.slotLabel }}
                  </span>
                  <span class="affinity-name">{{ affinity.name }}</span>
                  <span class="affinity-value">{{ affinity.valueText }}</span>
                </div>
              </div>
              <div v-else class="affinity-placeholder">
                <span class="placeholder-text">（未配置词条）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>

    <!-- 词条配置对话框 -->
    <AffinityConfigDialog
      v-model="showAffinityDialog"
      :slot-key="currentSlot.key"
      :slot-name="currentSlot.name"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import AffinityConfigDialog from './AffinityConfigDialog.vue'
import { Grid } from '@element-plus/icons-vue'
import { 装备部位, 部位顺序, 词条槽, 取词条范围, 是百分比词条 } from '../data/affinities.js'
import { 取套装列表 } from '../data/sets.js'

const store = useSimulatorStore()

const showAffinityDialog = ref(false)
const currentSlot = ref({ key: '', name: '' })

// 装备部位列表（与培养助手排序一致）
const equipmentSlots = [
  { key: 装备部位.主武器, name: '主武器' },
  { key: 装备部位.副武器, name: '副武器' },
  { key: 装备部位.头, name: '冠胄' },
  { key: 装备部位.胸, name: '胸甲' },
  { key: 装备部位.环, name: '环' },
  { key: 装备部位.佩, name: '佩' },
  { key: 装备部位.胫甲, name: '胫甲' },
  { key: 装备部位.腕甲, name: '腕甲' }
]

function 套装列表(分类) {
  return 取套装列表(分类)
}

function isChengyin(slotKey) {
  return Boolean(store.装备词条[slotKey]?.承音)
}

function openAffinityConfig(slot) {
  currentSlot.value = { key: slot.key, name: slot.name }
  showAffinityDialog.value = true
}

function hasAffinityConfig(slotKey) {
  const equip = store.装备词条[slotKey]
  if (!equip) return false
  return Object.values(equip).some((v) => v && v.名称)
}

// 槽位标签与颜色
const slotLabelMap = {
  [词条槽.宫]: '宫',
  [词条槽.商]: '商',
  [词条槽.角]: '角',
  [词条槽.徵]: '徵',
  [词条槽.羽]: '羽',
  [词条槽.定音]: '定'
}

const slotColors = {
  [词条槽.宫]: {
    text: 'var(--el-color-warning)',
    bg: 'var(--el-color-warning-light-9)',
    border: 'var(--el-color-warning-light-7)'
  },
  [词条槽.商]: {
    text: 'var(--el-color-primary)',
    bg: 'var(--el-color-primary-light-9)',
    border: 'var(--el-color-primary-light-7)'
  },
  [词条槽.角]: {
    text: 'var(--el-color-primary)',
    bg: 'var(--el-color-primary-light-9)',
    border: 'var(--el-color-primary-light-7)'
  },
  [词条槽.徵]: {
    text: 'var(--el-color-primary)',
    bg: 'var(--el-color-primary-light-9)',
    border: 'var(--el-color-primary-light-7)'
  },
  [词条槽.羽]: {
    text: 'var(--el-color-primary)',
    bg: 'var(--el-color-primary-light-9)',
    border: 'var(--el-color-primary-light-7)'
  },
  [词条槽.定音]: {
    text: 'var(--el-color-danger)',
    bg: 'var(--el-color-danger-light-9)',
    border: 'var(--el-color-danger-light-7)'
  }
}

function getAffinityDisplayList(slotKey) {
  const equip = store.装备词条[slotKey]
  if (!equip) return []
  const 顺序 = [词条槽.宫, 词条槽.商, 词条槽.角, 词条槽.徵, 词条槽.羽, 词条槽.定音]
  const result = []
  for (const 槽位 of 顺序) {
    const 词条 = equip[槽位]
    if (!词条?.名称) continue
    result.push({
      slotType: 槽位,
      slotLabel: slotLabelMap[槽位],
      slotColors: slotColors[槽位],
      name: 词条.名称,
      valueText: 是百分比词条(词条.名称)
        ? `${(词条.值 * 100).toFixed(1)}%`
        : String(Math.round(词条.值))
    })
  }
  return result
}
</script>

<style scoped>
.equipment-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.manager-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}
.manager-content {
  flex: 1;
  min-height: 0;
}
.manager-content :deep(.el-scrollbar__view) {
  padding: 12px 0 16px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 22px;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-regular);
  flex-wrap: wrap;
}
.set-selection-section {
  margin-bottom: 16px;
}
.set-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.set-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.set-label {
  font-size: var(--font-size-md);
  color: var(--color-text-regular);
  font-weight: 500;
}
.equipment-slots-section {
  margin-bottom: 16px;
}
.slots-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.slot-card {
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-bg-base);
  transition: all 0.2s;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.slot-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}
.slot-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 8px 10px;
  border-bottom: 1px solid var(--color-border-lighter);
  background: linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-base) 100%);
}
.slot-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}
.chengyin-tag {
  flex: none;
}
.slot-content {
  padding: 10px;
  flex: 1;
}
.affinity-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-placeholder);
  font-size: var(--font-size-base);
}
.affinity-display-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.affinity-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 6px 8px;
}
.affinity-slot {
  flex-shrink: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  min-width: 20px;
}
.affinity-name {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.affinity-value {
  flex-shrink: 0;
  font-size: var(--font-size-base);
  color: var(--color-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 1200px) {
  .slots-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .set-grid {
    grid-template-columns: 1fr;
  }
  .slots-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

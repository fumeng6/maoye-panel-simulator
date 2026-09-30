<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="logo">
          <h1 class="title">燕云面板模拟器</h1>
          <span class="version">v0.1.0</span>
        </div>
        <div class="header-actions">
          <el-tag v-if="本系属性" :type="getElementTagType(本系属性)" :style="getElementTagStyle(本系属性)">
            {{ 本系属性 }}
          </el-tag>
        </div>
      </div>
    </header>

    <main class="main-grid">
      <div class="module-card attribute-panel"><AttributePanel /></div>
      <div class="module-card school-selector"><SchoolSelector /></div>
      <div class="module-card equipment-manager"><EquipmentManager /></div>
    </main>

    <nav v-if="isMobile" class="mobile-tab-bar">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab-item"
        :class="{ active: 当前页 === t.key }"
        @click="当前页 = t.key"
      >
        <span class="tab-label">{{ t.label }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSimulatorStore } from './stores/simulator.js'
import { useMediaQuery } from './composables/useMediaQuery.js'
import AttributePanel from './components/AttributePanel.vue'
import SchoolSelector from './components/SchoolSelector.vue'
import EquipmentManager from './components/EquipmentManager.vue'

const store = useSimulatorStore()
const isMobile = useMediaQuery('(max-width: 1023px)')

const tabs = [
  { key: 'panel', label: '面板' },
  { key: 'loadout', label: '配置' },
  { key: 'equip', label: '装备' }
]
const 当前页 = ref('panel')

const 本系属性 = computed(() => store.面板?.本系属性 || null)

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
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-app);
}
.app-header {
  background: var(--color-bg-header);
  backdrop-filter: blur(10px);
  box-shadow: var(--color-shadow-header);
  padding: 0;
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-content {
  max-width: 1600px;
  height: 100%;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.title {
  font-size: var(--font-size-5xl, 20px);
  font-weight: 600;
  margin: 0;
  line-height: 1;
  background: linear-gradient(135deg, var(--color-brand-start) 0%, var(--color-brand-end) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.version {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}
.main-grid {
  flex: 1;
  min-height: 0;
  max-width: 2000px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 2fr 4fr;
  grid-template-rows: auto;
  gap: 16px;
  overflow: hidden;
}
.main-grid > .module-card {
  min-height: 0;
  padding: 20px;
}
/* 属性面板、装备卡撑满高度；流派心法卡按内容高度 */
.main-grid > .attribute-panel,
.main-grid > .equipment-manager {
  align-self: stretch;
}
.main-grid > .school-selector {
  align-self: start;
}
@media (max-width: 1023px) {
  .main-grid {
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
    padding: 12px;
    padding-bottom: 80px;
    overflow: visible;
  }
  .main-grid > .module-card {
    height: auto;
  }
}
.mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  display: flex;
  justify-content: center;
  gap: 8px;
  background: var(--color-bg-tab-bar);
  backdrop-filter: blur(20px);
  box-shadow: var(--color-shadow-tab-bar);
  border-top: 1px solid var(--color-border-tab-bar);
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 8px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  color: var(--color-text-secondary);
}
.tab-item.active {
  color: var(--color-brand-start);
  background: rgba(102, 126, 234, 0.1);
}
.tab-label {
  font-size: var(--font-size-md);
}
</style>

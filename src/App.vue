<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-mark">燕</span>
          <h1 class="title">燕云面板模拟器</h1>
        </div>
        <div class="header-actions">
          <span v-if="本系属性" class="element-tag" :style="元素样式">{{ 本系属性 }}</span>
        </div>
      </div>
    </header>

    <!-- PC：三栏 -->
    <main v-if="!isMobile" class="main-grid">
      <div class="module-card col-panel"><PanelView /></div>
      <div class="module-card col-loadout"><LoadoutView /></div>
      <div class="module-card col-equip"><EquipmentView /></div>
    </main>

    <!-- 移动端：单视图 + 底部标签栏 -->
    <main v-else class="mobile-main">
      <div v-show="当前页 === 'panel'" class="module-card mobile-card"><PanelView /></div>
      <div v-if="当前页 === 'loadout'" class="module-card mobile-card"><LoadoutView /></div>
      <div v-if="当前页 === 'equip'" class="module-card mobile-card"><EquipmentView /></div>
    </main>

    <nav v-if="isMobile" class="mobile-tab-bar">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab-item"
        :class="{ active: 当前页 === t.key }"
        @click="当前页 = t.key"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span class="tab-label">{{ t.label }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSimulatorStore } from './stores/simulator.js'
import { useMediaQuery } from './composables/useMediaQuery.js'
import PanelView from './components/PanelView.vue'
import LoadoutView from './components/LoadoutView.vue'
import EquipmentView from './components/EquipmentView.vue'

const store = useSimulatorStore()
const isMobile = useMediaQuery('(max-width: 1023px)')

const tabs = [
  { key: 'panel', label: '面板', icon: '◫' },
  { key: 'loadout', label: '配置', icon: '◈' },
  { key: 'equip', label: '装备', icon: '❖' }
]
const 当前页 = ref('panel')

const 本系属性 = computed(() => store.面板?.本系属性 || null)
const 元素样式 = computed(() => {
  const map = {
    鸣金: { background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe' },
    裂石: { background: '#fdf6ec', color: '#e6a23c', border: '1px solid #f5dab1' },
    破竹: { background: '#fcf6ff', color: '#9333ea', border: '1px solid #e9d5ff' },
    牵丝: { background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' }
  }
  return map[本系属性.value] || {}
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-app);
}

/* ===== 顶部栏 ===== */
.app-header {
  background: var(--color-bg-header);
  backdrop-filter: blur(10px);
  box-shadow: var(--color-shadow-header);
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
  align-items: center;
  gap: 10px;
}
.logo-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--color-brand-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}
.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  background: var(--color-brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.element-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-weight: 600;
}

/* ===== PC 三栏 ===== */
.main-grid {
  flex: 1;
  min-height: 0;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: 320px 320px 1fr;
  gap: 16px;
  overflow: hidden;
}
.main-grid > .module-card {
  min-height: 0;
}

/* ===== 移动端 ===== */
.mobile-main {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
}
.mobile-card {
  height: 100%;
  min-height: 0;
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
  padding: 6px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  color: var(--color-text-secondary);
}
.tab-item.active {
  color: var(--color-brand-start);
  background: rgba(102, 126, 234, 0.1);
}
.tab-icon {
  font-size: 20px;
  line-height: 1;
}
.tab-label {
  font-size: 11px;
  margin-top: 2px;
}
</style>

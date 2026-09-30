<template>
  <!-- 移动端：底部标签栏 -->
  <div v-if="isMobile" class="mobile-app">
    <header class="mobile-head">
      <span class="logo">燕云面板模拟器</span>
      <span v-if="本系属性 && 当前页 !== 'panel'" class="element-tag" :style="元素样式">{{ 本系属性 }}</span>
    </header>

    <main class="mobile-body">
      <PanelView v-show="当前页 === 'panel'" />
      <LoadoutView v-if="当前页 === 'loadout'" />
      <EquipmentView v-if="当前页 === 'equip'" />
    </main>

    <nav class="tabbar">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tabbar-btn"
        :class="{ active: 当前页 === t.key }"
        @click="当前页 = t.key"
      >
        <span class="icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </nav>
  </div>

  <!-- PC：三栏 -->
  <div v-else class="desktop-app">
    <aside class="col-panel"><PanelView /></aside>
    <section class="col-loadout"><LoadoutView /></section>
    <section class="col-equip"><EquipmentView /></section>
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
    鸣金: { background: '#eef4ff', color: '#3b6fd4' },
    裂石: { background: '#fff6ec', color: '#c07c2b' },
    破竹: { background: '#fcf6ff', color: '#9333ea' },
    牵丝: { background: '#eefaf2', color: '#2f9e63' }
  }
  return map[本系属性.value] || {}
})
</script>

<style scoped>
/* ===== PC 三栏 ===== */
.desktop-app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.col-panel {
  flex: 0 0 300px;
  border-right: 1px solid var(--border);
  background: var(--panel-bg);
  min-height: 0;
}
.col-loadout {
  flex: 0 0 300px;
  border-right: 1px solid var(--border);
  min-height: 0;
}
.col-equip {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: #faf9f6;
}

/* ===== 移动端 ===== */
.mobile-app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}
.mobile-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border);
}
.logo {
  font-size: 15px;
  font-weight: 600;
}
.element-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.mobile-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #faf9f6;
}
.mobile-body > * {
  height: 100%;
  background: var(--panel-bg);
}
.tabbar {
  flex: 0 0 auto;
  display: flex;
  border-top: 1px solid var(--border);
  background: var(--panel-bg);
  padding-bottom: env(safe-area-inset-bottom);
}
.tabbar-btn {
  flex: 1;
  border: none;
  background: none;
  padding: 8px 0 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--text-soft);
  cursor: pointer;
}
.tabbar-btn .icon {
  font-size: 18px;
}
.tabbar-btn.active {
  color: var(--accent);
}
</style>

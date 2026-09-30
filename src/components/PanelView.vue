<template>
  <div class="panel-view">
    <div class="panel-head">
      <h3>战斗属性面板</h3>
      <span v-if="本系属性" class="element-tag" :style="元素样式">{{ 本系属性 }}</span>
    </div>
    <el-scrollbar class="panel-scroll">
      <PanelBody />
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import PanelBody from './PanelBody.vue'

const store = useSimulatorStore()
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
.panel-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
}
.panel-head h3 {
  margin: 0;
  font-size: 16px;
}
.element-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.panel-scroll {
  flex: 1;
  min-height: 0;
}
.panel-scroll :deep(.el-scrollbar__view) {
  padding: 0 16px 16px;
}
</style>

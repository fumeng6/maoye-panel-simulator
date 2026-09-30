<template>
  <div class="panel-view">
    <div class="panel-header">
      <h3>战斗属性面板</h3>
    </div>
    <el-scrollbar class="panel-content">
      <PanelBody />
    </el-scrollbar>
  </div>
</template>

<script setup>
import PanelBody from './PanelBody.vue'
</script>

<style scoped>
.panel-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 16px 0;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
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
  min-height: 0;
}
.panel-content :deep(.el-scrollbar__view) {
  padding: 8px 0 16px;
}
</style>

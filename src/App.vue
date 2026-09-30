<template>
  <div class="app-layout">
    <PanelView class="col col-left" />
    <LoadoutView class="col col-center" />
    <EquipmentView class="col col-right" />
  </div>
</template>

<script setup>
import PanelView from './components/PanelView.vue'
import LoadoutView from './components/LoadoutView.vue'
import EquipmentView from './components/EquipmentView.vue'
</script>

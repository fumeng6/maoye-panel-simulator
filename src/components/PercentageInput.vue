<template>
  <div class="percentage-input-wrapper">
    <el-input-number
      v-model="displayValue"
      :min="displayMin"
      :max="displayMax"
      :precision="precision"
      :step="step"
      :disabled="disabled"
      :placeholder="placeholder"
      :size="size"
      :controls-position="controlsPosition"
      class="percentage-input"
    />
    <span class="percentage-suffix">%</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // v-model 绑定的值（小数形式，如 0.098）
  modelValue: { type: Number, default: null },
  // 最小值（小数形式，如 0.052）
  min: { type: Number, default: 0 },
  // 最大值（小数形式，如 0.104）
  max: { type: Number, default: 1 },
  // 显示精度（百分比的小数位数，如 1 表示 9.8%）
  precision: { type: Number, default: 1 },
  // 步进值（百分比形式，如 0.1 表示每次增减 0.1%）
  step: { type: Number, default: 0.1 },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'default' },
  controlsPosition: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

// 显示值（百分比形式）：0.098 -> 9.8
const displayValue = computed({
  get() {
    if (props.modelValue === null || props.modelValue === undefined) return null
    return (
      Math.round(props.modelValue * 100 * Math.pow(10, props.precision)) /
      Math.pow(10, props.precision)
    )
  },
  set(val) {
    if (val === null || val === undefined) {
      emit('update:modelValue', null)
    } else {
      emit('update:modelValue', val / 100)
    }
  }
})

const displayMin = computed(
  () => Math.round(props.min * 100 * Math.pow(10, props.precision)) / Math.pow(10, props.precision)
)
const displayMax = computed(
  () => Math.round(props.max * 100 * Math.pow(10, props.precision)) / Math.pow(10, props.precision)
)
</script>

<style scoped>
.percentage-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.percentage-input {
  width: 120px;
}
.percentage-suffix {
  font-size: 14px;
  color: #606266;
  flex-shrink: 0;
}
</style>

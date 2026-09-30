<template>
  <teleport to="body">
    <div v-if="visible" class="picker-mask" :class="{ mobile: isMobile }" @click.self="关闭">
      <div class="picker" :class="{ mobile: isMobile }">
        <div class="picker-head">
          <div class="title">
            <span>{{ 部位 }} · {{ 槽位 }}</span>
            <span v-if="已选" class="cur">当前：{{ 已选 }}</span>
          </div>
          <button class="close" @click="关闭">✕</button>
        </div>

        <div class="picker-tools">
          <input v-model="搜索" class="search" placeholder="搜索词条" />
          <button v-if="已选" class="clear" @click="清空">清空</button>
        </div>

        <div class="picker-list">
          <button
            v-for="名称 in 过滤列表"
            :key="名称"
            class="opt"
            :class="{ active: 名称 === 已选, disabled: 被占用(名称) }"
            :disabled="被占用(名称)"
            @click="选中(名称)"
          >
            <span class="opt-name">{{ 名称 }}</span>
            <span class="opt-range">{{ 范围文本(名称) }}</span>
            <span v-if="被占用(名称)" class="opt-flag">已占用</span>
          </button>
          <div v-if="!过滤列表.length" class="empty">无可选词条</div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 取词条范围, 是百分比词条, 调律槽位 } from '../data/affinities.js'
import { useMediaQuery } from '../composables/useMediaQuery.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  部位: { type: String, default: '' },
  槽位: { type: String, default: '' },
  候选: { type: Array, default: () => [] },
  已选: { type: String, default: '' },
  // 已被同部位其他调律槽占用的词条名集合
  占用集: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'select'])

const 搜索 = ref('')
const isMobile = useMediaQuery('(max-width: 1023px)')

watch(
  () => props.visible,
  (v) => {
    if (v) 搜索.value = ''
  }
)

const 过滤列表 = computed(() => {
  const kw = 搜索.value.trim()
  return kw ? props.候选.filter((x) => x.includes(kw)) : props.候选
})

function 被占用(名称) {
  if (!调律槽位.includes(props.槽位)) return false
  return props.占用集.includes(名称)
}

function 选中(名称) {
  emit('select', 名称)
  关闭()
}

function 清空() {
  emit('select', '')
  关闭()
}

function 关闭() {
  emit('update:visible', false)
}

function 范围文本(名称) {
  const [min, max] = 取词条范围(名称)
  if (是百分比词条(名称)) {
    return `${(max * 100).toFixed(1)}%`
  }
  return String(max)
}
</script>

<style scoped>
.picker-mask {
  position: fixed;
  inset: 0;
  background: rgba(30, 26, 20, 0.35);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.picker-mask.mobile {
  align-items: flex-end;
}
.picker {
  background: #fff;
  width: 420px;
  max-width: 92vw;
  max-height: 70vh;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}
/* 移动端：底部弹出 */
.picker.mobile {
  width: 100%;
  max-width: 100%;
  max-height: 72vh;
  border-radius: 16px 16px 0 0;
  align-self: flex-end;
  animation: slide-up 0.2s ease;
}
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border);
}
.title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 600;
}
.title .cur {
  font-size: 12px;
  color: var(--accent);
  font-weight: 400;
}
.close {
  border: none;
  background: none;
  font-size: 18px;
  color: var(--text-soft);
  cursor: pointer;
  padding: 4px 8px;
}
.picker-tools {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
}
.search {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  outline: none;
}
.search:focus {
  border-color: var(--accent);
}
.clear {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-soft);
  cursor: pointer;
}
.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 14px;
}
.opt {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  padding: 11px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
}
.opt:hover:not(:disabled) {
  background: var(--accent-soft);
}
.opt.active {
  background: var(--accent);
  color: #fff;
}
.opt.active .opt-range {
  color: rgba(255, 255, 255, 0.85);
}
.opt.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.opt-name {
  flex: 1;
}
.opt-range {
  font-size: 12px;
  color: var(--text-soft);
  font-variant-numeric: tabular-nums;
}
.opt-flag {
  font-size: 11px;
  color: #c0392b;
}
.empty {
  text-align: center;
  color: var(--text-soft);
  font-size: 13px;
  padding: 30px 0;
}
</style>

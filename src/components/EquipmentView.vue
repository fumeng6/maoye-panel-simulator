<template>
  <div class="equipment-view">
    <h3>装备配置</h3>

    <div v-if="!store.已选流派" class="empty-hint">请先在中间选择流派</div>

    <el-collapse v-else v-model="展开部位" class="equip-collapse">
      <el-collapse-item
        v-for="部位 in 部位顺序"
        :key="部位"
        :name="部位"
      >
        <template #title>
          <div class="equip-title">
            <span>{{ 部位 }}</span>
            <el-tag size="small" type="info" effect="plain">
              {{ 已填数量(部位) }}/6
            </el-tag>
          </div>
        </template>

        <div v-for="槽位 in 全部槽位" :key="槽位" class="slot-row">
          <span class="slot-label" :class="{ dingyin: 槽位 === '定音' }">{{ 槽位 }}</span>
          <el-select
            :model-value="词条名称(部位, 槽位)"
            size="small"
            placeholder="空"
            clearable
            class="slot-select"
            @update:model-value="(v) => store.设置词条(部位, 槽位, v)"
          >
            <el-option
              v-for="名称 in 可选词条(部位, 槽位)"
              :key="名称"
              :label="名称"
              :value="名称"
              :disabled="是否占用(部位, 槽位, 名称)"
            />
          </el-select>
          <el-input-number
            v-if="词条名称(部位, 槽位)"
            :model-value="词条值(部位, 槽位)"
            size="small"
            :min="范围(部位, 槽位)[0]"
            :max="范围(部位, 槽位)[1]"
            :step="步长(部位, 槽位)"
            :precision="精度(部位, 槽位)"
            :controls="false"
            class="slot-input"
            @update:model-value="(v) => store.设置词条值(部位, 槽位, v)"
          />
        </div>

        <div class="slot-actions">
          <el-button size="small" text @click="store.填满部位(部位)">一键填入</el-button>
          <span class="range-hint">{{ 满值提示(部位) }}</span>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { 部位顺序, 词条槽, 调律槽位, 取词条范围, 是百分比词条 } from '../data/affinities.js'

const store = useSimulatorStore()
const 展开部位 = ref([部位顺序[0]])

const 全部槽位 = [词条槽.宫, ...调律槽位, 词条槽.定音]

function 可选词条(部位, 槽位) {
  return store.取可选词条(部位, 槽位)
}

function 词条名称(部位, 槽位) {
  return store.装备词条[部位][槽位].名称
}

function 词条值(部位, 槽位) {
  return store.装备词条[部位][槽位].值
}

function 范围(部位, 槽位) {
  const 名称 = 词条名称(部位, 槽位)
  return 名称 ? 取词条范围(名称) : [0, 1]
}

function 步长(部位, 槽位) {
  const 名称 = 词条名称(部位, 槽位)
  if (!名称) return 0.1
  return 是百分比词条(名称) ? 0.001 : 0.1
}

function 精度(部位, 槽位) {
  const 名称 = 词条名称(部位, 槽位)
  if (!名称) return 2
  return 是百分比词条(名称) ? 3 : 1
}

/** 商/角/徵/羽 四个槽互不重复 */
function 是否占用(部位, 槽位, 名称) {
  if (!调律槽位.includes(槽位)) return false
  return 调律槽位.some((s) => s !== 槽位 && 词条名称(部位, s) === 名称)
}

function 已填数量(部位) {
  return 全部槽位.filter((s) => 词条名称(部位, s)).length
}

function 满值提示(部位) {
  const 定音 = 词条名称(部位, 词条槽.定音)
  if (定音) {
    const [, max] = 取词条范围(定音)
    return 是百分比词条(定音) ? `定音满值 ${(max * 100).toFixed(1)}%` : `定音满值 ${max}`
  }
  return ''
}
</script>

<style scoped>
h3 {
  margin: 0 0 8px;
  font-size: 16px;
}
.equip-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.slot-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.slot-label {
  flex: 0 0 34px;
  font-size: 13px;
  color: var(--text-soft);
  text-align: center;
}
.slot-label.dingyin {
  color: var(--accent);
  font-weight: 600;
}
.slot-select {
  flex: 1 1 auto;
  min-width: 0;
}
.slot-input {
  flex: 0 0 110px;
}
.slot-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.range-hint {
  font-size: 12px;
  color: var(--accent);
}
</style>

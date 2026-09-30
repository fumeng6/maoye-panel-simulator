<template>
  <div class="loadout-view">
    <h3>流派与心法</h3>

    <div class="section-title">流派</div>
    <el-radio-group v-model="流派" class="school-group" @change="onSchoolChange">
      <el-radio-button v-for="s in 流派列表" :key="s.流派" :value="s.流派">
        {{ s.流派 }}
      </el-radio-button>
    </el-radio-group>

    <div v-if="流派" class="section-title">变体</div>
    <el-radio-group
      v-if="流派"
      v-model="变体"
      class="variant-group"
      @change="onVariantChange"
    >
      <el-radio-button v-for="v in 变体列表" :key="v" :value="v">
        {{ v }}
      </el-radio-button>
    </el-radio-group>

    <div class="section-title">心法（最多 4 本）</div>
    <div class="xinfa-picked">
      <el-tag
        v-for="x in store.心法列表"
        :key="x"
        closable
        class="xinfa-tag"
        @close="store.切换心法(x)"
      >
        {{ x }}
      </el-tag>
      <span v-if="!store.心法列表.length" class="hint">点击下方心法添加</span>
    </div>

    <el-input
      v-model="搜索"
      size="small"
      placeholder="搜索心法"
      clearable
      class="xinfa-search"
    />
    <div class="xinfa-pool">
      <el-tag
        v-for="x in 过滤心法"
        :key="x"
        :type="store.心法列表.includes(x) ? 'primary' : 'info'"
        :effect="store.心法列表.includes(x) ? 'dark' : 'plain'"
        class="xinfa-pool-tag"
        @click="store.切换心法(x)"
      >
        {{ x }}
      </el-tag>
    </div>

    <div class="section-title">套装</div>
    <div class="set-row">
      <span class="set-label">弓诀</span>
      <el-select v-model="store.套装选择.弓决" size="small" placeholder="无" clearable>
        <el-option
          v-for="s in 套装列表('弓决')"
          :key="s.键"
          :label="s.名称"
          :value="s.键"
        />
      </el-select>
    </div>
    <div class="set-row">
      <span class="set-label">武器</span>
      <el-select v-model="store.套装选择.武器" size="small" placeholder="无" clearable>
        <el-option
          v-for="s in 套装列表('武器')"
          :key="s.键"
          :label="s.名称"
          :value="s.键"
        />
      </el-select>
    </div>
    <div class="set-row">
      <span class="set-label">防具</span>
      <el-select v-model="store.套装选择.防具" size="small" placeholder="无" clearable>
        <el-option
          v-for="s in 套装列表('防具')"
          :key="s.键"
          :label="s.名称"
          :value="s.键"
        />
      </el-select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { 流派列表 } from '../data/schools.js'
import { 心法列表 } from '../data/xinfa.js'
import { 取套装列表 } from '../data/sets.js'

const store = useSimulatorStore()
const 流派 = ref(store.流派)
const 变体 = ref(store.变体)
const 搜索 = ref('')

const 变体列表 = computed(() => {
  const s = 流派列表.find((x) => x.流派 === 流派.value)
  return s ? s.变体 : []
})

const 过滤心法 = computed(() => {
  const kw = 搜索.value.trim()
  if (!kw) return 心法列表
  return 心法列表.filter((x) => x.includes(kw))
})

function onSchoolChange(val) {
  const s = 流派列表.find((x) => x.流派 === val)
  变体.value = s && s.变体.length ? s.变体[0] : ''
  store.选择流派(流派.value, 变体.value)
}

function onVariantChange(val) {
  store.切换变体(val)
}

function 套装列表(分类) {
  return 取套装列表(分类)
}
</script>

<style scoped>
h3 {
  margin: 0 0 4px;
  font-size: 16px;
}
.school-group,
.variant-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
:deep(.el-radio-button__inner) {
  border-radius: 6px !important;
}
.xinfa-picked {
  min-height: 30px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.hint {
  color: var(--text-soft);
  font-size: 12px;
}
.xinfa-search {
  margin-bottom: 8px;
}
.xinfa-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}
.xinfa-pool-tag {
  cursor: pointer;
}
.set-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.set-label {
  flex: 0 0 40px;
  font-size: 13px;
  color: var(--text-soft);
}
.set-row :deep(.el-select) {
  flex: 1;
}
</style>

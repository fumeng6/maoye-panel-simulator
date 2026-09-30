<template>
  <el-dialog
    :model-value="visible"
    :title="`配置 ${slotName} 词条`"
    :width="dialogWidth"
    append-to-body
    @update:model-value="handleDialogUpdate"
    @close="handleClose"
  >
    <div class="affinity-config-content">
      <div class="slots-list">
        <!-- 宫槽 -->
        <div class="slot-row">
          <div class="slot-label">
            <el-tag type="warning" size="small">宫</el-tag>
            <span class="slot-hint">固定</span>
          </div>
          <el-select
            v-model="localConfig.gong.attribute"
            placeholder="选择词条"
            size="default"
            style="flex: 1"
            :disabled="!hasSchool"
            clearable
            @change="handleAttributeChange('gong')"
          >
            <el-option
              v-for="attr in getAvailableAttributes(词条槽.宫)"
              :key="attr"
              :label="attr"
              :value="attr"
            />
          </el-select>
          <PercentageInput
            v-if="isPercentageSlot('gong')"
            v-model="localConfig.gong.value"
            :min="getMinValue('gong')"
            :max="getMaxValue('gong')"
            :disabled="!localConfig.gong.attribute"
            style="margin-left: 8px"
          />
          <template v-else>
            <el-input-number
              v-model="localConfig.gong.value"
              :min="getMinValue('gong')"
              :max="getMaxValue('gong')"
              :precision="getAttributePrecision('gong')"
              :step="getAttributeStep('gong')"
              size="default"
              style="width: 140px; margin-left: 8px"
              :disabled="!localConfig.gong.attribute"
            />
            <span class="value-unit">{{ getValueUnit('gong') }}</span>
          </template>
        </div>

        <!-- 商/角/徵/羽槽 -->
        <div v-for="s in 四槽" :key="s.key" class="slot-row">
          <div class="slot-label">
            <el-tag type="primary" size="small">{{ s.label }}</el-tag>
          </div>
          <el-select
            v-model="localConfig[s.key].attribute"
            placeholder="选择词条"
            size="default"
            style="flex: 1"
            :disabled="!hasSchool"
            clearable
            @change="handleAttributeChange(s.key)"
          >
            <el-option
              v-for="attr in getAvailableAttributes(s.槽位)"
              :key="attr"
              :label="attr"
              :value="attr"
            />
          </el-select>
          <PercentageInput
            v-if="isPercentageSlot(s.key)"
            v-model="localConfig[s.key].value"
            :min="getMinValue(s.key)"
            :max="getMaxValue(s.key)"
            :disabled="!localConfig[s.key].attribute"
            style="margin-left: 8px"
          />
          <template v-else>
            <el-input-number
              v-model="localConfig[s.key].value"
              :min="getMinValue(s.key)"
              :max="getMaxValue(s.key)"
              :precision="getAttributePrecision(s.key)"
              :step="getAttributeStep(s.key)"
              size="default"
              style="width: 140px; margin-left: 8px"
              :disabled="!localConfig[s.key].attribute"
            />
            <span class="value-unit">{{ getValueUnit(s.key) }}</span>
          </template>
        </div>

        <!-- 定音槽 -->
        <div class="slot-row">
          <div class="slot-label">
            <el-tag type="success" size="small">定音</el-tag>
          </div>
          <el-select
            v-model="localConfig.dingyin.attribute"
            placeholder="选择词条"
            size="default"
            style="flex: 1"
            :disabled="!hasSchool || !canUnlockDingyin"
            clearable
            @change="handleAttributeChange('dingyin')"
          >
            <el-option
              v-for="attr in getAvailableAttributes(词条槽.定音)"
              :key="attr"
              :label="attr"
              :value="attr"
            />
          </el-select>
          <PercentageInput
            v-if="isPercentageSlot('dingyin')"
            v-model="localConfig.dingyin.value"
            :min="getMinValue('dingyin')"
            :max="getMaxValue('dingyin')"
            :disabled="!localConfig.dingyin.attribute"
            style="margin-left: 8px"
          />
          <template v-else>
            <el-input-number
              v-model="localConfig.dingyin.value"
              :min="getMinValue('dingyin')"
              :max="getMaxValue('dingyin')"
              :precision="getAttributePrecision('dingyin')"
              :step="getAttributeStep('dingyin')"
              size="default"
              style="width: 140px; margin-left: 8px"
              :disabled="!localConfig.dingyin.attribute"
            />
            <span class="value-unit">{{ getValueUnit('dingyin') }}</span>
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="footer-content">
        <el-button type="success" :disabled="!canApplyChengyin" @click="handleApplyChengyin">
          {{ chengyinButtonText }}
        </el-button>
        <div class="footer-right">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="handleConfirm">确认配置</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSimulatorStore, CHENGYIN_RATIO } from '../stores/simulator.js'
import PercentageInput from './PercentageInput.vue'
import { ElMessage } from 'element-plus'
import { 词条槽, 调律槽位, 取词条池, 取词条范围, 是百分比词条 } from '../data/affinities.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  slotKey: { type: String, required: true },
  slotName: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue'])

const store = useSimulatorStore()

const windowWidth = ref(window.innerWidth)
const dialogWidth = computed(() => {
  if (windowWidth.value < 768) return '95%'
  if (windowWidth.value < 1200) return '500px'
  return '600px'
})
function handleResize() {
  windowWidth.value = window.innerWidth
}
window.addEventListener('resize', handleResize)
onUnmounted(() => window.removeEventListener('resize', handleResize))

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const 四槽 = [
  { key: 'shang', label: '商', 槽位: 词条槽.商 },
  { key: 'jue', label: '角', 槽位: 词条槽.角 },
  { key: 'zhi', label: '徵', 槽位: 词条槽.徵 },
  { key: 'yu', label: '羽', 槽位: 词条槽.羽 }
]
const 槽位键 = {
  gong: 词条槽.宫,
  shang: 词条槽.商,
  jue: 词条槽.角,
  zhi: 词条槽.徵,
  yu: 词条槽.羽,
  dingyin: 词条槽.定音
}

const localConfig = ref({
  chengyin: false,
  gong: { attribute: null, value: null },
  shang: { attribute: null, value: null },
  jue: { attribute: null, value: null },
  zhi: { attribute: null, value: null },
  yu: { attribute: null, value: null },
  dingyin: { attribute: null, value: null }
})
const beforeChengyinValues = ref({})

const hasSchool = computed(() => store.流派 && store.变体)

const equipmentData = computed(() => {
  const equip = store.装备词条[props.slotKey] || {}
  return {
    chengyin: equip.承音 || false,
    affinities: {
      [词条槽.宫]: equip[词条槽.宫],
      [词条槽.商]: equip[词条槽.商],
      [词条槽.角]: equip[词条槽.角],
      [词条槽.徵]: equip[词条槽.徵],
      [词条槽.羽]: equip[词条槽.羽],
      [词条槽.定音]: equip[词条槽.定音]
    }
  }
})

const canUnlockDingyin = computed(
  () =>
    localConfig.value.shang.attribute &&
    localConfig.value.jue.attribute &&
    localConfig.value.zhi.attribute &&
    localConfig.value.yu.attribute
)

const canApplyChengyin = computed(() => {
  if (!hasSchool.value) return false
  return (
    localConfig.value.gong.attribute &&
    localConfig.value.shang.attribute &&
    localConfig.value.jue.attribute &&
    localConfig.value.zhi.attribute &&
    localConfig.value.yu.attribute &&
    localConfig.value.dingyin.attribute
  )
})

const chengyinButtonText = computed(() =>
  localConfig.value.chengyin ? '取消承音' : '承音'
)

function getAvailableAttributes(槽位) {
  if (!hasSchool.value) return []
  const pool = 取词条池(槽位, props.slotKey, store.流派, store.变体)
  // 商/角/徵/羽 互斥
  if (调律槽位.includes(槽位)) {
    const 当前键 = Object.entries(槽位键).find(([, v]) => v === 槽位)?.[0]
    const 已用 = Object.entries(槽位键)
      .filter(([k, v]) => 调律槽位.includes(v) && k !== 当前键)
      .map(([k]) => localConfig.value[k]?.attribute)
      .filter(Boolean)
    return pool.filter((attr) => !已用.includes(attr))
  }
  return pool
}

function handleAttributeChange(key) {
  const config = localConfig.value[key]
  if (config.attribute) {
    const [, max] = 取词条范围(config.attribute)
    config.value = max
  } else {
    config.value = null
  }
}

function getMinValue(key) {
  const attr = localConfig.value[key].attribute
  if (!attr) return 0
  return 取词条范围(attr)[0]
}

function getMaxValue(key) {
  const attr = localConfig.value[key].attribute
  if (!attr) return 99999
  const [, max] = 取词条范围(attr)
  const chengyinSlots = ['gong', 'shang', 'jue', 'zhi', 'yu']
  if (localConfig.value.chengyin && chengyinSlots.includes(key)) {
    return max * CHENGYIN_RATIO
  }
  return max
}

function isPercentageSlot(key) {
  const attr = localConfig.value[key].attribute
  return attr ? 是百分比词条(attr) : false
}
function getAttributePrecision(key) {
  const attr = localConfig.value[key].attribute
  if (!attr) return 2
  return 是百分比词条(attr) ? 4 : 1
}
function getAttributeStep(key) {
  const attr = localConfig.value[key].attribute
  if (!attr) return 1
  return 是百分比词条(attr) ? 0.0001 : 0.1
}
function getValueUnit(key) {
  const attr = localConfig.value[key].attribute
  return attr && 是百分比词条(attr) ? '%' : ''
}

function handleApplyChengyin() {
  const chengyinSlots = ['gong', 'shang', 'jue', 'zhi', 'yu']
  if (!localConfig.value.chengyin) {
    for (const key of chengyinSlots) {
      const config = localConfig.value[key]
      if (config.attribute) {
        beforeChengyinValues.value[key] = config.value
        const [, max] = 取词条范围(config.attribute)
        config.value = max * CHENGYIN_RATIO
      }
    }
    localConfig.value.chengyin = true
    保存到store()
    ElMessage.success('已应用承音，词条数值调整为满值的94%')
  } else {
    for (const key of chengyinSlots) {
      const config = localConfig.value[key]
      if (config.attribute && beforeChengyinValues.value[key] !== undefined) {
        config.value = beforeChengyinValues.value[key]
      }
    }
    localConfig.value.chengyin = false
    beforeChengyinValues.value = {}
    保存到store()
    ElMessage.success('已取消承音，词条数值已恢复')
  }
}

function 保存到store() {
  for (const [key, 槽位] of Object.entries(槽位键)) {
    const config = localConfig.value[key]
    if (config.attribute && config.value !== null) {
      store.设置词条(props.slotKey, 槽位, config.attribute)
      store.设置词条值(props.slotKey, 槽位, config.value)
    } else {
      store.清空槽位(props.slotKey, 槽位)
    }
  }
  if (localConfig.value.chengyin) store.应用承音(props.slotKey)
  else store.取消承音(props.slotKey)
}

function handleClose() {
  emit('update:modelValue', false)
}
function handleDialogUpdate(val) {
  emit('update:modelValue', val)
}

function handleConfirm() {
  const chengyinEnabled = localConfig.value.chengyin
  if (chengyinEnabled) {
    const chengyinSlots = ['gong', 'shang', 'jue', 'zhi', 'yu']
    for (const key of chengyinSlots) {
      const config = localConfig.value[key]
      if (config.attribute && config.value !== null) {
        const chengyinMax = 取词条范围(config.attribute)[1] * CHENGYIN_RATIO
        if (config.value > chengyinMax) config.value = chengyinMax
      }
    }
  }
  保存到store()
  ElMessage.success('已保存词条配置')
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    const a = equipmentData.value.affinities
    localConfig.value = {
      chengyin: equipmentData.value.chengyin,
      gong: { attribute: a[词条槽.宫]?.名称 || null, value: a[词条槽.宫]?.值 || null },
      shang: { attribute: a[词条槽.商]?.名称 || null, value: a[词条槽.商]?.值 || null },
      jue: { attribute: a[词条槽.角]?.名称 || null, value: a[词条槽.角]?.值 || null },
      zhi: { attribute: a[词条槽.徵]?.名称 || null, value: a[词条槽.徵]?.值 || null },
      yu: { attribute: a[词条槽.羽]?.名称 || null, value: a[词条槽.羽]?.值 || null },
      dingyin: { attribute: a[词条槽.定音]?.名称 || null, value: a[词条槽.定音]?.值 || null }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.affinity-config-content {
  padding: 4px 0;
}
.slots-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.slot-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slot-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 64px;
}
.slot-hint {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}
.value-unit {
  font-size: 14px;
  color: #606266;
}
.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-right {
  display: flex;
  gap: 10px;
}
</style>

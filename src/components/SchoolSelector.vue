<template>
  <div class="school-selector">
    <div class="selector-header">
      <h3 class="selector-title">流派心法</h3>
    </div>

    <div class="selector-body">
      <!-- 左侧：流派选择 -->
      <div class="schools-section">
        <div class="section-title">选择流派</div>
        <div class="schools-grid">
          <div
            v-for="school in schools"
            :key="school.全名"
            :class="['school-card', {
              selected: isSchoolSelected(school),
              disabled: !school.启用
            }]"
            @click="handleSchoolClick(school)"
          >
            <div class="school-name">{{ school.全名 }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：心法配置区 -->
      <div class="xinfa-section">
        <div class="xinfa-slots">
          <div class="section-title">心法配置 ({{ selectedXinfaCount }}/4)</div>
          <div class="slots-grid">
            <div
              v-for="index in 4"
              :key="index"
              :class="['xinfa-slot', {
                filled: index <= selectedXinfaCount,
                disabled: !hasSchoolSelected
              }]"
            >
              <div v-if="index <= selectedXinfaCount" class="slot-content">
                <div class="slot-label">{{ getXinfaName(index - 1) }}</div>
              </div>
              <div v-else class="slot-empty">
                <el-icon><Plus /></el-icon>
                <span>槽位 {{ index }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <el-button type="primary" :disabled="!hasSchoolSelected" @click="openXinfaDialog">
            配置心法
          </el-button>
          <el-button :disabled="selectedXinfaCount === 0" @click="clearXinfa">
            清空心法
          </el-button>
        </div>
      </div>
    </div>

    <!-- 心法选择对话框 -->
    <el-dialog v-model="showXinfaDialog" :width="xinfaDialogWidth" append-to-body>
      <template #header>
        <div class="xinfa-dialog-header">
          <span class="xinfa-dialog-title">心法配置</span>
          <span class="xinfa-dialog-count">已选择 {{ tempSelectedXinfa.length }} / 4</span>
        </div>
      </template>
      <div class="xinfa-dialog-content">
        <div class="xinfa-schools-grid">
          <div v-for="group in groupedXinfa" :key="group.name" class="xinfa-school-block">
            <div class="school-section-title">{{ group.name }}</div>
            <div class="xinfa-2x2-grid">
              <div
                v-for="book in group.books"
                :key="book"
                :class="['xinfa-card', { selected: isXinfaSelected(book) }]"
                @click="toggleXinfa(book)"
              >
                <div class="xinfa-card-content">
                  <span class="xinfa-name">{{ book }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { 流派卡片列表 } from '../data/schools.js'
import { 心法分组 } from '../data/xinfa.js'

const store = useSimulatorStore()

const windowWidth = ref(window.innerWidth)
const xinfaDialogWidth = computed(() => {
  if (windowWidth.value < 768) return '95%'
  if (windowWidth.value < 1200) return '550px'
  return '650px'
})
function handleResize() {
  windowWidth.value = window.innerWidth
}
window.addEventListener('resize', handleResize)
onUnmounted(() => window.removeEventListener('resize', handleResize))

const schools = 流派卡片列表
const showXinfaDialog = ref(false)
const tempSelectedXinfa = ref([])

const hasSchoolSelected = computed(() => store.流派 && store.变体)
const groupedXinfa = computed(() => 心法分组)
const selectedXinfaCount = computed(() => store.心法列表.length)

function isSchoolSelected(school) {
  return store.流派 === school.流派 && store.变体 === school.变体
}

function handleSchoolClick(school) {
  if (!school.启用) {
    ElMessage.info('该流派暂未开放')
    return
  }
  const isSelected = isSchoolSelected(school)
  if (isSelected) {
    store.选择流派('', '')
    ElMessage.success(`已取消选择 ${school.全名}`)
  } else {
    store.选择流派(school.流派, school.变体)
    ElMessage.success(`已选择 ${school.全名}`)
  }
}

function openXinfaDialog() {
  showXinfaDialog.value = true
}
function clearXinfa() {
  store.清空心法()
  ElMessage.success('已清空心法配置')
}

function isXinfaSelected(name) {
  return tempSelectedXinfa.value.includes(name)
}
function toggleXinfa(name) {
  const index = tempSelectedXinfa.value.indexOf(name)
  if (index > -1) {
    tempSelectedXinfa.value.splice(index, 1)
  } else {
    if (tempSelectedXinfa.value.length >= 4) {
      ElMessage.warning('最多只能选择4本心法')
      return
    }
    tempSelectedXinfa.value.push(name)
  }
  store.设置心法列表([...tempSelectedXinfa.value])
}
function getXinfaName(index) {
  return store.心法列表[index] || ''
}

watch(showXinfaDialog, (isOpen) => {
  if (isOpen) tempSelectedXinfa.value = [...store.心法列表]
})
</script>

<style scoped>
.school-selector {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.selector-header {
  padding: 0 16px 12px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.selector-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}
.selector-body {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
  align-items: flex-start;
}
.schools-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-regular);
  margin-bottom: 12px;
}
.schools-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  align-content: start;
}
.school-card {
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--color-bg-secondary);
  position: relative;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-regular);
  padding: 4px;
  aspect-ratio: 1;
  container-type: inline-size;
}
.school-name {
  writing-mode: horizontal-tb;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
@container (max-width: 60px) {
  .school-name {
    writing-mode: vertical-rl;
    white-space: normal;
    overflow: visible;
    letter-spacing: 2px;
  }
}
.school-card:hover:not(.disabled) {
  border-color: var(--color-primary);
  background: var(--color-primary-light-9);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.2);
}
.school-card.selected {
  border-color: var(--color-success);
  background: var(--color-grade-b-bg);
  color: var(--color-success);
}
.school-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-bg-secondary);
}
.xinfa-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.xinfa-slots {
  display: flex;
  flex-direction: column;
}
.slots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: minmax(48px, auto);
  gap: 8px;
}
.xinfa-slot {
  border: 2px dashed var(--color-border-light);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  background: var(--color-bg-secondary);
  min-height: 0;
}
.xinfa-slot.filled {
  border-style: solid;
  border-color: var(--color-success);
  background: var(--color-grade-b-bg);
}
.xinfa-slot.disabled {
  opacity: 0.5;
}
.slot-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--color-text-placeholder);
  font-size: var(--font-size-base);
  height: 100%;
}
.slot-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.slot-label {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-buttons {
  display: flex;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}
.action-buttons .el-button {
  flex: 1;
}
.xinfa-dialog-content {
  padding: 4px 0;
}
.xinfa-dialog-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-right: 8px;
}
.xinfa-dialog-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}
.xinfa-dialog-count {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-regular);
}
.xinfa-schools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.xinfa-school-block {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--color-bg-secondary);
}
.school-section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 8px;
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.xinfa-2x2-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.xinfa-card {
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 4px 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
}
.xinfa-card:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light-9);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.15);
}
.xinfa-card.selected {
  border-color: var(--color-success);
  background: var(--color-grade-b-bg);
  box-shadow: 0 1px 4px rgba(103, 194, 58, 0.25);
}
.xinfa-card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.xinfa-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
@media (max-width: 768px) {
  .selector-body {
    flex-direction: column;
  }
  .schools-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  .xinfa-schools-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .school-section-title {
    font-size: 11px;
  }
  .xinfa-name {
    font-size: 11px;
  }
}
</style>

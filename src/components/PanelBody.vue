<template>
  <div class="panel-body">
    <template v-if="面板">
      <section class="group">
        <div class="group-title">基础属性</div>
        <div v-for="item in 攻击列表" :key="item.名称" class="row">
          <span class="name">{{ item.名称 }}</span>
          <span class="value">{{ item.文本 }}</span>
        </div>
        <div v-for="item in 五维列表" :key="item.名称" class="row">
          <span class="name">{{ item.名称 }}</span>
          <span class="value">{{ item.文本 }}</span>
        </div>
      </section>

      <section class="group">
        <div class="group-title">判定属性</div>
        <div v-for="item in 判定列表" :key="item.名称" class="row">
          <span class="name">{{ item.名称 }}</span>
          <span class="value">
            {{ item.原始 }}
            <span class="eff">({{ item.有效 }})</span>
          </span>
        </div>
      </section>

      <section class="group">
        <div class="group-title">穿透属性</div>
        <div v-for="item in 穿透列表" :key="item.名称" class="row">
          <span class="name">{{ item.名称 }}</span>
          <span class="value">{{ item.文本 }}</span>
        </div>
      </section>

      <section class="group">
        <div class="group-title">增伤属性</div>
        <div v-for="item in 增伤列表" :key="item.名称" class="row">
          <span class="name">{{ item.名称 }}</span>
          <span class="value">
            {{ item.原始 }}
            <span v-if="item.有效" class="eff">({{ item.有效 }})</span>
          </span>
        </div>
      </section>

      <section class="group">
        <div class="group-title">生存属性</div>
        <div v-for="item in 生存列表" :key="item.名称" class="row">
          <span class="name">{{ item.名称 }}</span>
          <span class="value">{{ item.文本 }}</span>
        </div>
      </section>
    </template>

    <div v-else class="empty-hint">请先选择流派</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { 格式化整数, 格式化百分比, 格式化穿透 } from '../domain/panel.js'
import { 是百分比词条 } from '../data/affinities.js'

const store = useSimulatorStore()
const 面板 = computed(() => store.面板)

function 取(名称) {
  return 面板.value?.原始面板?.[名称] || 0
}

const 攻击列表 = computed(() => {
  const p = 面板.value
  if (!p) return []
  const 项 = [{ 名称: '外功攻击', min: '最小外功攻击', max: '最大外功攻击' }]
  const 元素 = p.本系属性
  if (元素) {
    项.push({ 名称: `${元素}攻击`, min: `最小${元素}攻击`, max: `最大${元素}攻击` })
  }
  return 项
    .map((i) => ({
      名称: i.名称,
      文本: `${格式化整数(取(i.min))} ~ ${格式化整数(取(i.max))}`
    }))
    .filter((i) => i.文本 !== '0 ~ 0')
})

const 五维列表 = computed(() =>
  ['劲', '敏', '势'].map((名称) => ({ 名称, 文本: 格式化整数(取(名称)) }))
)

const 判定列表 = computed(() => {
  const eff = 面板.value?.有效面板 || {}
  return [
    { 名称: '精准率', key: '精准率' },
    { 名称: '会心率', key: '会心率' },
    { 名称: '会意率', key: '会意率' }
  ].map((i) => ({
    名称: i.名称,
    原始: 格式化百分比(取(i.名称)),
    有效: 格式化百分比(eff[i.key] || 0)
  }))
})

const 穿透列表 = computed(() => {
  const 列表 = [{ 名称: '外功穿透', key: '外功穿透' }]
  const 元素 = 面板.value?.本系属性
  if (元素) 列表.push({ 名称: `${元素}穿透`, key: `${元素}穿透` })
  if (取('无相穿透')) 列表.push({ 名称: '无相穿透', key: '无相穿透' })
  return 列表
    .map((i) => ({ 名称: i.名称, 文本: 格式化穿透(取(i.key)) }))
    .filter((i) => i.文本 !== '0.0')
})

const 增伤列表 = computed(() => {
  const 增益有效 = 面板.value?.增益有效面板 || {}
  const 名称集 = [
    '全武学增效', '全奇术增伤', '对首领单位增伤', '对玩家单位增伤',
    '会心伤害加成', '会意伤害加成'
  ]
  const 额外 = new Set()
  for (const 装备 of Object.values(store.装备词条)) {
    for (const 词条 of Object.values(装备 || {})) {
      if (词条?.名称 && 词条.值 && !名称集.includes(词条.名称) && 是百分比词条(词条.名称)) {
        额外.add(词条.名称)
      }
    }
  }
  return [...名称集, ...额外]
    .map((名称) => {
      const 原始 = 格式化百分比(取(名称))
      const 有效数值 = 增益有效[名称]
      return {
        名称,
        原始,
        有效: 有效数值 !== undefined ? 格式化百分比(有效数值) : ''
      }
    })
    .filter((i) => i.原始 !== '0.0%')
})

const 生存列表 = computed(() =>
  [
    { 名称: '气血最大值', key: '气血最大值' },
    { 名称: '外功防御', key: '外功防御' }
  ].map((i) => ({ 名称: i.名称, 文本: 格式化整数(取(i.key)) }))
)
</script>

<style scoped>
.group {
  margin-bottom: 14px;
}
.group-title {
  font-size: 12px;
  color: var(--text-soft);
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--border-soft);
}
.name {
  color: var(--text-soft);
}
.value {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
.eff {
  color: var(--accent);
  font-size: 12px;
}
</style>

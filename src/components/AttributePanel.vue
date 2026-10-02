<template>
  <div class="attribute-panel-root">
    <div class="panel-heading"><h2>战斗属性</h2><div class="view-toggle" aria-label="面板显示形式"><button :class="{ active: view === 'chart' }" :aria-pressed="view === 'chart'" @click="view = 'chart'">图表</button><button :class="{ active: view === 'table' }" :aria-pressed="view === 'table'" @click="view = 'table'">表格</button></div></div>
    <div v-if="!store.已选流派" class="empty-panel"><h3>选择流派，开始配装</h3><button class="primary-action" @click="emit('choose-school')">选择流派</button></div>
    <template v-else>
      <div v-if="view === 'chart'" class="chart-view">
        <section class="attack-chart"><div class="section-caption"><h3>攻击</h3><div v-if="data.attacks.length > 2" class="pager"><button aria-label="上一组攻击" :disabled="attackPage === 0" @click="attackPage--">‹</button><span>{{ attackPage + 1 }}/{{ Math.ceil(data.attacks.length / 2) }}</span><button aria-label="下一组攻击" :disabled="(attackPage + 1) * 2 >= data.attacks.length" @click="attackPage++">›</button></div></div>
          <div class="attack-items"><div v-for="item in shownAttacks" :key="item.key" class="attack-item"><div class="metric-line"><span>{{ item.key }}攻击</span><strong class="attack-numbers" :class="{ absorbed: item.absorbedMin || item.absorbedMax, inverted: item.min > item.max }" :title="item.absorbedMin || item.absorbedMax ? '括号为已计入总值的无相攻击贡献' : undefined"><span><small v-if="item.min > item.max">最小</small>{{ 整数(item.min) }}<b v-if="item.absorbedMin">(+{{ 整数(item.absorbedMin) }})</b></span><i>{{ item.min > item.max ? "/" : "～" }}</i><span><small v-if="item.min > item.max">最大</small>{{ 整数(item.max) }}<b v-if="item.absorbedMax">(+{{ 整数(item.absorbedMax) }})</b></span></strong></div><div class="attack-scale"><div v-if="item.min > item.max" class="inverted-tracks" aria-label="攻击下限高于上限，分别展示最小和最大攻击"><div><i :style="{ width: item.min / attackScale * 100 + '%' }"></i></div><div><i :style="{ width: item.max / attackScale * 100 + '%' }"></i></div></div><div v-else class="range-track"><div class="range-bar" :style="{ left: Math.min(item.min, item.max) / attackScale * 100 + '%', width: Math.max(.5, Math.abs(item.max - item.min) / attackScale * 100) + '%' }"></div></div></div></div>
        </div></section>
        <section class="rates-chart"><div class="section-caption"><h3>判定属性</h3></div><div class="rate-rings"><div v-for="item in data.rates" :key="item.key" class="rate-ring" :title="`${item.key}上限 ${item.max}%`"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="33" fill="none" stroke="var(--track)" stroke-width="6"/><circle cx="40" cy="40" r="33" fill="none" :stroke="item.color" stroke-width="6" stroke-linecap="round" pathLength="100" :stroke-dasharray="`${item.ratio} 100`" transform="rotate(-90 40 40)"/></svg><strong class="effective">{{ item.effective >= item.max ? item.max + '%' : 百分比(item.effective) }}</strong><span>白字{{ item.key }}</span><small>{{ 百分比(item.value) }}<em v-if="item.overflow" class="rate-overflow">(↑{{ 百分比(item.overflow) }})</em></small></div></div><div v-if="data.direct.length" class="direct-rates"><span v-for="item in data.direct" :key="item.key">{{ item.key }} <strong class="effective">{{ 百分比(item.value) }}</strong></span></div></section>
        <section class="modifiers-chart"><div class="section-caption"><h3>增伤与穿透</h3><div v-if="data.modifiers.length > modifierPageSize" class="pager"><button aria-label="上一组增伤与穿透" :disabled="modifierPage === 0" @click="modifierPage--">‹</button><span>{{ modifierPage + 1 }}/{{ Math.ceil(data.modifiers.length / modifierPageSize) }}</span><button aria-label="下一组增伤与穿透" :disabled="(modifierPage + 1) * modifierPageSize >= data.modifiers.length" @click="modifierPage++">›</button></div></div>
          <div class="modifier-grid"><div v-for="item in shownModifiers" :key="item.key" class="modifier" :class="{ 'named-move': item.schoolName }" :title="item.max ? `可配置上限 ${item.percent ? 百分比(item.max) : 小数(item.max)}` : item.key"><span class="modifier-school" :aria-hidden="!item.schoolName">{{ item.schoolName }}</span><div class="metric-line"><span>{{ item.moveName }}</span><div class="modifier-number"><strong>{{ 显示增益(item) }}</strong><strong v-if="item.effective !== undefined" class="effective">({{ 显示增益(item, true) }})</strong></div></div><div class="mini-track" :class="{ 'no-track': !item.max }"><i :style="{ width: item.ratio + '%' }"></i></div></div></div>
        </section>
      </div>
      <div v-else class="table-view"><div ref="tableGrid" class="table-grid" :style="{ gridTemplateRows: `repeat(${Math.ceil(shownTable.length / 2)}, minmax(0,1fr))` }"><div v-for="item in shownTable" :key="item.key" class="table-stat"><span :title="item.key">{{ item.key }}</span><div><strong :class="{ effective: item.direct }">{{ item.text }}<em v-if="item.overflow" class="rate-overflow">(↑{{ 百分比(item.overflow) }})</em></strong><strong v-if="item.effective" class="effective">({{ item.effective }})</strong></div></div></div><div v-if="tableRows.length > tablePageSize" class="table-pagination pager"><button aria-label="上一页属性" :disabled="tablePage === 0" @click="tablePage--">‹</button><span>{{ tablePage + 1 }} / {{ Math.ceil(tableRows.length / tablePageSize) }}</span><button aria-label="下一页属性" :disabled="(tablePage + 1) * tablePageSize >= tableRows.length" @click="tablePage++">›</button></div></div>
      <div class="dimension-strip"><span v-for="key in ['劲','敏','势']" :key="key">{{ key }} <strong>{{ 整数(data.raw[key]) }}</strong></span></div>
    </template>
  </div>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useSimulatorStore } from '../stores/simulator.js'
import { 取面板展示, 整数, 小数, 百分比, 显示增益, 显示攻击 } from '../domain/panelDisplay.js'
const emit = defineEmits(['choose-school'])
const store = useSimulatorStore()
const view = ref('chart')
const data = computed(() => 取面板展示(store.$state))
const attackPage = ref(0)
const modifierPage = ref(0)
const tablePage = ref(0)
const tableGrid = ref(null)
const modifierPageSize = 6
const tablePageSize = ref(16)
const resize = new ResizeObserver(entries => {
  for (const { target, contentRect } of entries) {
    if (!contentRect.height) continue
    if (target === tableGrid.value) tablePageSize.value = Math.max(1, Math.floor((contentRect.height + 6) / 50)) * 2
  }
})
watch(tableGrid, (el, old) => { if (old) resize.unobserve(old); if (el) resize.observe(el) })
onBeforeUnmount(() => resize.disconnect())
const attackScale = computed(() => Math.max(1, ...data.value.attacks.flatMap(a => [a.min, a.max])))
const shownAttacks = computed(() => data.value.attacks.slice(attackPage.value * 2, attackPage.value * 2 + 2))
const shownModifiers = computed(() => data.value.modifiers.slice(modifierPage.value * modifierPageSize, (modifierPage.value + 1) * modifierPageSize))
const tableRows = computed(() => [
  ...data.value.attacks.map(a => ({ key: a.key + '攻击', text: 显示攻击(a) })),
  ...data.value.rates.map(a => ({ key: '白字' + a.key, text: 百分比(a.value), effective: 百分比(a.effective), overflow: a.overflow })),
  ...data.value.direct.map(a => ({ key: a.key, text: 百分比(a.value), direct: true })),
  ...data.value.modifiers.map(a => ({ key: a.key, text: 显示增益(a), effective: a.effective !== undefined ? 显示增益(a, true) : '' }))
])
const shownTable = computed(() => tableRows.value.slice(tablePage.value * tablePageSize.value, (tablePage.value + 1) * tablePageSize.value))
watch(() => [store.流派, store.变体, data.value.modifiers.length, modifierPageSize, tablePageSize.value], () => { attackPage.value = 0; modifierPage.value = 0; tablePage.value = 0 })
</script>
<style scoped>
.attribute-panel-root { height:100%; min-height:0; display:flex; flex-direction:column; gap:14px }
.panel-heading,.section-caption,.metric-line { display:flex; justify-content:space-between; align-items:center; gap:10px }
.panel-heading { flex:none } h2 { margin:0; font-size:22px; color:var(--text-strong) } h3 { margin:0; font-size:15px; font-weight:600; color:var(--text) }
.view-toggle { display:flex; gap:3px; padding:3px; background:var(--surface-soft); border-radius:8px }
.view-toggle button { padding:6px 12px; border:0; border-radius:6px; background:transparent; color:var(--muted); font-size:13px; cursor:pointer }
.view-toggle .active { background:var(--surface); color:var(--accent); box-shadow:0 1px 5px #00000012 }
.chart-view { flex:1; min-height:0; display:flex; flex-direction:column; gap:18px }
.section-caption { margin-bottom:10px } .attack-chart,.rates-chart { flex:none }
.attack-items { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px }.attack-item { min-width:0; margin-bottom:8px }.attack-item .metric-line { flex-direction:column;align-items:flex-start;gap:8px }.attack-item strong { white-space:nowrap } .metric-line { font-size:14px; line-height:20px }
.metric-line>span { min-width:0; color:var(--text) } .attack-item strong { font-size:22px; font-weight:700; color:var(--text-strong); font-variant-numeric:tabular-nums }
.range-track { height:6px; background:var(--track); border-radius:3px; position:relative; margin-top:9px }
.range-bar { height:100%; position:absolute; border-radius:3px; background:var(--accent) }
.rate-rings { display:flex; justify-content:space-around; gap:8px }.rate-ring { position:relative; display:flex; align-items:center; flex-direction:column; flex:1; min-width:0 }
.rate-ring svg { width:86px; height:86px }.rate-ring>strong { position:absolute; top:33px; font-size:18px; font-variant-numeric:tabular-nums }.rate-ring>span { font-size:14px; margin-top:5px }.rate-ring small { color:var(--muted); font-size:13px; margin-top:4px }
.direct-rates { display:flex; justify-content:center; flex-wrap:wrap; gap:8px 20px; font-size:13px; margin-top:12px; color:var(--text) }.direct-rates strong { font-size:15px; margin-left:5px }
.effective { color:var(--effective)!important; font-weight:750!important }
.modifiers-chart { flex:1; min-height:0; display:flex; flex-direction:column }.modifier-grid { flex:1; min-height:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr)); gap:8px 16px }.modifier { display:flex; flex-direction:column; justify-content:center; min-width:0; min-height:0 }
.modifier .metric-line { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 6px }.modifier .metric-line>span { font-size:13px }.modifier-number { margin-left:auto; display:flex; gap:2px; white-space:nowrap; font-size:15px; font-variant-numeric:tabular-nums }.modifier-number strong { font-weight:550; color:var(--text-strong) }
.mini-track { height:3px; background:var(--track); border-radius:2px; margin-top:4px; flex:none }.mini-track i { height:100%; display:block; border-radius:2px; background:var(--accent) }
.dimension-strip { display:flex; justify-content:space-around; border-top:1px solid var(--border); padding-top:12px; font-size:14px; color:var(--muted); flex:none }.dimension-strip strong { color:var(--text-strong); font-size:16px; margin-left:8px }
.pager { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--muted) }.pager button { width:28px; height:28px; border:1px solid var(--border); background:var(--surface-soft); border-radius:5px; color:var(--accent); font-size:18px; cursor:pointer }.pager button:disabled { opacity:.3; cursor:default }
.table-view { flex:1; min-height:0; display:flex; flex-direction:column }.table-grid { min-height:0; flex:1; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px 18px }.table-stat { min-height:0; min-width:0; display:flex; flex-direction:column; justify-content:center; gap:6px; border-bottom:1px solid var(--border) }.table-stat>span { font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }.table-stat>div { font-size:15px; white-space:nowrap; font-variant-numeric:tabular-nums }.table-stat strong { font-weight:550; color:var(--text-strong) }.table-pagination { justify-content:center; margin-top:8px; flex:none }
.empty-panel { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px }.primary-action { padding:12px 24px; background:var(--accent); color:#fff; border:0; border-radius:8px; cursor:pointer }
@media(max-height:780px){.attribute-panel-root{gap:10px}.chart-view{gap:12px}.section-caption{margin-bottom:7px}.rate-ring svg{width:68px;height:68px}.rate-ring>strong{top:25px;font-size:16px}.rate-ring>span{margin-top:3px}.direct-rates{margin-top:7px}.attack-item{margin-bottom:8px}.range-track{margin-top:6px}.dimension-strip{padding-top:8px}}
@media(max-width:1023px){h2{font-size:20px}.view-toggle button{min-height:30px}.pager button{min-width:30px}.metric-line{font-size:13px}.modifier-number{font-size:14px}.attack-item strong{font-size:21px}.attribute-panel-root{gap:10px}}
@media(max-height:720px) and (max-width:1023px){.chart-view{gap:8px}.section-caption{margin-bottom:4px}.rate-ring svg{width:56px;height:56px}.rate-ring>strong{top:20px;font-size:13px}.rate-ring>span,.rate-ring small{font-size:12px;margin-top:2px}.direct-rates{font-size:12px;margin-top:5px}.direct-rates strong{font-size:13px}.attack-item{margin-bottom:6px}.attack-item strong{font-size:19px}.range-track{height:4px;margin-top:4px}.dimension-strip{font-size:12px;padding-top:6px}.dimension-strip strong{font-size:14px}.table-grid{gap:5px 10px}.table-stat>div{font-size:13px}}
@media(max-height:720px) and (max-width:1023px){.rates-chart>.section-caption{display:none}.chart-view{gap:6px}.attribute-panel-root{gap:6px}.attack-chart .pager button{height:22px;min-height:22px}.attack-chart .section-caption{margin-bottom:2px}}
.attack-numbers{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 4px;max-width:100%}.attack-numbers>span{white-space:nowrap}.attack-numbers b{font-size:.7em;font-weight:700;color:var(--success)}.attack-numbers i{font-style:normal;font-size:.7em;color:var(--muted)}.attack-numbers.absorbed{font-size:18px}.rate-ring .rate-overflow,.rate-overflow{font-size:11px;color:var(--danger)}.rate-overflow.hidden{visibility:hidden}
@media(max-width:1023px){.attack-numbers.absorbed{font-size:16px}.modifier .metric-line{gap:0}.modifier .metric-line>span{font-size:12px;line-height:15px}.modifier-number{font-size:13px;line-height:17px}.modifier-grid{gap:4px 12px}.rate-ring>span{font-size:12px}}
@media(max-height:720px) and (max-width:1023px){.attack-item .metric-line{gap:3px}.attack-numbers.absorbed{font-size:15px}.rate-ring .rate-overflow{font-size:10px;line-height:12px;margin-top:0}.rate-ring svg{width:50px;height:50px}.rate-ring>strong{top:17px}.chart-view{gap:4px}.attribute-panel-root{gap:4px}.modifier-grid{gap:3px 10px}.modifier-number{font-size:12px;line-height:15px}.modifier .metric-line>span{font-size:11px;line-height:13px}.mini-track{margin-top:3px}.section-caption{margin-bottom:2px}.dimension-strip{padding-top:4px}}
.rate-overflow{font-style:normal}
@media(max-height:720px) and (max-width:1023px){.attack-numbers.absorbed{font-size:14px;gap:0 2px}.attack-numbers b{font-size:.65em}.modifier-grid{grid-template-rows:repeat(3,minmax(34px,1fr))}.rate-ring .rate-overflow{font-size:9px;white-space:nowrap}}
.modifier-school{min-height:17px;flex:none;font-size:12px;line-height:17px;color:var(--muted)}.modifier .metric-line>span{white-space:nowrap}.modifier-number{letter-spacing:-.3px}
.attack-numbers small{font-size:11px;font-weight:500;color:var(--muted);margin-right:4px}.attack-numbers.inverted{font-size:19px}.attack-numbers.inverted>span:first-child{color:var(--accent)}.attack-numbers.inverted>span:last-child{color:var(--effective)}
.inverted-tracks{display:grid;gap:3px;margin-top:9px}.inverted-tracks>div{height:3px;border-radius:3px;background:var(--track)}.inverted-tracks i{display:block;height:100%;border-radius:3px;background:var(--accent)}.inverted-tracks>div:last-child i{background:var(--effective)}
@media(min-width:1024px){.modifier .metric-line>span{font-size:11px}.modifier-number{font-size:13px}}
@media(max-width:1023px){.modifier-school{min-height:14px;font-size:11px;line-height:14px}.modifier .metric-line>span{font-size:10px}.modifier-number{font-size:12px}.attack-numbers.inverted{font-size:17px}.attack-numbers small{font-size:10px;margin-right:2px}}
@media(max-height:720px) and (max-width:1023px){.inverted-tracks{margin-top:4px;gap:2px}.inverted-tracks>div{height:2px}.modifier-school{min-height:12px;font-size:10px;line-height:12px}.modifier-number{font-size:11px}}
.mini-track.no-track{visibility:hidden}
@media(min-width:1024px){.modifier.named-move .metric-line>span{font-size:10px}.modifier.named-move .modifier-number{font-size:12px}}
.attack-item{display:flex;flex-direction:column}.attack-item .metric-line{flex:1;justify-content:flex-start}.attack-scale{height:9px;flex:none;margin-top:9px}.attack-scale .range-track,.attack-scale .inverted-tracks{margin-top:0}
@media(max-height:780px){.attack-scale{margin-top:6px}}
@media(max-height:720px) and (max-width:1023px){.attack-scale{height:6px;margin-top:4px}}
@media(max-width:1023px) and (min-height:721px) and (max-height:900px){.chart-view{gap:10px}.section-caption{margin-bottom:7px}.rate-ring svg{width:68px;height:68px}.rate-ring>strong{top:25px;font-size:16px}.modifier-grid{grid-template-rows:repeat(3,minmax(34px,1fr))}}
@media(max-width:389px){.modifier.named-move .metric-line>span{font-size:9px}.modifier.named-move .modifier-number{font-size:11px}}
.rate-ring small{white-space:nowrap}.rate-overflow{color:var(--danger);font-style:normal;font-weight:650;margin-left:0}.rate-ring .rate-overflow{font-size:inherit}
.attack-numbers b{margin-left:0}
@media(max-width:1023px){.attack-numbers.absorbed{font-size:14px;gap:0 2px}.attack-numbers b{font-size:.72em}.rate-ring small{font-size:11px}.rate-ring .rate-overflow{font-size:11px}}
@media(max-height:720px) and (max-width:1023px){.rate-ring small,.rate-ring .rate-overflow{font-size:10px}}
/* 留出完整的两行标题高度，行间隔不依赖剩余空间。 */
.modifiers-chart{flex:none}.modifier-grid{flex:none;grid-template-rows:repeat(3,44px);row-gap:10px}.dimension-strip{margin-top:auto}
@media(min-width:1024px){.attribute-panel-root{gap:12px}.chart-view{gap:12px}.section-caption{margin-bottom:8px}.rate-ring svg{width:76px;height:76px}.rate-ring>strong{top:28px}.direct-rates{margin-top:8px}}
@media(max-width:1023px){.modifier-grid{grid-template-rows:repeat(3,38px);row-gap:6px}}
@media(max-width:1023px) and (max-height:720px){.chart-view{gap:2px}.modifier-grid{grid-template-rows:repeat(3,34px);row-gap:6px}}
@media(min-width:1024px) and (max-height:820px){.chart-view{gap:8px}}
</style>

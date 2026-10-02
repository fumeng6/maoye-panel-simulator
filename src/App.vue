<template>
  <div class="app-stage" :class="{ 'layout-fill': fillScreen }"><BackgroundScene :mode="background" /><div class="app-container">
    <header class="app-header"><div class="logo"><h1>燕云面板模拟器</h1><span>{{ 数据.元数据.数据版本 }}</span></div><div class="header-actions"><el-button aria-label="切换夜间模式" :aria-pressed="dark" @click="dark=!dark"><el-icon><component :is="dark ? Sunny : Moon" /></el-icon></el-button><el-dropdown trigger="click" @command="background=$event"><el-button aria-label="背景设置" :title="backgroundModes.find(mode => mode.key === background)?.label"><el-icon><Picture /></el-icon><span class="background-label">背景</span></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="mode in backgroundModes" :key="mode.key" :command="mode.key" :class="{ 'background-selected': background === mode.key }">{{ background === mode.key ? '✓ ' : '' }}{{ mode.label }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown><el-button v-if="!isMobile" :aria-label="fillScreen ? '切换为最佳尺寸' : '切换为铺满屏幕'" :aria-pressed="fillScreen" @click="fillScreen=!fillScreen"><el-icon><component :is="fillScreen ? ScaleToOriginal : FullScreen" /></el-icon><span class="size-label">{{ fillScreen ? '铺满屏幕' : '最佳尺寸' }}</span></el-button><el-button @click="plansOpen=true">方案管理</el-button><el-button :disabled="!store.已选流派" @click="shareOpen=true">分享图</el-button></div></header>
    <section class="config-strip" aria-label="配装选择">
      <button class="school-trigger" @click="schoolOpen=true"><small>武学流派</small><strong>{{ store.已选流派 ? store.流派+store.变体 : '选择流派' }}</strong><span>⌄</span></button>
      <div class="heart-config"><button class="heart-trigger" :disabled="!store.已选流派" @click="heartOpen=true">心法 <span>⌄</span></button><div class="heart-results"><button v-for="book in store.心法列表" :key="book" :class="qualityClass(book)" @click="heartOpen=true">{{ book }}</button><span v-if="!store.心法列表.length" class="placeholder">未选择</span></div></div>
      <label v-for="category in setCategories" :key="category.key" class="set-config"><small>{{ category.label }}</small><el-select v-model="store.套装选择[category.key]" :disabled="!store.已选流派" clearable placeholder="未选择" :aria-label="category.label" popper-class="set-options"><template #label="{ label, value }"><span class="set-selection"><span>{{ label }}</span><small v-if="!isMobile">{{ setBonus(取套装(category.key, value)) }}</small></span></template><el-option v-for="s in 取套装列表(category.key)" :key="s.键" :label="s.名称" :value="s.键"><strong>{{ s.名称 }}</strong><small>两件套 · {{ setBonus(s) }}</small></el-option></el-select></label>
    </section>
    <main class="main-grid"><section v-show="!isMobile || currentPage==='panel'" class="module-card"><AttributePanel @choose-school="schoolOpen=true" /></section><section v-show="!isMobile || currentPage!=='panel'" class="module-card"><EquipmentManager :group="isMobile ? (currentPage==='armor' ? 'armor' : 'weapons') : 'all'" /></section></main>
    <SchoolSelector v-model:school-open="schoolOpen" v-model:heart-open="heartOpen" /><PlanManager v-model="plansOpen" /><ShareDialog v-model="shareOpen" />
    <nav v-if="isMobile" class="mobile-tab-bar" aria-label="功能切换"><button v-for="tab in tabs" :key="tab.key" :class="{active:currentPage===tab.key}" :aria-current="currentPage===tab.key ? 'page' : undefined" @click="currentPage=tab.key"><el-icon><component :is="tab.icon" /></el-icon><span>{{ tab.label }}</span></button></nav>
    <div v-if="saveError" class="save-error" role="alert">{{ saveError }}</div>
  </div></div>
</template>
<script setup>
import { ref, watch } from 'vue'
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus'
import { DataAnalysis, SetUp, Grid, Moon, Sunny, Picture, FullScreen, ScaleToOriginal } from '@element-plus/icons-vue'
import { useSimulatorStore } from './stores/simulator.js'
import { usePlansStore } from './stores/plans.js'
import { useMediaQuery } from './composables/useMediaQuery.js'
import { 心法记录 } from './data/xinfa.js'
import { 取套装列表, 取套装 } from './data/sets.js'
import { 格式化词条 } from './data/affinities.js'
import 数据 from './data/game/规则.json'
import AttributePanel from './components/AttributePanel.vue'
import SchoolSelector from './components/SchoolSelector.vue'
import EquipmentManager from './components/EquipmentManager.vue'
import PlanManager from './components/PlanManager.vue'
import ShareDialog from './components/ShareDialog.vue'
import BackgroundScene from './components/BackgroundScene.vue'
const store=useSimulatorStore(), plans=usePlansStore()
const isMobile=useMediaQuery('(max-width:1023px)'), currentPage=ref('panel'), schoolOpen=ref(false), heartOpen=ref(false), plansOpen=ref(false), shareOpen=ref(false), saveError=ref('')
const tabs=[{key:'panel',label:'战斗面板',icon:DataAnalysis},{key:'weapons',label:'武器四件',icon:SetUp},{key:'armor',label:'防具四件',icon:Grid}]
function qualityClass(name){return 'quality-'+({金色:'gold',紫色:'purple',蓝色:'blue'}[心法记录[name]?.品质] || 'unknown')}
const setCategories=[{key:'弓决',label:'弓玦'},{key:'武器',label:'武器套装'}]
function setBonus(set){return set ? Object.entries(set.面板加成).map(([name,value])=>`${name} +${格式化词条(name,value)}`).join(' · ') : ''}
const storageKey='maoye-panel-loadout-v1'
const dark=ref(false)
const backgroundModes=[{key:'clouds',label:'山水流云'},{key:'stars',label:'星河流萤'},{key:'bamboo',label:'风起竹影'},{key:'plain',label:'简洁静态'}]
const background=ref('clouds'), fillScreen=ref(false)
try{fillScreen.value=localStorage.getItem('maoye-panel-fill-screen')==='true'}catch{}
watch(fillScreen,value=>{try{localStorage.setItem('maoye-panel-fill-screen',String(value))}catch{}})
try{const saved=localStorage.getItem('maoye-panel-background');if(backgroundModes.some(mode=>mode.key===saved))background.value=saved}catch{}
watch(background,value=>{try{localStorage.setItem('maoye-panel-background',value)}catch{}})
try{dark.value=localStorage.getItem('maoye-panel-theme')==='dark' || (!localStorage.getItem('maoye-panel-theme') && matchMedia('(prefers-color-scheme:dark)').matches)}catch{}
watch(dark,value=>{document.documentElement.classList.toggle('dark',value);try{localStorage.setItem('maoye-panel-theme',value?'dark':'light')}catch{}},{immediate:true})
plans.restore()
try{const saved=localStorage.getItem(storageKey);if(plans.active)store.加载配置(plans.active.config);else if(saved)store.加载配置(JSON.parse(saved))}catch{saveError.value='保存的配装无法读取，可通过方案管理重新导入'}
store.$subscribe(()=>{
  if(!store.已选流派)return
  try{const config=store.导出配置();localStorage.setItem(storageKey,JSON.stringify(config));plans.updateCurrent(config);saveError.value=''}catch{saveError.value='浏览器无法保存，请通过方案管理导出'}
},{detached:true,flush:'post'})
</script>
<style scoped>
.app-stage{position:relative;isolation:isolate;height:100dvh;display:grid;place-items:center;background:var(--app-bg)}.app-container{position:relative;z-index:1;width:min(1280px,100%);height:min(800px,100dvh);border-radius:16px;box-shadow:0 24px 80px #0a173329,0 0 0 1px var(--border);display:flex;flex-direction:column;background:var(--app-bg);overflow:hidden}.app-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;gap:14px;background:var(--surface);border-bottom:1px solid var(--border);flex:none}.logo{display:flex;align-items:baseline;gap:12px;min-width:0}.logo h1{font-size:19px;color:var(--text-strong);margin:0;white-space:nowrap}.logo>span{font-size:11px;color:var(--muted)}.header-actions{display:flex;gap:8px;flex:none}.header-actions .el-button{margin:0}.config-strip{margin:12px 20px 0;display:grid;grid-template-columns:140px minmax(0,1fr) 160px 160px;align-items:center;gap:20px;padding:12px 16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);flex:none}.school-trigger{border:0;background:transparent;position:relative;text-align:left;color:var(--text-strong);padding:0 24px 0 0;cursor:pointer}.school-trigger small,.set-config>small{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}.school-trigger strong{font-size:19px}.school-trigger>span{position:absolute;right:0;top:22px;color:var(--muted)}.heart-config{display:flex;gap:12px;align-items:center;min-width:0}.heart-trigger{border:1px solid var(--border);border-radius:7px;padding:8px 12px;white-space:nowrap;background:var(--surface-soft);color:var(--text);cursor:pointer;font-size:14px}.heart-trigger:disabled{opacity:.5;cursor:default}.heart-results{display:flex;flex-wrap:wrap;gap:6px;min-width:0}.heart-results button{font-size:13px;font-weight:650;background:var(--book-bg,var(--surface-soft));color:var(--book-color,var(--text));border:1px solid var(--book-border,var(--border));border-radius:6px;padding:6px 9px;cursor:pointer}.placeholder{font-size:13px;color:var(--muted)}.set-config{min-width:0}.set-config .el-select{width:100%}.main-grid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(400px,1.25fr) minmax(0,1.75fr);grid-template-rows:minmax(0,1fr);gap:16px;padding:14px 20px 18px}.module-card{padding:18px;min-width:0;min-height:0;height:100%}.mobile-tab-bar{display:flex;background:var(--surface);border-top:1px solid var(--border);padding:4px 8px calc(4px + env(safe-area-inset-bottom));flex:none}.mobile-tab-bar button{flex:1;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:8px;background:transparent;color:var(--muted);font-size:12px;cursor:pointer}.mobile-tab-bar .el-icon{font-size:18px}.mobile-tab-bar button.active{color:var(--accent);background:var(--surface-soft);font-weight:650}.save-error{position:fixed;bottom:60px;left:20px;background:var(--surface);border:1px solid var(--border);padding:10px;font-size:12px;color:var(--el-color-danger)}
@media(min-width:1024px){.main-grid{grid-template-columns:400px minmax(0,1fr);gap:12px;padding:12px}.module-card{padding:14px}.config-strip{margin:10px 12px 0;gap:14px;grid-template-columns:120px minmax(0,1fr) 140px 140px}}
@media(max-width:1023px){.app-container{width:100%;height:100dvh;border-radius:0;box-shadow:none}.app-header{padding:10px 12px}.logo h1{font-size:16px}.logo>span{display:none}.header-actions{gap:5px}.header-actions .el-button{padding:7px 9px;font-size:12px}.config-strip{margin:8px 10px 0;grid-template-columns:1fr 1fr;gap:10px 12px;padding:10px 12px}.school-trigger{grid-column:1}.heart-config{grid-column:2;grid-row:1;gap:6px;flex-direction:column;align-items:flex-start}.heart-trigger{border:0;background:transparent;padding:0;font-size:12px;color:var(--muted)}.heart-results{gap:4px}.heart-results button{font-size:11px;padding:3px 5px}.school-trigger strong{font-size:19px}.set-config{display:flex;align-items:center;gap:8px}.set-config>small{margin:0;white-space:nowrap;font-size:11px}.set-config .el-select{min-width:0;flex:1}.main-grid{display:flex;padding:10px}.module-card{width:100%;padding:14px}.main-grid>section{flex:1}}
@media(max-width:1023px) and (max-height:720px){.app-header{padding:7px 10px}.config-strip{padding:8px 10px;gap:7px 10px}.main-grid{padding:8px 10px}.module-card{padding:12px}.mobile-tab-bar button{min-height:42px}.set-config .el-select{--el-component-size:30px}}
.config-strip{grid-template-columns:minmax(140px,1fr) minmax(280px,2fr) minmax(140px,1fr) minmax(140px,1fr);gap:12px;padding:10px;background:linear-gradient(110deg,var(--surface),var(--surface-soft))}.school-trigger,.heart-config,.set-config{height:72px;padding:10px 14px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}.school-trigger>span{right:12px;top:31px}.school-trigger small{margin-bottom:3px}.heart-config{flex-direction:column;align-items:stretch;gap:6px}.heart-trigger{padding:0;border:0;background:transparent;text-align:left;font-size:12px;color:var(--muted)}.heart-results{flex-wrap:nowrap}.heart-results button{flex:1;text-align:center;padding:7px 3px;font-size:12px;white-space:nowrap}.set-config>small{margin-bottom:5px}
@media(max-width:1023px){.config-strip{grid-template-columns:1fr 1fr;gap:7px;padding:7px}.school-trigger,.heart-config{height:51px;padding:6px 8px}.school-trigger small{display:none}.school-trigger>span{top:12px;right:8px}.heart-config{flex-direction:row;align-items:center;gap:6px}.heart-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));flex:1;gap:3px}.heart-results button{font-size:10px;padding:3px 2px}.heart-trigger{white-space:nowrap;font-size:11px}.set-config{height:38px;padding:3px 6px;gap:5px}.set-config>small{font-size:10px;margin:0}.set-config .el-select{--el-component-size:30px}}
@media(min-width:1024px) and (max-width:1280px), (min-width:1024px) and (max-height:800px){.app-container{border-radius:0}}
.background-label,.size-label{margin-left:5px}
.set-config{padding:8px 10px;display:flex;flex-direction:column;align-items:stretch;gap:3px}.set-config>small{margin:0;line-height:14px}.set-config .el-select{flex:none;--el-component-size:32px}.set-selection{display:flex;align-items:center;gap:6px;line-height:20px;white-space:nowrap;font-size:13px}.set-selection>small{font-size:11px;color:var(--accent)}
@media(min-width:1024px){.config-strip{grid-template-columns:minmax(120px,.8fr) minmax(240px,1.7fr) repeat(2,minmax(210px,1fr))}}
@media(max-width:1023px){.set-config{height:38px;padding:3px 6px;flex-direction:row;align-items:center;gap:5px}.set-config .el-select{flex:1;--el-component-size:30px}}
.layout-fill{padding:12px}.layout-fill .app-container{width:100%;height:calc(100dvh - 24px);border-radius:16px}
@media(max-width:1023px){.background-label{display:none}.layout-fill{padding:0}.layout-fill .app-container{height:100dvh;border-radius:0}}
</style>

<template>
  <div class="equipment-manager">
    <div class="manager-header"><h2>装备词条</h2><el-button :disabled="!store.已配槽数" @click="clearAll">清空所有词条</el-button></div>
    <div class="equipment-groups" :class="{ 'single-group': group !== 'all' }">
      <section v-for="section in visibleGroups" :key="section.key" class="equipment-group">
        <div class="slots-grid">
          <button v-for="slot in section.slots" :key="slot.key" class="slot-card" :disabled="!store.已选流派" :aria-label="`配置${slot.name}词条`" @click="openAffinityConfig(slot)">
            <div class="slot-header"><span class="slot-name">{{ slot.name }}<small v-if="weaponName(slot)">{{ weaponName(slot) }}</small></span><span v-if="store.装备词条[slot.key]?.承音" class="chengyin-label">承音</span></div>
            <div class="slot-content"><div v-for="tone in Object.values(词条槽)" :key="tone" class="affinity-item" :class="[tone === '宫' ? 'tone-gold' : tone === '定音' ? 'tone-green' : 'tone-blue', {empty: !store.装备词条[slot.key]?.[tone]?.名称}]" :title="fullLabel(slot.key,tone)"><span class="affinity-slot">{{ tone === '定音' ? '定' : tone }}</span><span class="affinity-name" :class="{ 'split-dingyin': isArmorDingyin(slot.key, tone) }"><span v-for="(line, index) in overviewLines(slot.key, tone)" :key="index">{{ line }}</span></span><span class="affinity-value">{{ store.装备词条[slot.key]?.[tone]?.名称 ? 格式化词条(store.装备词条[slot.key][tone].名称, store.装备词条[slot.key][tone].值) : '—' }}</span></div></div>
          </button>
        </div>
      </section>
    </div>
    <AffinityConfigDialog v-model="showAffinityDialog" :slot-key="currentSlot.key" :slot-name="currentSlot.name" @next="openNext" />
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useSimulatorStore } from '../stores/simulator.js'
import AffinityConfigDialog from './AffinityConfigDialog.vue'
import { 词条槽, 格式化词条 } from '../data/affinities.js'
import { 取流派配置 } from '../data/schools.js'

const props = defineProps({ group: { type: String, default: 'all' } })
const store = useSimulatorStore()
const showAffinityDialog = ref(false)
const currentSlot = ref({ key: '', name: '' })
const groups = [
  { key: 'weapons', name: '武器四件', slots: [{key:'主武器',name:'主武器'},{key:'副武器',name:'副武器'},{key:'环',name:'环'},{key:'佩',name:'佩'}] },
  { key: 'armor', name: '防具四件', slots: [{key:'头',name:'冠胄'},{key:'胸',name:'胸甲'},{key:'胫甲',name:'胫甲'},{key:'腕甲',name:'腕甲'}] }
]
const visibleGroups = computed(() => groups.filter(g => props.group === 'all' || props.group === g.key))
async function clearAll() {
  try { await ElMessageBox.confirm('清空八件装备的所有词条？流派、心法和套装会保留。', '清空词条', { confirmButtonText: '清空', cancelButtonText: '取消' }); store.重置装备() } catch (e) { if (e !== 'cancel' && e !== 'close') throw e }
}
function weaponName(slot) { return 取流派配置(store.流派, store.变体)?.武器?.[slot.key] || '' }
function openAffinityConfig(slot) { currentSlot.value = { key: slot.key, name: [slot.name, weaponName(slot)].filter(Boolean).join(' · ') }; showAffinityDialog.value = true }
function openNext() {
  const order = groups.flatMap(g => g.slots).map(s => s.key)
  const key = order[order.indexOf(currentSlot.value.key) + 1]
  const slot = groups.flatMap(g => g.slots).find(s => s.key === key)
  if (slot) openAffinityConfig(slot)
}
function isArmorDingyin(key, tone) { return tone === '定音' && groups[1].slots.some(slot => slot.key === key) && store.装备词条[key]?.[tone]?.名称?.includes('·') }
function overviewLines(key, tone) {
  const name = store.装备词条[key]?.[tone]?.名称 || '待配置'
  return isArmorDingyin(key, tone) ? [name.slice(0, name.indexOf('·')), name.slice(name.indexOf('·') + 1)] : [name]
}
function fullLabel(key,tone) { const item = store.装备词条[key]?.[tone]; return item?.名称 ? `${tone} · ${item.名称} ${格式化词条(item.名称,item.值)}` : `${tone} · 未配置` }
</script>
<style scoped>
.equipment-manager{height:100%;min-height:0;display:flex;flex-direction:column;gap:12px}.manager-header{display:flex;justify-content:space-between;align-items:center;flex:none}.manager-header h2{font-size:18px;margin:0;color:var(--text-strong)}.manager-header .el-button{font-size:12px}.equipment-groups{flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.equipment-group{min-height:0;display:flex;flex-direction:column;gap:8px}.group-heading h3{font-size:13px;font-weight:550;margin:0;color:var(--muted)}.slots-grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:8px}.slot-card{border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--surface);display:flex;flex-direction:column;cursor:pointer;padding:0;text-align:left;min-width:0;min-height:0}.slot-card:hover{border-color:var(--accent)}.slot-card:disabled{cursor:default;opacity:.65}.slot-header{display:flex;align-items:center;gap:4px;justify-content:space-between;padding:9px 8px;background:var(--surface-soft);border-bottom:1px solid var(--border);flex:none;min-height:38px}.slot-name{display:flex;align-items:baseline;gap:5px;white-space:nowrap;font-size:13px;font-weight:600;color:var(--text-strong);min-width:0}.slot-name small{font-size:12px;font-weight:400;color:var(--muted)}.chengyin-label{font-size:11px;color:var(--success);white-space:nowrap}.slot-content{padding:6px;flex:1;min-height:0;display:grid;grid-template-rows:repeat(5,minmax(0,1fr)) minmax(32px,1.3fr);gap:5px}.affinity-item{display:flex;align-items:center;gap:4px;border:1px solid;border-radius:5px;padding:3px 4px;min-height:0;min-width:0}.tone-gold{color:var(--tone-gold);background:var(--tone-gold-bg);border-color:var(--tone-gold-border)}.tone-blue{color:var(--tone-blue);background:var(--tone-blue-bg);border-color:var(--tone-blue-border)}.tone-green{color:var(--tone-green);background:var(--tone-green-bg);border-color:var(--tone-green-border)}.affinity-item.empty{background:var(--surface-soft);border-color:var(--border)}.affinity-slot{flex:none;font-size:12px;font-weight:600}.affinity-name{flex:1;min-width:0;font-size:12px;line-height:15px;color:var(--text);overflow-wrap:anywhere}.affinity-item:has(.split-dingyin){display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:repeat(2,15px);row-gap:0;align-content:center}.affinity-name.split-dingyin{display:contents}.split-dingyin>span:first-child{grid-column:2;grid-row:1;color:var(--muted)}.split-dingyin>span:last-child{grid-column:2 / 4;grid-row:2}.affinity-item:has(.split-dingyin) .affinity-slot{grid-column:1;grid-row:1 / 3}.affinity-item:has(.split-dingyin) .affinity-value{grid-column:3;grid-row:1;line-height:15px}.empty .affinity-name,.empty .affinity-value{color:var(--muted)}.affinity-value{flex:none;font-size:12px;color:var(--text-strong);font-weight:650;font-variant-numeric:tabular-nums}.single-group{grid-template-columns:minmax(0,1fr)}
@media(max-width:1023px){.slots-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:10px}.slot-header{min-height:36px}.affinity-name{font-size:12px}.affinity-value{font-size:12px}.equipment-manager{gap:10px}}
@media(max-height:760px){.equipment-manager{gap:8px}.equipment-groups{gap:8px}.slot-content{padding:5px;gap:4px}.slot-header{padding:6px 8px;min-height:32px}.affinity-item{padding:2px 4px}.group-heading h3{font-size:12px}}
@media(max-width:1023px) and (max-height:720px){.slot-content{padding:3px;gap:2px;grid-template-rows:repeat(5,minmax(0,1fr)) minmax(28px,1.5fr)}.affinity-item{padding:1px 3px}.affinity-item:has(.split-dingyin){grid-template-rows:repeat(2,12px)}.affinity-item:has(.split-dingyin) .affinity-value{line-height:12px}.affinity-name{font-size:11px;line-height:12px}.affinity-value,.affinity-slot{font-size:11px}.slots-grid{gap:8px}.slot-header{min-height:28px;padding:5px 7px}.equipment-group{gap:5px}}
</style>

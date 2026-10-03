// 仅用内存中的本地存储和模拟云端验证方案操作，不接触用户账号或方案。
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref, watch } from 'vue'
import { usePlansStore } from '../src/stores/plans.js'
import { useSimulatorStore } from '../src/stores/simulator.js'
import { 五音槽位, 取词条池, 取词条满值, 是属性攻击 } from '../src/data/affinities.js'

const memory = new Map()
let full = false
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem(key, value) { if (full) throw Error('存储已满'); memory.set(key, value) } }
const clone = value => JSON.parse(JSON.stringify(value))
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
// 执行 App 中实际的草稿保留/恢复逻辑，避免测试另写一份类似逻辑。
const boot = new Function('store', 'plans', 'watch', 'saveError', 'draftKey', 'storageKey', app.slice(app.indexOf('function saveDraft(){'), app.indexOf('</script>')))
function openApp() {
  setActivePinia(createPinia())
  const store = useSimulatorStore(), plans = usePlansStore(), scope = effectScope()
  scope.run(() => boot(store, plans, watch, ref(''), 'maoye-panel-draft-v1', 'maoye-panel-loadout-v1'))
  return { store, plans, scope }
}
let { store, plans, scope } = openApp()
store.选择流派('破竹', '樽')
for (const part of Object.keys(store.装备词条)) {
  const equip = store.装备词条[part], used = new Set()
  let attacks = 0
  for (const tone of 五音槽位) {
    const name = 取词条池(tone, part, store.流派, store.变体).find(n => tone === '宫' || (!used.has(n) && (!是属性攻击(n) || attacks < 2)))
    if (tone !== '宫') { used.add(name); if (是属性攻击(name)) attacks++ }
    equip[tone] = { 名称: name, 值: 取词条满值(name) }
  }
  const name = 取词条池('定音', part, store.流派, store.变体)[0]
  if (name) equip.定音 = { 名称: name, 值: 取词条满值(name) }
}
const a = clone(plans.save('完整方案 A', store.导出配置()))
store.重置装备(); store.选择流派('牵丝', '霖')
await nextTick()
assert.deepEqual(clone(plans.active), a, '清空和重选不应自动覆盖已存方案')
assert.ok(plans.hasChanges(store.导出配置()))
scope.stop(); ({ store, plans, scope } = openApp())
assert.equal(store.变体, '霖', '刷新应恢复未保存草稿')
assert.deepEqual(clone(plans.active), a)
const b = clone(plans.save('方案 B', store.导出配置()))
store.选择流派('鸣金', '虹')
const draft = store.导出配置()
plans.save('A 副本', a.config, false)
assert.equal(plans.activeId, b.id, '复制不切走当前方案')
assert.deepEqual(store.导出配置(), draft)
plans.updateCurrent(draft)
assert.deepEqual(clone(plans.active.config), draft, '显式保存才修改当前方案')
full = true; plans.updateCurrent(draft)
assert.ok(plans.error); assert.ok(plans.hasChanges(draft), '保存失败不能显示已保存')
full = false; plans.updateCurrent(draft); assert.equal(plans.error, '')
plans.select(''); store.$reset(); await nextTick()
scope.stop(); ({ store, plans, scope } = openApp())
assert.equal(store.流派, '', '空白新方案刷新不能载入旧方案')
assert.equal(plans.activeId, '')
store.加载配置(a.config); plans.select(a.id)
store.重置装备(); await nextTick()
const editing = store.导出配置()
const cloudA = { ...a, name: '云端 A', config: b.config, updatedAt: '2020-01-01T00:00:00.000Z' }
assert.equal(plans.download([cloudA]), 1, '下载不同版本应保留副本，与时间戳新旧无关')
assert.deepEqual(clone(plans.active.config), a.config)
assert.deepEqual(store.导出配置(), editing, '下载不丢弃当前编辑内容')
assert.deepEqual(clone(plans.items.find(p => p.id === a.id).config), b.config)
assert.equal(plans.download([cloudA]), 0, '重复下载相同内容不产生重复副本')
const beforeInvalid = clone(plans.items)
assert.throws(() => plans.download([{ ...a, id: crypto.randomUUID() }, { ...b, config: {} }]))
assert.deepEqual(clone(plans.items), beforeInvalid, '无效下载不能部分修改本地列表')
plans.importFile({ 方案版本: 1, 方案: [a] })
assert.deepEqual(store.导出配置(), editing)
const removedId = plans.activeId
plans.remove(removedId); await nextTick()
scope.stop(); ({ store, plans, scope } = openApp())
assert.equal(plans.activeId, ''); assert.deepEqual(store.导出配置(), editing, '删除本地方案仍保留编辑草稿')
plans.recover(removedId)
assert.ok(plans.visible.some(p=>p.id===removedId)); assert.equal(plans.activeId,'', '恢复删除项不切走编辑草稿')
scope.stop()

// 模拟 Supabase 的版本条件更新，验证下载不写云端、只上传所选项及冲突停止。
let userId = 'test-user', writes = 0
const rows = [{ user_id: userId, id: a.id, name: a.name, config_data: a.config, updated_at: a.updatedAt, deleted: false }]
globalThis.planTestCloud = {
  auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
  from() {
    let mode = 'read', value, filters = []
    const query = {
      select() { return query }, eq(key, val) { filters.push([key, val]); return query },
      update(row) { mode = 'update'; value = row; return query }, insert(row) { mode = 'insert'; value = row; return query },
      then(resolve, reject) {
        let data, error = null
        if (mode === 'read') data = rows.filter(p => filters.every(([k,v]) => p[k] === v)).map(clone)
        if (mode === 'update') { data = []; const row = rows.find(p => filters.every(([k,v]) => p[k] === v)); if (row) { Object.assign(row,value); data.push({ id:row.id }); writes++ } }
        if (mode === 'insert') { if (rows.some(p=>p.user_id===value.user_id && p.id===value.id)) error={code:'23505'}; else {rows.push(clone(value));writes++} }
        return Promise.resolve({ data, error }).then(resolve,reject)
      }
    }
    return query
  }
}
const cloudSource = (await readFile(new URL('../src/services/cloud.js', import.meta.url), 'utf8')).replaceAll('import.meta.env', '({VITE_SUPABASE_URL:"test",VITE_SUPABASE_ANON_KEY:"test"})').replace('let client', 'let client = globalThis.planTestCloud')
const { fetchCloudPlans, uploadCloudPlans, setCloudPlansDeleted } = await import('data:text/javascript;base64,' + Buffer.from(cloudSource).toString('base64'))
const preview = await fetchCloudPlans()
assert.equal(writes, 0, '读取云端列表不能触发上传')
assert.equal(await uploadCloudPlans([b], preview), 1)
assert.deepEqual(rows.find(p=>p.id===b.id).config_data, b.config)
assert.deepEqual(rows.find(p=>p.id===a.id).config_data, a.config, '未选择的云端方案不得修改')
rows[0].updated_at = '2099-01-01T00:00:00.000Z'
await assert.rejects(uploadCloudPlans([a], preview), /云端版本已变化/)
assert.equal(writes, 1)
userId = 'another-user'
await assert.rejects(uploadCloudPlans([a], preview), /登录账号已变化/)
assert.equal(writes, 1)
userId = 'test-user'
const deletionPreview = await fetchCloudPlans()
const localBeforeDeletion = clone(plans.items), draftBeforeDeletion = store.导出配置()
assert.equal(await setCloudPlansDeleted([a], deletionPreview, true), 1)
assert.equal(rows.find(p=>p.id===a.id).deleted, true)
assert.equal(rows.find(p=>p.id===b.id).deleted, false, '删除只能影响所选云端方案')
assert.deepEqual(clone(plans.items), localBeforeDeletion)
assert.deepEqual(store.导出配置(), draftBeforeDeletion, '云端删除不能改变本地方案或草稿')
assert.deepEqual(rows.find(p=>p.id===a.id).config_data, a.config, '可恢复删除必须保留配装内容')
await assert.rejects(setCloudPlansDeleted([a], deletionPreview, false), /状态已变化/)
const restorePreview = await fetchCloudPlans()
assert.equal(await setCloudPlansDeleted([a], restorePreview, false), 1)
assert.equal(rows.find(p=>p.id===a.id).deleted, false)
const versionPreview = await fetchCloudPlans()
rows[0].updated_at = '2099-01-02T00:00:00.000Z'
await assert.rejects(setCloudPlansDeleted([a], versionPreview, true), /云端版本已变化/)
userId = 'another-user'
await assert.rejects(setCloudPlansDeleted([a], versionPreview, true), /登录账号已变化/)
assert.equal(writes, 3)
delete globalThis.planTestCloud
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify({ 方案版本: 1, 方案: [a,b] }))
console.log('通过：草稿隔离与刷新、新建、显式保存、复制、导入、本地删除恢复、下载保留副本、无效下载、保存失败、单向云端操作、选择上传、云端删除恢复与并发/账号冲突。')

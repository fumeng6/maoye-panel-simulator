// 仅用内存中的本地存储和模拟云端验证方案操作，不接触用户账号或方案。
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createPinia, setActivePinia } from 'pinia'
import { computed, effectScope, nextTick, ref, watch } from 'vue'
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
assert.ok(!plans.items.some(p=>p.id===removedId), '删除后的本地方案应永久移除')
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
      update(row) { mode = 'update'; value = row; return query }, insert(row) { mode = 'insert'; value = row; return query }, delete() { mode = 'delete'; return query },
      then(resolve, reject) {
        let data, error = null
        if (mode === 'read') data = rows.filter(p => filters.every(([k,v]) => p[k] === v)).map(clone)
        if (mode === 'update') { data = []; const row = rows.find(p => filters.every(([k,v]) => p[k] === v)); if (row) { Object.assign(row,value); data.push({ id:row.id }); writes++ } }
        if (mode === 'insert') { if (rows.some(p=>p.user_id===value.user_id && p.id===value.id)) error={code:'23505'}; else {rows.push(clone(value));writes++} }
        if (mode === 'delete') { data = []; const index = rows.findIndex(p => filters.every(([k,v]) => p[k] === v)); if (index >= 0) { data.push({id: rows[index].id}); rows.splice(index,1); writes++ } }
        return Promise.resolve({ data, error }).then(resolve,reject)
      }
    }
    return query
  }
}
const cloudSource = (await readFile(new URL('../src/services/cloud.js', import.meta.url), 'utf8')).replaceAll('import.meta.env', '({VITE_SUPABASE_URL:"test",VITE_SUPABASE_ANON_KEY:"test"})').replace('let client', 'let client = globalThis.planTestCloud')
const { fetchCloudPlans, uploadCloudPlans, deleteCloudPlans } = await import('data:text/javascript;base64,' + Buffer.from(cloudSource).toString('base64'))
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
assert.equal(await deleteCloudPlans([a], deletionPreview), 1)
assert.ok(!rows.some(p=>p.id===a.id), '云端删除应永久移除所选方案')
assert.equal(rows.find(p=>p.id===b.id).deleted, false, '删除只能影响所选云端方案')
assert.deepEqual(clone(plans.items), localBeforeDeletion)
assert.deepEqual(store.导出配置(), draftBeforeDeletion, '云端删除不能改变本地方案或草稿')
const versionPreview = await fetchCloudPlans()
rows.find(p=>p.id===b.id).updated_at = '2099-01-02T00:00:00.000Z'
await assert.rejects(deleteCloudPlans([b], versionPreview), /云端版本已变化/)
userId = 'another-user'
await assert.rejects(deleteCloudPlans([b], versionPreview), /登录账号已变化/)
assert.equal(writes, 2)

// 执行方案管理实际的删除函数和云端 id 匹配，检查联删顺序及失败时的草稿保护。
userId = 'test-user'
;({ store, plans, scope } = openApp())
store.加载配置(a.config)
const linkedPlan = clone(plans.save('联删同名方案', store.导出配置()))
const sameNamePlan = clone(plans.save(linkedPlan.name, b.config, false))
const localOnlyPlan = clone(plans.save('只删本地方案', b.config, false))
for (const p of [linkedPlan, sameNamePlan, localOnlyPlan]) rows.push({ user_id:userId, id:p.id, name:p.name, config_data:p.config, updated_at:p.updatedAt, deleted:false })
store.重置装备(); await nextTick()
const linkedDraft = store.导出配置(), deletionOrder = []
const originalRemove = plans.remove
plans.remove = id => { deletionOrder.push('local'); originalRemove(id) }
const cloudDeleteSpy = async (...args) => { deletionOrder.push('cloud-start'); const result = await deleteCloudPlans(...args); deletionOrder.push('cloud-finished'); return result }
const busy=ref(false), deletingPlan=ref(localOnlyPlan), deleteCloud=ref(false), deletePreview=ref(await fetchCloudPlans()), user=ref({id:userId}), deleteError=ref(''), deleteOpen=ref(true)
const manager = await readFile(new URL('../src/components/PlanManager.vue', import.meta.url), 'utf8')
const remoteStart = manager.indexOf('const deletingRemote=')
const remoteSource = manager.slice(remoteStart, manager.indexOf('\n',remoteStart))
const deleteStart = manager.indexOf('async function finishDelete()')
const deleteSource = manager.slice(deleteStart, manager.indexOf('\nasync function ',deleteStart+1))
const finishDelete = new Function('plans','busy','deletingPlan','deleteCloud','deletePreview','user','deleteError','deleteOpen','deleteCloudPlans','computed','ElMessage',remoteSource+'\n'+deleteSource+'\nreturn finishDelete')(plans,busy,deletingPlan,deleteCloud,deletePreview,user,deleteError,deleteOpen,cloudDeleteSpy,computed,{success(){}})
const beforeLocalDeleteWrites = writes
await finishDelete()
assert.deepEqual(deletionOrder, ['local'], '仅删本地不能触发云端写入')
assert.equal(writes,beforeLocalDeleteWrites)
assert.ok(!plans.items.some(p=>p.id===localOnlyPlan.id))
assert.ok(rows.some(p=>p.id===localOnlyPlan.id), '仅删本地应保留云端方案')

deletingPlan.value=linkedPlan; deleteCloud.value=true; deleteOpen.value=true
deletePreview.value=await fetchCloudPlans()
rows.find(p=>p.id===linkedPlan.id).updated_at='2099-01-03T00:00:00.000Z'
deletionOrder.length=0
const localBeforeFailedDelete = clone(plans.items)
await finishDelete()
assert.deepEqual(deletionOrder,['cloud-start'], '云端删除失败不能继续删除本地')
assert.ok(deleteError.value)
assert.deepEqual(clone(plans.items),localBeforeFailedDelete)
assert.deepEqual(store.导出配置(),linkedDraft, '联删失败应保留编辑草稿')
assert.equal(plans.activeId,linkedPlan.id)
assert.equal(busy.value,false)

deletePreview.value=await fetchCloudPlans(); deletionOrder.length=0
await finishDelete(); await nextTick()
assert.deepEqual(deletionOrder,['cloud-start','cloud-finished','local'], '勾选联删必须先完成云端删除再删除本地')
assert.equal(deleteError.value,'')
assert.ok(!plans.items.some(p=>p.id===linkedPlan.id))
assert.ok(!rows.some(p=>p.id===linkedPlan.id))
assert.deepEqual(clone(plans.items.find(p=>p.id===sameNamePlan.id)),sameNamePlan, '不同 id 的同名本地方案不能被删除')
assert.deepEqual(rows.find(p=>p.id===sameNamePlan.id).config_data,sameNamePlan.config, '不同 id 的同名云端方案不能被删除')
assert.deepEqual(store.导出配置(),linkedDraft, '删除当前方案不能清空配装草稿')
assert.equal(plans.activeId,'')
scope.stop(); ({ store, plans, scope } = openApp())
assert.deepEqual(store.导出配置(),linkedDraft, '联删后刷新仍应保留当前草稿')
assert.equal(plans.activeId,'')
scope.stop()
delete globalThis.planTestCloud
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify({ 方案版本: 1, 方案: [a,b] }))
console.log('通过：草稿隔离与刷新、新建、显式保存、复制、导入、本地永久删除、下载保留副本、无效下载、保存失败、单向云端操作、选择上传、云端永久删除、联删顺序及失败保留本地、同名方案隔离、仅删本地与草稿保留、并发/账号冲突。')

<template>
  <el-dialog v-model="open" title="方案管理" width="min(680px,94vw)" class="picker-dialog" append-to-body destroy-on-close>
    <section class="account-row" aria-label="账户"><div class="account-heading"><div><strong>{{ user ? '已登录 · ' + user.email?.split('@')[0] : '本地使用 · 未登录' }}</strong><p>{{ cloudConfigured ? (user ? '云端传送已保存的方案' : '登录后可在不同设备间传送方案') : '账号服务待连接' }}</p></div><el-button v-if="user" text size="small" :disabled="busy" @click="logout">退出</el-button></div><div class="account-actions"><el-button v-if="!user" :disabled="!cloudConfigured || busy" @click="authOpen=true">注册 / 登录</el-button><template v-else><el-button :disabled="busy" @click="prepareTransfer('download')">从云端下载</el-button><el-button :disabled="busy || !plans.visible.length" @click="prepareTransfer('upload')">上传到云端</el-button><el-button :disabled="busy" @click="prepareTransfer('delete')">管理云端</el-button></template></div></section>
    <div class="plan-toolbar" aria-label="方案快捷操作">
      <el-button :disabled="busy" @click="startNew">新建方案</el-button>
      <el-button type="primary" :disabled="busy || !dirty" @click="saveCurrent">保存当前</el-button>
      <el-button :disabled="busy" @click="fileInput.click()">导入</el-button>
      <el-dropdown trigger="click"><el-button :disabled="busy || (!store.已选流派 && !plans.visible.length)" aria-label="导出方案">导出 ⌄</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item :disabled="busy || !store.已选流派" @click="downloadPlans([{name:(plans.active?.name || '新方案')+'（当前配装）',config:store.导出配置()}])">导出当前配装</el-dropdown-item><el-dropdown-item :disabled="busy || !plans.visible.length" @click="downloadPlans(plans.visible)">导出全部已存方案</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importFile" />
    </div>
    <p class="draft-state">{{ plans.active ? `正在编辑：${plans.active.name}` : '正在编辑：新方案草稿' }}<span :class="{dirty}">{{ dirty ? '未保存修改' : store.已选流派 ? '已保存' : '未开始配置' }}</span></p>
    <div class="plan-list"><div v-for="p in plans.visible" :key="p.id" class="plan-item" :class="{selected: p.id === plans.activeId}"><div class="plan-summary"><strong>{{ p.name }}</strong><span v-if="p.id === plans.activeId" class="in-use">使用中</span></div><small>{{ p.config.配置.流派 }}{{ p.config.配置.变体 }} · {{ new Date(p.updatedAt).toLocaleString('zh-CN') }}</small><div class="plan-actions"><el-button size="small" :disabled="busy || p.id===plans.activeId" :aria-label="`切换到${p.name}`" @click="load(p)">切换</el-button><el-button size="small" :disabled="busy" :aria-label="`改名：${p.name}`" @click="rename(p)">改名</el-button><el-button size="small" :disabled="busy" type="danger" plain :aria-label="`删除：${p.name}`" @click="prepareDelete(p)">删除</el-button></div></div><el-empty v-if="!plans.visible.length" description="还没有保存的方案" :image-size="60" /></div>
    <p v-if="status || plans.error" class="helper-text" role="status">{{ plans.error || status }}</p>
    <template #footer><el-button @click="open=false">完成</el-button></template>
  </el-dialog>
  <el-dialog v-model="deleteOpen" title="删除方案" width="min(420px,94vw)" class="picker-dialog" append-to-body :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy" destroy-on-close>
    <p>删除“{{ deletingPlan?.name }}”？</p>
    <el-checkbox v-model="deleteCloud" :disabled="busy || !deletingRemote">同时删除云端方案</el-checkbox>
    <p class="helper-text">{{ deleteCloudHint }}</p><p class="helper-text">删除后无法恢复。当前面板配装仍保留为草稿。</p><p v-if="deleteError" class="error" role="alert">{{ deleteError }}</p>
    <template #footer><el-button :disabled="busy" @click="deleteOpen=false">取消</el-button><el-button type="danger" :loading="busy" @click="finishDelete">{{ deleteCloud ? '删除本地及云端' : '删除本地' }}</el-button></template>
  </el-dialog>
  <el-dialog v-model="transferOpen" :title="transferTitles[direction]" width="min(600px,94vw)" append-to-body :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy">
    <p class="helper-text">{{ transferHelp[direction] }}</p>
    <el-button size="small" :disabled="busy || !transferItems.length" @click="selectedIds = selectedIds.length === transferItems.length ? [] : transferItems.map(p=>p.id)">{{ selectedIds.length === transferItems.length && transferItems.length ? '取消全选' : '全选' }}</el-button>
    <el-checkbox-group v-model="selectedIds" class="transfer-list"><el-checkbox v-for="p in transferItems" :key="p.id" :value="p.id" :disabled="busy"><div><strong>{{ p.name }}</strong><small>{{ p.config.配置.流派 }}{{ p.config.配置.变体 }} · {{ new Date(p.updatedAt).toLocaleString('zh-CN') }}</small><span :class="{'transfer-warning': transferDifference(p)}">{{ transferDifference(p) || transferLabels[direction]+'云端方案' }}</span></div></el-checkbox><el-empty v-if="!transferItems.length" description="没有可选择的方案" :image-size="60" /></el-checkbox-group>
    <p v-if="status" class="helper-text" role="status">{{ status }}</p>
    <template #footer><el-button :disabled="busy" @click="transferOpen=false">取消</el-button><el-button :type="direction==='delete' ? 'danger' : 'primary'" :loading="busy" :disabled="!selectedIds.length" @click="finishTransfer">确认{{ transferLabels[direction] }} {{ selectedIds.length }} 套</el-button></template>
  </el-dialog>
  <el-dialog v-model="authOpen" :title="register ? '注册账号' : '登录账号'" width="min(400px,94vw)" append-to-body>
    <form class="auth-form" @submit.prevent="authenticate"><el-input v-model="username" :disabled="busy" placeholder="培养助手用户名" aria-label="用户名" autocomplete="username" /><el-input v-model="password" :disabled="busy" type="password" placeholder="密码（至少六位）" aria-label="密码" show-password autocomplete="current-password" /><p v-if="authError" class="error" role="alert">{{ authError }}</p><el-button type="primary" native-type="submit" :loading="busy">{{ register ? '注册' : '登录' }}</el-button><el-button text :disabled="busy" @click="register=!register; authError=''">{{ register ? '已有账号，去登录' : '没有账号，去注册' }}</el-button></form>
  </el-dialog>
</template>
<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { ElCheckbox, ElCheckboxGroup, ElDropdown, ElDropdownMenu, ElDropdownItem, ElMessage, ElMessageBox } from 'element-plus'
import { usePlansStore, downloadPlans } from '../stores/plans.js'
import { useSimulatorStore } from '../stores/simulator.js'
import { cloudConfigured, getCloud, fetchCloudPlans, uploadCloudPlans, deleteCloudPlans } from '../services/cloud.js'
const open = defineModel({ type: Boolean })
const plans = usePlansStore(), store = useSimulatorStore()
const fileInput = ref(null), status = ref(''), user = ref(null), authOpen = ref(false), register = ref(false), username = ref(''), password = ref(''), authError = ref(''), busy = ref(false)
const dirty = computed(() => plans.hasChanges(store.导出配置()))
const transferOpen = ref(false), direction = ref('download'), selectedIds = ref([]), transferItems = ref([])
const transferLabels = { download:'下载', upload:'上传', delete:'删除' }
const transferTitles = { download:'从云端下载', upload:'上传到云端', delete:'管理云端' }
const transferHelp = { download:'下载选中的云端方案；本地不同版本会保留副本，当前编辑内容也会保留。', upload:'上传选中的已保存方案。当前未保存修改不会上传；标记为覆盖的项会替换云端版本。', delete:'选择要删除的云端方案。本地方案与当前配装保留，删除后无法恢复。' }
const deleteOpen=ref(false), deletingPlan=ref(null), deleteCloud=ref(false), deletePreview=ref(null), deleteCloudHint=ref(''), deleteError=ref('')
const deletingRemote=computed(()=>deletePreview.value && user.value?.id===deletePreview.value.userId ? deletePreview.value.items.find(p=>p.id===deletingPlan.value?.id) : undefined)
let cloudPreview
let subscription
onMounted(async () => {
  if (!cloudConfigured) return
  try { const c = await getCloud(); const { data, error } = await c.auth.getSession(); if (error) throw error; user.value = data.session?.user; subscription = c.auth.onAuthStateChange((_event, session) => { user.value = session?.user }).data.subscription }
  catch (e) { status.value = e.message }
})
onBeforeUnmount(() => subscription?.unsubscribe())
async function askName(value) { try { return (await ElMessageBox.prompt('方案名称', '命名方案', { inputValue: value, inputValidator: v => !!v?.trim() || '请输入名称', confirmButtonText:'保存', cancelButtonText:'取消' })).value } catch { return null } }
async function saveCurrent() {
  if (!store.已选流派 || busy.value) return false
  if (plans.active) plans.updateCurrent(store.导出配置())
  else { const name = await askName(`${store.流派}${store.变体}方案`); if (!name) return false; plans.save(name, store.导出配置()) }
  if (plans.error) { ElMessage.error(plans.error); return false }
  ElMessage.success('方案已保存到本机'); return true
}
async function leaveDraft(action, saveAsNew = false) {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm(saveAsNew ? `当前配装尚未保存。可${plans.active ? '另存为新方案' : '保存为方案'}，或放弃草稿后开始空白方案。原来已保存的方案会保留。` : `当前修改尚未保存。请先保存，或放弃这些修改后${action}。`, '未保存修改', { confirmButtonText:saveAsNew && plans.active ? '另存为新方案' : '保存方案', cancelButtonText:'放弃修改并继续', distinguishCancelAndClose:true, type:'warning' })
    return saveAsNew ? await saveNew() : await saveCurrent()
  } catch (reason) { return reason === 'cancel' }
}
async function startNew() { if (busy.value || !await leaveDraft('新建方案',true)) return; plans.select(''); store.$reset(); open.value=false; ElMessage.success('已开始新方案') }
async function saveNew() { if (busy.value || !store.已选流派) return false; const name = await askName(`${store.流派}${store.变体}方案`); if (!name) return false; plans.save(name, store.导出配置()); if (plans.error) { ElMessage.error(plans.error); return false }; ElMessage.success('已另存为新方案'); return true }
async function load(p) { if (busy.value || p.id===plans.activeId || !await leaveDraft('切换方案')) return; try { store.加载配置(p.config); plans.select(p.id); open.value=false; ElMessage.success('已切换方案') } catch (e) { ElMessage.error(e.message) } }
async function rename(p) { const name = await askName(p.name); if (name) plans.rename(p.id, name) }
async function prepareDelete(p) {
  if (busy.value) return
  deletingPlan.value=p; deleteCloud.value=false; deletePreview.value=null; deleteError.value=''; deleteCloudHint.value=user.value ? '正在检查此方案的云端版本…' : '登录后可同时删除当前账号的云端方案。'; deleteOpen.value=true
  if (!user.value) return
  busy.value=true
  try {
    deletePreview.value=await fetchCloudPlans()
    if (user.value?.id!==deletePreview.value.userId) throw Error('登录账号已变化，请重新打开删除窗口')
    deleteCloudHint.value=deletingRemote.value ? `云端方案：${deletingRemote.value.name}` : '当前账号的云端没有此方案。'
  } catch(e) { deletePreview.value=null; deleteCloudHint.value='无法读取云端，本次只能删除本地：'+e.message }
  finally { busy.value=false }
}
async function finishDelete() {
  if (busy.value || !deletingPlan.value) return
  busy.value=true; deleteError.value=''
  let remoteDeleted=false, localRemoved=false
  try {
    const local=plans.visible.find(p=>p.id===deletingPlan.value.id)
    if (!local) throw Error('本地方案已变化，请重新打开列表')
    if (deleteCloud.value) {
      if (!deletingRemote.value || user.value?.id!==deletePreview.value?.userId) throw Error('云端或登录账号已变化，请重新打开删除窗口')
      await deleteCloudPlans([deletingRemote.value],deletePreview.value); remoteDeleted=true
    }
    plans.remove(local.id); localRemoved=true
    if (plans.error) throw Error(plans.error)
    deleteOpen.value=false; ElMessage.success(deleteCloud.value ? '已删除本地及云端方案' : '已删除本地方案')
  } catch(e) { deleteError.value=(remoteDeleted ? '云端已删除，本地操作未完成：' : localRemoved ? '本地删除状态无法保留：' : '删除未完成，本地方案保留：')+e.message }
  finally { busy.value=false }
}
async function importFile(event) { try { const file = event.target.files[0]; if (file) { const n = plans.importFile(JSON.parse(await file.text())); ElMessage.success(`已导入 ${n} 套方案`) } } catch(e) { ElMessage.error(e.message) } event.target.value = '' }
async function authenticate() {
  if (busy.value) return
  authError.value=''; if (!/^[\p{L}\p{N}_]{2,20}$/u.test(username.value.trim()) || password.value.length<6) { authError.value='用户名需 2–20 位字母、数字或下划线；密码至少六位'; return }
  busy.value=true
  try { const c = await getCloud(); const credentials = { email: username.value.trim().toLowerCase()+'@yyqian.local', password: password.value }; const { data, error } = await (register.value ? c.auth.signUp(credentials) : c.auth.signInWithPassword(credentials)); if (error) throw error; if (register.value && Array.isArray(data.user?.identities) && data.user.identities.length === 0) throw Error('该用户名已注册，请直接登录'); user.value=data.session?.user || null; authOpen.value=false; password.value=''; status.value=data.session ? '已登录，可选择下载或上传方案' : '注册已提交，请按账号服务要求完成验证' }
  catch(e) { authError.value = ['user_already_exists', 'email_exists'].includes(e.code) || /already registered|already exists/i.test(e.message) ? '该用户名已注册，请直接登录' : e.code === 'invalid_credentials' ? '用户名或密码不正确' : e.code === 'over_request_rate_limit' || e.code === 'over_email_send_rate_limit' ? '操作太频繁，请稍后再试' : e.message } finally { busy.value=false }
}
async function logout() { try { const c=await getCloud(); const {error}=await c.auth.signOut(); if(error) throw error; user.value=null; status.value='已退出，本地方案保留在此浏览器' } catch(e) { status.value=e.message } }
const different = (a,b) => a && !a.deleted && (a.name !== b.name || JSON.stringify(a.config) !== JSON.stringify(b.config))
function transferDifference(p) {
  if (direction.value==='delete') return ''
  const other = direction.value === 'download' ? plans.items.find(local=>local.id===p.id) : cloudPreview.items.find(remote=>remote.id===p.id)
  if (direction.value === 'upload' && other?.deleted) return '将恢复此云端方案'
  return different(other,p) ? direction.value === 'download' ? '本地版本不同，将保留本地副本' : '将覆盖不同的云端版本' : ''
}
function setTransferMode(mode) {
  direction.value=mode
  transferItems.value=JSON.parse(JSON.stringify(mode==='upload' ? plans.visible : cloudPreview.items.filter(p=>!p.deleted)))
  selectedIds.value=[]; status.value=''
}
async function prepareTransfer(mode) {
  if (busy.value) return
  busy.value=true
  try { cloudPreview=await fetchCloudPlans(); setTransferMode(mode); transferOpen.value=true }
  catch(e) { status.value='无法读取云端列表：'+e.message } finally { busy.value=false }
}
async function finishTransfer() {
  if (busy.value || !selectedIds.value.length) return
  busy.value=true
  try {
    if (user.value?.id !== cloudPreview.userId) throw Error('登录账号已变化，请重新打开列表')
    const selected=transferItems.value.filter(p=>selectedIds.value.includes(p.id))
    if (direction.value==='delete') {
      try { await ElMessageBox.confirm(`删除云端方案：${selected.map(p=>p.name).join('、')}？删除后无法恢复，本地方案与当前配装保留。`, '删除云端方案', {confirmButtonText:'删除云端',cancelButtonText:'取消',type:'warning'}) }
      catch(reason) { if(reason==='cancel' || reason==='close') return; throw reason }
    }
    if (direction.value==='download') { const copies=plans.download(selected); if(plans.error)throw Error(plans.error); status.value=`已下载 ${selected.length} 套${copies ? `，保留 ${copies} 套本地副本` : ''}` }
    else if (direction.value==='upload') { const count=await uploadCloudPlans(selected,cloudPreview); status.value=`已上传 ${count} 套已保存方案` }
    else { const count=await deleteCloudPlans(selected,cloudPreview); status.value=`已删除 ${count} 套云端方案` }
    transferOpen.value=false; ElMessage.success(status.value)
  } catch(e) { status.value='操作未完成：'+e.message; if(direction.value!=='download') { transferOpen.value=false; status.value+='。请重新打开列表查看最新版本。' } } finally { busy.value=false }
}
defineExpose({ startNew, saveCurrent })
</script>
<style scoped>
.account-row{padding:14px;background:var(--surface-soft);border:1px solid var(--border);border-radius:10px}.account-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.account-row strong{color:var(--text-strong);overflow-wrap:anywhere}.account-row p{font-size:12px;color:var(--muted);margin:6px 0 0}.account-actions{display:flex;gap:8px;margin-top:12px}.account-actions .el-button{margin:0}.plan-toolbar{display:grid;grid-template-columns:1.2fr 1.2fr .8fr .8fr;gap:8px;margin:16px 0 10px}.plan-toolbar .el-button{width:100%;margin:0;padding:8px}.plan-toolbar .el-dropdown{display:flex;min-width:0}.draft-state{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted);margin:0 0 12px;overflow-wrap:anywhere}.draft-state>span{flex:none;font-size:11px}.draft-state .dirty{color:var(--el-color-warning)}.plan-list{display:flex;flex-direction:column;gap:10px;max-height:42dvh;overflow:auto}.plan-item{padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}.plan-item.selected{border-color:var(--accent)}.plan-summary{display:flex;align-items:center;justify-content:space-between;gap:8px}.plan-summary strong{min-width:0;overflow-wrap:anywhere;color:var(--text-strong)}.in-use{flex:none;font-size:11px;color:var(--accent);padding:3px 7px;border-radius:4px;background:var(--surface-soft)}.plan-item>small{display:block;font-size:11px;margin:5px 0 10px;color:var(--muted)}.plan-actions{display:flex;gap:8px}.plan-actions .el-button{flex:1;margin:0}.auth-form{display:flex;flex-direction:column;gap:16px}.auth-form .el-button{margin:0}.error{color:var(--el-color-danger);font-size:13px;line-height:1.6}.transfer-list{display:flex;flex-direction:column;gap:8px;max-height:48dvh;overflow:auto;margin-top:12px}.transfer-list .el-checkbox{height:auto;margin:0;padding:12px;border:1px solid var(--border);border-radius:8px;white-space:normal}.transfer-list strong,.transfer-list small,.transfer-list span{display:block}.transfer-list small{font-size:12px;color:var(--muted);margin:4px 0}.transfer-list span{font-size:12px;color:var(--muted)}.transfer-list .transfer-warning{color:var(--el-color-warning)}
@media(max-width:600px){.account-row{padding:12px}.account-actions{gap:6px}.account-actions .el-button{flex:1;padding:8px;font-size:12px}.plan-toolbar{gap:6px}.plan-toolbar .el-button{font-size:12px;padding:8px 4px}.plan-item{padding:10px}.plan-actions{gap:6px}.plan-actions .el-button{height:30px;font-size:12px}}
</style>

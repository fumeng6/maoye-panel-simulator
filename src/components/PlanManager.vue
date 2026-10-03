<template>
  <el-dialog v-model="open" title="方案管理" width="min(680px,94vw)" class="picker-dialog" append-to-body>
    <div class="account-row"><div><strong>{{ user ? '已登录 · ' + user.email?.split('@')[0] : '本地方案' }}</strong><p>{{ cloudConfigured ? (user ? '选择要下载或上传的方案' : '登录后可在设备间传送已保存方案') : '账号服务待连接，本地方案可正常使用' }}</p></div><div class="account-actions"><el-button v-if="!user" :disabled="!cloudConfigured" @click="authOpen=true">注册 / 登录</el-button><template v-else><el-button :disabled="busy" @click="prepareTransfer('download')">从云端下载</el-button><el-button :disabled="busy || !plans.visible.length" @click="prepareTransfer('upload')">上传到云端</el-button><el-button :disabled="busy" @click="logout">退出</el-button></template></div></div>
    <div class="plan-toolbar"><el-button :disabled="busy" @click="startNew">新建方案</el-button><el-button type="primary" :disabled="busy || !dirty" @click="saveCurrent">保存{{ plans.active ? '当前方案' : '新方案' }}</el-button><el-button :disabled="busy || !store.已选流派" @click="saveNew">另存为</el-button><el-button :disabled="busy" @click="fileInput.click()">导入</el-button><el-button :disabled="!plans.visible.length" @click="downloadPlans(plans.visible)">导出已存方案</el-button><el-button :disabled="!store.已选流派" @click="downloadPlans([{name:(plans.active?.name || '新方案')+'（当前配装）',config:store.导出配置()}])">导出当前配装</el-button><input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importFile" /></div>
    <p class="helper-text">{{ plans.active ? `编辑：${plans.active.name}` : '编辑：新方案' }} · {{ dirty ? '有未保存修改' : store.已选流派 ? '已保存' : '请选择流派开始配置' }}。编辑草稿保留在本机，点击保存才更新方案。</p>
    <div class="plan-list"><div v-for="p in plans.visible" :key="p.id" class="plan-item" :class="{selected: p.id === plans.activeId}"><div><strong>{{ p.name }}</strong><small>{{ p.config.配置.流派 }}{{ p.config.配置.变体 }} · {{ new Date(p.updatedAt).toLocaleString('zh-CN') }}</small></div><div class="plan-actions"><el-button size="small" :disabled="busy || (p.id === plans.activeId && !dirty)" @click="load(p)">{{ p.id === plans.activeId ? dirty ? '重新载入' : '使用中' : '切换' }}</el-button><el-button size="small" :disabled="busy" @click="rename(p)">改名</el-button><el-button size="small" :disabled="busy" @click="duplicate(p)">复制已存方案</el-button><el-button size="small" @click="downloadPlans([p], p.name)">导出</el-button><el-button size="small" :disabled="busy" type="danger" plain @click="remove(p)">删除本地</el-button></div></div><el-empty v-if="!plans.visible.length" description="还没有保存的方案" :image-size="60" /></div>
    <p v-if="status || plans.error" class="helper-text" role="status">{{ plans.error || status }}</p>
    <details v-if="plans.items.some(p=>p.deleted)" class="deleted-plans"><summary>已删除的本地方案</summary><div v-for="p in plans.items.filter(p=>p.deleted)" :key="p.id"><span>{{ p.name }}</span><el-button size="small" :disabled="busy" @click="plans.recover(p.id)">恢复</el-button></div></details>
    <template #footer><el-button @click="open=false">完成</el-button></template>
  </el-dialog>
  <el-dialog v-model="transferOpen" :title="direction === 'download' ? '从云端下载' : '上传到云端'" width="min(600px,94vw)" append-to-body :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy">
    <p class="helper-text">{{ direction === 'download' ? '下载选中的云端方案；本地不同版本会保留副本，当前编辑内容也会保留。' : '上传选中的已保存方案。当前未保存修改不会上传；标记为覆盖的项会替换云端版本。' }}</p>
    <el-button size="small" :disabled="busy || !transferItems.length" @click="selectedIds = selectedIds.length === transferItems.length ? [] : transferItems.map(p=>p.id)">{{ selectedIds.length === transferItems.length && transferItems.length ? '取消全选' : '全选' }}</el-button>
    <div class="transfer-list"><el-checkbox v-for="p in transferItems" :key="p.id" v-model="selectedIds" :label="p.id" :disabled="busy"><div><strong>{{ p.name }}</strong><small>{{ p.config.配置.流派 }}{{ p.config.配置.变体 }} · {{ new Date(p.updatedAt).toLocaleString('zh-CN') }}</small><span :class="{'transfer-warning': transferDifference(p)}">{{ transferDifference(p) || (direction === 'download' ? '下载到本地' : '保存到云端') }}</span></div></el-checkbox><el-empty v-if="!transferItems.length" description="没有可选择的方案" :image-size="60" /></div>
    <p v-if="status" class="helper-text" role="status">{{ status }}</p>
    <template #footer><el-button :disabled="busy" @click="transferOpen=false">取消</el-button><el-button type="primary" :loading="busy" :disabled="!selectedIds.length" @click="finishTransfer">确认{{ direction === 'download' ? '下载' : '上传' }} {{ selectedIds.length }} 套</el-button></template>
  </el-dialog>
  <el-dialog v-model="authOpen" :title="register ? '注册账号' : '登录账号'" width="min(400px,94vw)" append-to-body>
    <form class="auth-form" @submit.prevent="authenticate"><el-input v-model="username" :disabled="busy" placeholder="培养助手用户名" aria-label="用户名" autocomplete="username" /><el-input v-model="password" :disabled="busy" type="password" placeholder="密码（至少六位）" aria-label="密码" show-password autocomplete="current-password" /><p v-if="authError" class="error" role="alert">{{ authError }}</p><el-button type="primary" native-type="submit" :loading="busy">{{ register ? '注册' : '登录' }}</el-button><el-button text :disabled="busy" @click="register=!register; authError=''">{{ register ? '已有账号，去登录' : '没有账号，去注册' }}</el-button></form>
  </el-dialog>
</template>
<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { ElCheckbox, ElMessage, ElMessageBox } from 'element-plus'
import { usePlansStore, downloadPlans } from '../stores/plans.js'
import { useSimulatorStore } from '../stores/simulator.js'
import { cloudConfigured, getCloud, fetchCloudPlans, uploadCloudPlans } from '../services/cloud.js'
const open = defineModel({ type: Boolean })
const plans = usePlansStore(), store = useSimulatorStore()
const fileInput = ref(null), status = ref(''), user = ref(null), authOpen = ref(false), register = ref(false), username = ref(''), password = ref(''), authError = ref(''), busy = ref(false)
const dirty = computed(() => plans.hasChanges(store.导出配置()))
const transferOpen = ref(false), direction = ref('download'), selectedIds = ref([]), transferItems = ref([])
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
    await ElMessageBox.confirm(saveAsNew ? '当前配装尚未保存。可另存为新方案，或放弃草稿后开始空白方案。原来已保存的方案会保留。' : `当前修改尚未保存。请先保存，或放弃这些修改后${action}。`, '未保存修改', { confirmButtonText:saveAsNew ? '另存当前配装' : '保存当前方案', cancelButtonText:'放弃修改并继续', distinguishCancelAndClose:true, type:'warning' })
    return saveAsNew ? await saveNew() : await saveCurrent()
  } catch (reason) { return reason === 'cancel' }
}
async function startNew() { if (busy.value || !await leaveDraft('新建方案',true)) return; plans.select(''); store.$reset(); ElMessage.success('已开始新方案') }
async function saveNew() { const name = await askName(`${store.流派}${store.变体}方案`); if (!name) return false; plans.save(name, store.导出配置()); if (plans.error) { ElMessage.error(plans.error); return false }; ElMessage.success('已另存为新方案'); return true }
async function load(p) { if (!await leaveDraft('载入方案')) return; try { store.加载配置(p.config); plans.select(p.id); ElMessage.success('已载入方案') } catch (e) { ElMessage.error(e.message) } }
async function rename(p) { const name = await askName(p.name); if (name) plans.rename(p.id, name) }
async function duplicate(p) { const name = await askName(p.name+' 副本'); if (name) { plans.save(name,p.config,false); if (plans.error) ElMessage.error(plans.error); else ElMessage.success('已复制，当前编辑内容保留') } }
async function remove(p) { try { await ElMessageBox.confirm(`从本机删除“${p.name}”？当前面板配装会保留为草稿，云端方案不会删除。`, '删除本地方案', {confirmButtonText:'删除本地',cancelButtonText:'取消',type:'warning'}); plans.remove(p.id) } catch {} }
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
  const other = direction.value === 'download' ? plans.items.find(local=>local.id===p.id) : cloudPreview.items.find(remote=>remote.id===p.id)
  if (direction.value === 'upload' && other?.deleted) return '将恢复此云端方案'
  return different(other,p) ? direction.value === 'download' ? '本地版本不同，将保留本地副本' : '将覆盖不同的云端版本' : ''
}
async function prepareTransfer(mode) {
  if (busy.value) return
  busy.value=true
  try { cloudPreview=await fetchCloudPlans(); direction.value=mode; transferItems.value=JSON.parse(JSON.stringify(mode==='download' ? cloudPreview.items.filter(p=>!p.deleted) : plans.visible)); selectedIds.value=[]; status.value=''; transferOpen.value=true }
  catch(e) { status.value='无法读取云端列表：'+e.message } finally { busy.value=false }
}
async function finishTransfer() {
  if (busy.value || !selectedIds.value.length) return
  busy.value=true
  try {
    if (user.value?.id !== cloudPreview.userId) throw Error('登录账号已变化，请重新打开列表')
    const selected=transferItems.value.filter(p=>selectedIds.value.includes(p.id))
    if (direction.value==='download') { const copies=plans.download(selected); if(plans.error)throw Error(plans.error); status.value=`已下载 ${selected.length} 套${copies ? `，保留 ${copies} 套本地副本` : ''}` }
    else { const count=await uploadCloudPlans(selected,cloudPreview); status.value=`已上传 ${count} 套已保存方案` }
    transferOpen.value=false; ElMessage.success(status.value)
  } catch(e) { status.value='操作未完成：'+e.message; if(direction.value==='upload') { transferOpen.value=false; status.value+='。请重新打开上传列表查看最新版本。' } } finally { busy.value=false }
}
defineExpose({ startNew, saveCurrent })
</script>
<style scoped>
.account-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px;background:var(--surface-soft);border-radius:8px}.account-row p{font-size:12px;color:var(--muted);margin:6px 0 0}.plan-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 10px}.plan-toolbar .el-button,.plan-actions .el-button{margin:0}.plan-list{display:flex;flex-direction:column;gap:10px}.plan-item{padding:14px;border:1px solid var(--border);border-radius:8px}.plan-item.selected{border-color:var(--accent);background:var(--surface-soft)}.plan-item small{display:block;margin:6px 0 12px;color:var(--muted)}.plan-actions{display:flex;flex-wrap:wrap;gap:6px}.auth-form{display:flex;flex-direction:column;gap:16px}.auth-form .el-button{margin:0}.error{color:var(--el-color-danger);font-size:13px}@media(max-width:600px){.account-row{align-items:flex-start;flex-direction:column}}
.account-actions{display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}.account-actions .el-button{margin:0}.plan-list{max-height:40dvh;overflow:auto}.transfer-list{display:flex;flex-direction:column;gap:8px;max-height:48dvh;overflow:auto;margin-top:12px}.transfer-list .el-checkbox{height:auto;margin:0;padding:12px;border:1px solid var(--border);border-radius:8px;white-space:normal}.transfer-list strong,.transfer-list small,.transfer-list span{display:block}.transfer-list small{font-size:12px;color:var(--muted);margin:4px 0}.transfer-list span{font-size:12px;color:var(--muted)}.transfer-list .transfer-warning{color:var(--el-color-warning)}
.deleted-plans{margin-top:12px;font-size:13px;color:var(--muted)}.deleted-plans summary{cursor:pointer}.deleted-plans>div{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}
</style>

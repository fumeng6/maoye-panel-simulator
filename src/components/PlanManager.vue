<template>
  <el-dialog v-model="open" title="方案管理" width="min(680px,94vw)" class="picker-dialog" append-to-body>
    <div class="account-row"><div><strong>{{ user ? '已登录 · ' + user.email?.split('@')[0] : '本地方案' }}</strong><p>{{ cloudConfigured ? (user ? '同步此浏览器的方案至当前账号' : '登录后可手动同步到其他设备') : '账号服务待连接，本地方案可正常使用' }}</p></div><div><el-button v-if="!user" :disabled="!cloudConfigured" @click="authOpen=true">注册 / 登录</el-button><template v-else><el-button :loading="busy" @click="sync">同步方案</el-button><el-button @click="logout">退出</el-button></template></div></div>
    <div class="plan-toolbar"><el-button type="primary" :disabled="!store.已选流派" @click="saveNew">保存为新方案</el-button><el-button @click="fileInput.click()">导入</el-button><el-button :disabled="!plans.visible.length" @click="downloadPlans(plans.visible)">导出全部</el-button><input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importFile" /></div>
    <p class="helper-text">{{ plans.active ? `当前：${plans.active.name}，修改自动保存` : '当前为临时配装，保存后可随时切换' }}</p>
    <div class="plan-list"><div v-for="p in plans.visible" :key="p.id" class="plan-item" :class="{selected: p.id === plans.activeId}"><div><strong>{{ p.name }}</strong><small>{{ p.config.配置.流派 }}{{ p.config.配置.变体 }} · {{ new Date(p.updatedAt).toLocaleString('zh-CN') }}</small></div><div class="plan-actions"><el-button size="small" @click="load(p)">{{ p.id === plans.activeId ? '使用中' : '切换' }}</el-button><el-button size="small" @click="rename(p)">改名</el-button><el-button size="small" @click="duplicate(p)">复制</el-button><el-button size="small" @click="downloadPlans([p], p.name)">导出</el-button><el-button size="small" type="danger" plain @click="remove(p)">删除</el-button></div></div><el-empty v-if="!plans.visible.length" description="还没有保存的方案" :image-size="60" /></div>
    <p v-if="status || plans.error" class="helper-text" role="status">{{ plans.error || status }}</p>
    <template #footer><el-button @click="open=false">完成</el-button></template>
  </el-dialog>
  <el-dialog v-model="authOpen" :title="register ? '注册账号' : '登录账号'" width="min(400px,94vw)" append-to-body>
    <form class="auth-form" @submit.prevent="authenticate"><el-input v-model="username" :disabled="busy" placeholder="培养助手用户名" aria-label="用户名" autocomplete="username" /><el-input v-model="password" :disabled="busy" type="password" placeholder="密码（至少六位）" aria-label="密码" show-password autocomplete="current-password" /><p v-if="authError" class="error" role="alert">{{ authError }}</p><el-button type="primary" native-type="submit" :loading="busy">{{ register ? '注册' : '登录' }}</el-button><el-button text :disabled="busy" @click="register=!register; authError=''">{{ register ? '已有账号，去登录' : '没有账号，去注册' }}</el-button></form>
  </el-dialog>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePlansStore, downloadPlans } from '../stores/plans.js'
import { useSimulatorStore } from '../stores/simulator.js'
import { cloudConfigured, getCloud, syncPlans } from '../services/cloud.js'
const open = defineModel({ type: Boolean })
const plans = usePlansStore(), store = useSimulatorStore()
const fileInput = ref(null), status = ref(''), user = ref(null), authOpen = ref(false), register = ref(false), username = ref(''), password = ref(''), authError = ref(''), busy = ref(false)
let subscription
onMounted(async () => {
  if (!cloudConfigured) return
  try { const c = await getCloud(); const { data, error } = await c.auth.getSession(); if (error) throw error; user.value = data.session?.user; subscription = c.auth.onAuthStateChange((_event, session) => { user.value = session?.user }).data.subscription }
  catch (e) { status.value = e.message }
})
onBeforeUnmount(() => subscription?.unsubscribe())
async function askName(value) { try { return (await ElMessageBox.prompt('方案名称', '命名方案', { inputValue: value, inputValidator: v => !!v?.trim() || '请输入名称', confirmButtonText:'保存', cancelButtonText:'取消' })).value } catch { return null } }
async function saveNew() { const name = await askName(`${store.流派}${store.变体}方案`); if (name) plans.save(name, store.导出配置()) }
function load(p) { try { store.加载配置(p.config); plans.select(p.id); ElMessage.success('已切换方案') } catch (e) { ElMessage.error(e.message) } }
async function rename(p) { const name = await askName(p.name); if (name) plans.rename(p.id, name) }
async function duplicate(p) { const name = await askName(p.name+' 副本'); if (name) { plans.save(name,p.config); store.加载配置(p.config) } }
async function remove(p) { try { await ElMessageBox.confirm(`删除“${p.name}”？当前面板配装会保留。`, '删除方案', {confirmButtonText:'删除',cancelButtonText:'取消',type:'warning'}); plans.remove(p.id) } catch {} }
async function importFile(event) { try { const file = event.target.files[0]; if (file) { const n = plans.importFile(JSON.parse(await file.text())); ElMessage.success(`已导入 ${n} 套方案`) } } catch(e) { ElMessage.error(e.message) } event.target.value = '' }
async function authenticate() {
  if (busy.value) return
  authError.value=''; if (!/^[\p{L}\p{N}_]{2,20}$/u.test(username.value.trim()) || password.value.length<6) { authError.value='用户名需 2–20 位字母、数字或下划线；密码至少六位'; return }
  busy.value=true
  try { const c = await getCloud(); const credentials = { email: username.value.trim().toLowerCase()+'@yyqian.local', password: password.value }; const { data, error } = await (register.value ? c.auth.signUp(credentials) : c.auth.signInWithPassword(credentials)); if (error) throw error; if (register.value && Array.isArray(data.user?.identities) && data.user.identities.length === 0) throw Error('该用户名已注册，请直接登录'); user.value=data.session?.user || null; authOpen.value=false; password.value=''; status.value=data.session ? '已登录，可点击同步方案' : '注册已提交，请按账号服务要求完成验证' }
  catch(e) { authError.value = ['user_already_exists', 'email_exists'].includes(e.code) || /already registered|already exists/i.test(e.message) ? '该用户名已注册，请直接登录' : e.code === 'invalid_credentials' ? '用户名或密码不正确' : e.code === 'over_request_rate_limit' || e.code === 'over_email_send_rate_limit' ? '操作太频繁，请稍后再试' : e.message } finally { busy.value=false }
}
async function logout() { try { const c=await getCloud(); const {error}=await c.auth.signOut(); if(error) throw error; user.value=null; status.value='已退出，本地方案保留在此浏览器' } catch(e) { status.value=e.message } }
async function sync() {
  busy.value=true
  try { if(store.已选流派) plans.updateCurrent(store.导出配置()); await syncPlans(plans); if(plans.active) store.加载配置(plans.active.config); status.value='同步完成 · '+new Date().toLocaleTimeString('zh-CN') }
  catch(e) { status.value='同步未完成：'+e.message } finally { busy.value=false }
}
</script>
<style scoped>
.account-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px;background:var(--surface-soft);border-radius:8px}.account-row p{font-size:12px;color:var(--muted);margin:6px 0 0}.plan-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 10px}.plan-toolbar .el-button,.plan-actions .el-button{margin:0}.plan-list{display:flex;flex-direction:column;gap:10px}.plan-item{padding:14px;border:1px solid var(--border);border-radius:8px}.plan-item.selected{border-color:var(--accent);background:var(--surface-soft)}.plan-item small{display:block;margin:6px 0 12px;color:var(--muted)}.plan-actions{display:flex;flex-wrap:wrap;gap:6px}.auth-form{display:flex;flex-direction:column;gap:16px}.auth-form .el-button{margin:0}.error{color:var(--el-color-danger);font-size:13px}@media(max-width:600px){.account-row{align-items:flex-start;flex-direction:column}}
</style>

export const cloudConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
let client
export async function getCloud() {
  if (!cloudConfigured) throw Error('账号服务尚未连接，请配置培养助手的 Supabase 项目 URL 和公开密钥')
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  }
  return client
}
async function currentUser(cloud) {
  const { data: { user }, error } = await cloud.auth.getUser()
  if (error) throw error
  if (!user) throw Error('请先登录')
  return user
}
export async function fetchCloudPlans() {
  const cloud = await getCloud()
  const user = await currentUser(cloud)
  const { data, error } = await cloud.from('panel_simulator_plans').select('*').eq('user_id', user.id)
  if (error) throw error
  return { userId: user.id, items: data.map(p => ({ id: p.id, name: p.name, config: p.config_data, updatedAt: p.updated_at, deleted: p.deleted })) }
}
export async function uploadCloudPlans(plans, preview) {
  const cloud = await getCloud()
  const user = await currentUser(cloud)
  if (user.id !== preview.userId) throw Error('登录账号已变化，请重新打开上传列表')
  let uploaded = 0
  try {
    for (const p of plans) {
      const previous = preview.items.find(remote => remote.id === p.id)
      const row = { user_id: user.id, id: p.id, name: p.name, config_data: p.config, updated_at: new Date().toISOString(), deleted: false }
      if (previous) {
        // 只覆盖用户预览过的版本，避免另一台设备刚保存的方案被旧页面覆盖。
        const { data, error } = await cloud.from('panel_simulator_plans').update(row).eq('user_id', user.id).eq('id', p.id).eq('updated_at', previous.updatedAt).select('id')
        if (error) throw error
        if (!data.length) throw Error(`“${p.name}”的云端版本已变化，请重新查看云端列表`)
      } else {
        const { error } = await cloud.from('panel_simulator_plans').insert(row)
        if (error) throw Error(error.code === '23505' ? `“${p.name}”已在云端出现，请重新查看云端列表` : error.message)
      }
      uploaded++
    }
  } catch (e) {
    throw Error(`已上传 ${uploaded} 套，其余未完成：${e.message}`)
  }
  return uploaded
}
export async function setCloudPlansDeleted(plans, preview, deleted) {
  const cloud = await getCloud()
  const user = await currentUser(cloud)
  if (user.id !== preview.userId) throw Error('登录账号已变化，请重新打开云端管理')
  const action = deleted ? '删除' : '恢复'
  let changed = 0
  try {
    for (const p of plans) {
      const previous = preview.items.find(remote => remote.id === p.id)
      if (!previous || previous.deleted === deleted) throw Error(`“${p.name}”状态已变化，请重新查看云端列表`)
      const { data, error } = await cloud.from('panel_simulator_plans').update({ deleted, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('id', p.id).eq('updated_at', previous.updatedAt).select('id')
      if (error) throw error
      if (!data.length) throw Error(`“${p.name}”的云端版本已变化，请重新查看云端列表`)
      changed++
    }
  } catch (e) { throw Error(`已${action} ${changed} 套，其余未完成：${e.message}`) }
  return changed
}

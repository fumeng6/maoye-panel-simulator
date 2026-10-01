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
export async function syncPlans(plans) {
  const cloud = await getCloud()
  const { data: { user }, error: authError } = await cloud.auth.getUser()
  if (authError) throw authError
  if (!user) throw Error('请先登录')
  const { data, error } = await cloud.from('panel_simulator_plans').select('*')
  if (error) throw error
  plans.merge(data.map(p => ({ id: p.id, name: p.name, config: p.config_data, updatedAt: p.updated_at, deleted: p.deleted })))
  if (plans.items.length) {
    const { error: uploadError } = await cloud.from('panel_simulator_plans').upsert(plans.items.map(p => ({ user_id: user.id, id: p.id, name: p.name, config_data: p.config, updated_at: p.updatedAt, deleted: p.deleted })))
    if (uploadError) throw uploadError
  }
}

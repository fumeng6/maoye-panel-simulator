// 总表保存数值，明细只选择属性；取值用于区分单项攻击与攻击区间。
export function 取模板属性(总表, 属性列表 = [], 取值 = {}, 数值覆盖 = {}) {
  const 结果 = {}
  for (const 属性 of 属性列表) {
    const 字段 = 取值[属性] || 属性.replace(/鸣金|裂石|破竹|牵丝|无相/g, '属性')
    const 值 = 数值覆盖[属性] ?? 总表[字段]
    if (!Number.isFinite(值)) throw new Error(`数值总表缺少 ${属性}（${字段}）`)
    结果[属性] = 值
  }
  return 结果
}

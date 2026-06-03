export const MAKEUP_CATEGORIES = [
  { value: 'foundation', label: '粉底' },
  { value: 'concealer', label: '遮瑕' },
  { value: 'blush', label: '腮紅' },
  { value: 'highlighter', label: '打亮 / 修容' },
  { value: 'eyeshadow', label: '眼影' },
  { value: 'eyeliner', label: '眼線' },
  { value: 'mascara', label: '睫毛膏' },
  { value: 'lip', label: '唇彩' },
  { value: 'setting', label: '定妝' },
  { value: 'brush_tool', label: '工具' },
  { value: 'other_makeup', label: '其他彩妝' },
] as const

export const SKINCARE_CATEGORIES = [
  { value: 'toner', label: '化妝水' },
  { value: 'serum', label: '精華液' },
  { value: 'lotion', label: '乳液' },
  { value: 'cream', label: '乳霜' },
  { value: 'sunscreen', label: '防曬' },
  { value: 'mask', label: '面膜' },
  { value: 'cleanser', label: '卸妝 / 洗臉' },
  { value: 'other_skincare', label: '其他保養' },
] as const

export const SENSITIVE_SKIN_OPTIONS = [
  { value: 'all_ok',          label: '全可用' },
  { value: 'avoid_postop',    label: '醫美後避開' },
  { value: 'sensitive_avoid', label: '敏感期避開' },
  { value: 'ng',              label: 'NG' },
  { value: 'untested',        label: '未測試' },
] as const

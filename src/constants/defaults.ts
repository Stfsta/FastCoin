import type { PaymentSourceType } from "@/types";

export const DEFAULT_PAYMENT_SOURCES: {
  name: string;
  type: PaymentSourceType;
  icon: string;
  color: string;
  sortOrder: number;
}[] = [
  { name: "微信钱包", type: "wechat", icon: "💬", color: "#07C160", sortOrder: 0 },
  { name: "支付宝", type: "alipay", icon: "🔵", color: "#1677FF", sortOrder: 1 },
  { name: "现金", type: "cash", icon: "💵", color: "#6B7280", sortOrder: 2 },
];

export const DEFAULT_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}[] = [
  { name: "餐饮", icon: "🍔", color: "#EF4444", sortOrder: 0 },
  { name: "交通", icon: "🚗", color: "#F59E0B", sortOrder: 1 },
  { name: "购物", icon: "🛒", color: "#8B5CF6", sortOrder: 2 },
  { name: "娱乐", icon: "🎮", color: "#EC4899", sortOrder: 3 },
  { name: "住房", icon: "🏠", color: "#10B981", sortOrder: 4 },
  { name: "医疗", icon: "🏥", color: "#EF4444", sortOrder: 5 },
  { name: "教育", icon: "📚", color: "#3B82F6", sortOrder: 6 },
  { name: "其他", icon: "📌", color: "#9CA3AF", sortOrder: 7 },
];

export const DEFAULT_CURRENCY = "CNY";

export function getCurrentMonthPeriod(): { name: string; startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    name: `${year}年${month}月`,
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

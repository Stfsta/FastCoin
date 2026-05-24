export type PaymentSourceType = "bank_card" | "alipay" | "wechat" | "cash" | "other";

export interface PaymentSource {
  id: string;
  name: string;
  type: PaymentSourceType;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export type NewPaymentSource = Omit<PaymentSource, "id" | "createdAt" | "updatedAt" | "version">;

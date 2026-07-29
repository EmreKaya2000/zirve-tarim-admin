import type { AgingBucket, PaymentMethod, PaymentType, SaleStatus } from '@zirve/types';

import { apiGet } from './api-client';

/**
 * Finans ve rapor API istemcisi (Sprint 10).
 *
 * TÜM PARA ALANLARI STRING'DİR (ARCHITECTURE §13.6). Arayüz yalnız
 * biçimlendirir ve karşılaştırır; toplama/çarpma YAPMAZ — rapor rakamı
 * backend'de Decimal ile hesaplanır. İki yerde toplanırsa iki farklı
 * rakam belirir ve hangisinin doğru olduğu bilinemez.
 */

// =============================================================================
// DASHBOARD
// =============================================================================

export interface DashboardCatalog {
  activeProducts: number;
  categories: number;
  brands: number;
  activeCustomers: number;
}

export interface DashboardMonth {
  from: string;
  to: string;
  saleCount: number;
  salesTotal: string;
  grossProfit: string;
  netProfit: string;
  paymentCount: number;
  paymentsTotal: string;
}

export interface DashboardDebt {
  totalDebt: string;
  openSalesDebt: string;
  overdueDebt: string;
  overdueSaleCount: number;
}

export interface RecentSale {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  grandTotal: string;
  saleDate: string;
  customer: { id: string; fullName: string };
}

export interface RecentPayment {
  id: string;
  paymentNumber: string;
  method: PaymentMethod;
  amount: string;
  paymentDate: string;
  customer: { id: string; fullName: string };
  sale: { id: string; saleNumber: string };
}

export interface RecentInquiry {
  id: string;
  inquiryNumber: string;
  status: string;
  contactName: string;
  estimatedTotal: string;
  createdAt: string;
}

export interface CriticalStockRow {
  id: string;
  sku: string;
  name: string | null;
  stockQuantity: string;
  lowStockThreshold: string;
  unitType: { code: string };
  product: { id: string; name: string };
}

export interface UpcomingDueSale {
  id: string;
  saleNumber: string;
  dueDate: string;
  remainingTotal: string;
  customer: { id: string; fullName: string; phone: string };
}

export interface MonthlyPoint {
  month: string;
  sales: string;
  payments: string;
  profit: string;
  saleCount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: string;
  revenue: string;
  profit: string;
}

export interface TopDebtor {
  customerId: string;
  code: string;
  fullName: string;
  debt: string;
}

export interface DashboardData {
  generatedAt: string;
  catalog: DashboardCatalog;
  inquiries: { pending: number; new: number };
  month: DashboardMonth;
  debt: DashboardDebt;
  criticalStockCount: number;
  recent: {
    sales: RecentSale[];
    payments: RecentPayment[];
    inquiries: RecentInquiry[];
    criticalStock: CriticalStockRow[];
  };
  upcomingDueSales: UpcomingDueSale[];
  monthlySeries: MonthlyPoint[];
  topProducts: TopProduct[];
  topDebtors: TopDebtor[];
}

// =============================================================================
// RAPORLAR
// =============================================================================

export interface DailyPoint {
  date: string;
  count: number;
  total: string;
  profit?: string;
}

export interface SalesReport {
  saleCount: number;
  subtotal: string;
  discountTotal: string;
  grandTotal: string;
  paidTotal: string;
  remainingTotal: string;
  costTotal: string;
  additionalCostTotal: string;
  grossProfit: string;
  netProfit: string;
  averageSale: string;
  byStatus: { status: SaleStatus; count: number; total: string }[];
  byPaymentType: { paymentType: PaymentType; count: number; total: string }[];
  daily: DailyPoint[];
}

export interface PaymentReport {
  paymentCount: number;
  totalAmount: string;
  byMethod: { method: PaymentMethod; count: number; total: string }[];
  daily: DailyPoint[];
}

export interface BreakdownRow {
  key: string;
  label: string;
  quantity: string;
  revenue: string;
  cost: string;
  profit: string;
  saleCount: number;
  marginPercent: string;
}

export interface ProfitReport {
  saleCount: number;
  revenue: string;
  cost: string;
  additionalCost: string;
  grossProfit: string;
  netProfit: string;
  marginPercent: string;
  byProduct: BreakdownRow[];
  byCategory: BreakdownRow[];
}

export interface ReceivableCustomer {
  customerId: string;
  code: string;
  fullName: string;
  phone: string;
  creditLimit: string;
  totalDebt: string;
  oldestDueDate: string | null;
  buckets: Record<AgingBucket, string>;
}

export interface ReceivablesReport {
  customers: ReceivableCustomer[];
  totalDebt: string;
  buckets: Record<AgingBucket, string>;
}

export interface OverdueSale {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  saleDate: string;
  dueDate: string;
  grandTotal: string;
  paidTotal: string;
  remainingTotal: string;
  daysOverdue: number;
  customer: { id: string; code: string; fullName: string; phone: string; creditLimit: string };
}

export interface OverdueReport {
  items: OverdueSale[];
  totalOverdue: string;
  saleCount: number;
  customerCount: number;
}

export interface ChartsData {
  monthly: MonthlyPoint[];
  topProducts: TopProduct[];
  topDebtors: TopDebtor[];
  byCategory: BreakdownRow[];
}

/** Rapor uçlarının ortak tarih aralığı parametreleri. */
export interface ReportRange {
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | number | undefined;
}

export const financeApi = {
  dashboard: (): Promise<DashboardData> => apiGet<DashboardData>('/admin/finance/dashboard'),

  receivables: (): Promise<ReceivablesReport> =>
    apiGet<ReceivablesReport>('/admin/finance/receivables'),

  overdue: (params: { sortBy?: string; minDaysOverdue?: number } = {}): Promise<OverdueReport> =>
    apiGet<OverdueReport>('/admin/finance/overdue', { params }),

  salesReport: (params: ReportRange): Promise<SalesReport> =>
    apiGet<SalesReport>('/admin/finance/sales-report', { params }),

  paymentReport: (params: ReportRange): Promise<PaymentReport> =>
    apiGet<PaymentReport>('/admin/finance/payment-report', { params }),

  profitReport: (params: ReportRange): Promise<ProfitReport> =>
    apiGet<ProfitReport>('/admin/finance/profit-report', { params }),

  charts: (params: ReportRange = {}): Promise<ChartsData> =>
    apiGet<ChartsData>('/admin/finance/charts', { params }),
};

import {
  BarChart3,
  Beaker,
  CalendarX2,
  FileBarChart,
  FolderTree,
  HandCoins,
  History,
  LayoutGrid,
  Leaf,
  Package,
  Receipt,
  Ruler,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Sprout,
  Tag,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@zirve/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tanımlıysa yalnız bu roller görür. */
  roles?: readonly UserRole[];
  /** Henüz yayında olmayan bölümler pasif gösterilir. */
  disabled?: boolean;
  /** Pasif öğede gösterilecek sprint bilgisi. */
  badge?: string;
}

/**
 * Yönetim paneli gezinme öğeleri — tasarımdaki sidebar sırasıyla.
 *
 * Henüz yazılmamış bölümler `disabled` işaretlidir: menüden gizlemek yerine
 * pasif göstermek, mağaza sahibine sistemin nereye gittiğini anlatır ve
 * ekranlar geldikçe menü yeri değişmez.
 */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Panel', icon: LayoutGrid },
  { href: '/urunler', label: 'Ürünler', icon: Package },
  { href: '/talepler', label: 'Talepler', icon: ShoppingCart },
  { href: '/musteriler', label: 'Müşteriler', icon: Users },
  { href: '/satislar', label: 'Satışlar', icon: Wallet },
  { href: '/odemeler', label: 'Ödemeler', icon: Receipt },
  { href: '/stok', label: 'Stok', icon: Warehouse },
  { href: '/stok-hareketleri', label: 'Stok Hareketleri', icon: History },
  { href: '/finans', label: 'Finans', icon: BarChart3 },
  { href: '/finans/alacaklar', label: 'Alacaklar', icon: HandCoins },
  { href: '/finans/vadesi-gecenler', label: 'Vadesi Geçenler', icon: CalendarX2 },
  { href: '/raporlar', label: 'Raporlar', icon: FileBarChart },
] as const;

/**
 * Katalog tanım verileri.
 *
 * Ayrı bir öbekte tutulur: bunlar günlük operasyon değil KURULUM işleridir.
 * Sidebar'da kendi başlığı altında gösterilir.
 */
export const ADMIN_CATALOG_NAV: readonly NavItem[] = [
  { href: '/kategoriler', label: 'Kategoriler', icon: FolderTree },
  { href: '/markalar', label: 'Markalar', icon: Tag },
  { href: '/bitkiler', label: 'Bitkiler', icon: Sprout },
  { href: '/toprak-turleri', label: 'Toprak Türleri', icon: Leaf },
  { href: '/yararlar', label: 'Yararlar', icon: Sparkles },
  { href: '/yan-etkiler', label: 'Yan Etkiler', icon: ShieldAlert },
  { href: '/kullanim-donemleri', label: 'Kullanım Dönemleri', icon: Beaker },
  { href: '/birimler', label: 'Birimler', icon: Ruler },
] as const;

/** Sidebar alt bölümündeki öğeler. */
export const ADMIN_FOOTER_NAV: readonly NavItem[] = [
  {
    href: '/kullanicilar',
    label: 'Kullanıcılar',
    icon: Users,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/ayarlar',
    label: 'Ayarlar',
    icon: Settings,
    roles: ['SUPER_ADMIN'],
  },
] as const;

/** Kullanıcının rolüne göre görebileceği öğeleri süzer. */
export function filterNavByRole(items: readonly NavItem[], role: UserRole | undefined): NavItem[] {
  return items.filter(
    (item) => item.roles === undefined || (role !== undefined && item.roles.includes(role)),
  );
}

/**
 * Bir menü öğesinin aktif olup olmadığını belirler.
 * `/` yalnız tam eşleşmede aktiftir; diğerleri alt yolları da kapsar.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

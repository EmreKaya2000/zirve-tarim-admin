'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Sprout, X } from 'lucide-react';
import { Avatar, cn } from '@zirve/ui';
import { USER_ROLE_LABELS, type AuthUser } from '@zirve/types';

import { SITE_NAME } from '@/lib/env';
import {
  ADMIN_CATALOG_NAV,
  ADMIN_FOOTER_NAV,
  ADMIN_NAV_ITEMS,
  filterNavByRole,
  isNavItemActive,
  type NavItem,
} from './admin-nav';

interface AdminSidebarProps {
  user: AuthUser | null;
  onLogout: () => void;
  /** Mobil çekmecenin açık olup olmadığı. */
  open: boolean;
  onClose: () => void;
}

/**
 * Yönetim paneli kenar çubuğu — tasarımdaki sidebar birebir uygulanır:
 * üstte logo + "Agri-Finance Suite", ortada gezinme, altta kullanıcı kartı,
 * ayarlar ve çıkış.
 *
 * TASARIM EKSİĞİ GİDERİLDİ: tasarım paketinde sidebar `hidden lg:flex` idi,
 * yani mobil karşılığı yoktu. Burada aynı içerik mobilde kayan çekmece
 * (drawer) olarak sunulur.
 */
export function AdminSidebar({ user, onLogout, open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const footerItems = filterNavByRole(ADMIN_FOOTER_NAV, user?.role);

  const content = (
    <>
      {/* Marka */}
      <div className="flex items-center justify-between px-4 pb-8">
        <Link href="/" className="flex items-center gap-3" onClick={onClose}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary text-on-primary">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-label-md text-on-surface">{SITE_NAME}</span>
            <span className="block text-label-sm uppercase text-on-surface-variant opacity-70">
              Agri-Finance Suite
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 items-center justify-center rounded-[8px] text-on-surface-variant hover:bg-surface-container lg:hidden"
          aria-label="Menüyü kapat"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Ana gezinme */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Yönetim menüsü">
        {ADMIN_NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isNavItemActive(item.href, pathname)}
            onNavigate={onClose}
          />
        ))}

        {/* Katalog tanımları — kurulum işleri, günlük operasyondan ayrı */}
        <p className="mt-4 px-4 pb-1 pt-2 text-label-sm uppercase text-outline">
          Katalog Tanımları
        </p>

        {ADMIN_CATALOG_NAV.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isNavItemActive(item.href, pathname)}
            onNavigate={onClose}
          />
        ))}
      </nav>

      {/* Alt bölüm */}
      <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant pt-4">
        {footerItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isNavItemActive(item.href, pathname)}
            onNavigate={onClose}
          />
        ))}

        {user !== null ? (
          <div className="mb-2 mt-3 flex items-center gap-3 px-4 py-2">
            <Avatar name={user.fullName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-label-md text-on-surface">{user.fullName}</p>
              <p className="text-label-sm uppercase text-outline">{USER_ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-label-md text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Masaüstü: sabit kenar çubuğu */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-outline-variant bg-surface-container-low px-3 py-8 lg:flex">
        {content}
      </aside>

      {/* Mobil: kayan çekmece */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={onClose}
          aria-label="Menüyü kapat"
          className={cn(
            'absolute inset-0 bg-inverse-surface/40 transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />

        <aside
          className={cn(
            'absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col',
            'border-r border-outline-variant bg-surface-container-low px-3 py-8',
            'transition-transform duration-200 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {content}
        </aside>
      </div>
    </>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  if (item.disabled === true) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-3 rounded-[10px] px-4 py-2.5 text-label-md text-on-surface-variant opacity-40"
        title={item.badge !== undefined ? `${item.badge}'te eklenecek` : undefined}
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge !== undefined ? (
          <span className="text-[10px] uppercase tracking-wide">{item.badge}</span>
        ) : null}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-label-md transition-colors',
        active
          ? 'bg-primary-container text-on-primary'
          : 'text-on-surface-variant hover:bg-secondary-container hover:text-on-primary-fixed-variant',
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

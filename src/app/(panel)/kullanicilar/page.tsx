import type { Metadata } from 'next';

import { UsersPageContent } from '@/components/admin/users-page-content';

export const metadata: Metadata = { title: 'Kullanıcılar' };

/**
 * Yönetici kullanıcı yönetimi.
 *
 * Yalnız SUPER_ADMIN erişebilir. Erişim kontrolü üç katmanda:
 *  1. Sidebar bu bağlantıyı yalnız SUPER_ADMIN'e gösterir (UX)
 *  2. Sayfa içeriği rol kontrolü yapar (UX)
 *  3. Backend RolesGuard yetkisiz isteği 403 ile reddeder (GERÇEK koruma)
 */
export default function UsersPage() {
  return <UsersPageContent />;
}

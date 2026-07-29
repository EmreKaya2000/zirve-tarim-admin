'use client';

import { ShieldAlert } from 'lucide-react';
import { Alert, PageHeader } from '@zirve/ui';

import { useAuth } from '@/providers/auth-provider';
import { CreateUserDialog } from './create-user-dialog';
import { UsersTable } from './users-table';

/**
 * Kullanıcı yönetimi sayfa içeriği.
 *
 * Rol kontrolü burada YALNIZCA kullanıcı deneyimi içindir: yetkisiz kullanıcı
 * boş bir tablo ve arka arkaya 403 hatası görmek yerine net bir açıklama
 * görür. Gerçek koruma backend'dedir (Kural 10).
 */
export function UsersPageContent() {
  const { isSuperAdmin, user } = useAuth();

  if (user !== null && !isSuperAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Kullanıcılar" />
        <Alert variant="warning" title="Bu sayfa için yetkiniz yok">
          Yönetici kullanıcılarını yalnızca <strong>Süper Yönetici</strong> rolündeki hesaplar
          görüntüleyebilir ve düzenleyebilir.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Kullanıcılar"
        description="Yönetim paneline erişebilen hesapları yönetin."
        actions={<CreateUserDialog />}
      />

      <Alert variant="info" showIcon>
        <span className="flex items-start gap-1">
          <ShieldAlert className="mt-0.5 hidden size-4 shrink-0" aria-hidden="true" />
          Pasife alınan kullanıcının açık oturumları anında sonlandırılır ve giriş yapamaz.
        </span>
      </Alert>

      <UsersTable />
    </div>
  );
}

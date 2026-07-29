'use client';

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, UserX, Users as UsersIcon } from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Pagination,
  Select,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@zirve/ui';
import { USER_ROLE_LABELS, type AuthUser } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/providers/auth-provider';
import { usersApi } from '@/lib/users-api';
import { CreateUserDialog } from './create-user-dialog';

const PAGE_SIZE = 20;
const TABLE_COLUMNS = 6;

type StatusFilter = 'all' | 'active' | 'inactive';

/**
 * Kullanıcı listesi.
 *
 * TASARIM NOTU: Bu ekran Stitch paketinde yoktu. Tasarımdaki "Müşteri
 * Yönetimi" ekranının yapısı birebir izlendi: istatistik kartı satırı →
 * arama/filtre çubuğu → ayraçlı veri tablosu → sayfalama.
 */
export function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['admin', 'users', { page, search, statusFilter }],
    queryFn: () =>
      usersApi.list({
        page,
        limit: PAGE_SIZE,
        ...(search.trim() !== '' && { search: search.trim() }),
        ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' }),
      }),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.setStatus(id, isActive),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (mutationError: unknown) => {
      setActionError(
        mutationError instanceof ApiError
          ? mutationError.message
          : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
      );
    },
  });

  const users = data?.items ?? [];
  const meta = data?.meta;
  const activeCount = users.filter((user) => user.isActive).length;
  const superAdminCount = users.filter((user) => user.role === 'SUPER_ADMIN').length;

  return (
    <div className="flex flex-col gap-6">
      {/* İstatistik kartları */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Toplam Kullanıcı"
          value={meta?.total ?? '—'}
          icon={<UsersIcon />}
          tone="primary"
        />
        <StatCard
          label="Bu Sayfada Aktif"
          value={activeCount}
          icon={<ShieldCheck />}
          tone="success"
        />
        <StatCard
          label="Bu Sayfada Süper Yönetici"
          value={superAdminCount}
          icon={<ShieldCheck />}
          tone="neutral"
        />
      </section>

      {actionError !== null ? <Alert variant="error">{actionError}</Alert> : null}

      {/* Arama ve filtre çubuğu */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Ad veya e-posta ile ara..."
            startIcon={<Search />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Kullanıcı ara"
          />

          <div className="sm:w-52">
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
              aria-label="Duruma göre filtrele"
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Yalnız aktif</option>
              <option value="inactive">Yalnız pasif</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tablo */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Son Giriş</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isPending ? (
              <TableSkeleton rows={5} columns={TABLE_COLUMNS} />
            ) : isError ? (
              <TableEmpty
                colSpan={TABLE_COLUMNS}
                title="Liste yüklenemedi"
                description={
                  error instanceof ApiError ? error.message : 'Bilinmeyen bir hata oluştu.'
                }
              />
            ) : users.length === 0 ? (
              <TableEmpty
                colSpan={TABLE_COLUMNS}
                icon={<UsersIcon />}
                title="Kullanıcı bulunamadı"
                description={
                  search.trim() !== '' || statusFilter !== 'all'
                    ? 'Arama veya filtre kriterlerinizi değiştirmeyi deneyin.'
                    : 'Henüz yönetici kullanıcı eklenmemiş.'
                }
              />
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUser?.id}
                  pending={statusMutation.isPending}
                  onToggleStatus={() =>
                    statusMutation.mutate({ id: user.id, isActive: !user.isActive })
                  }
                />
              ))
            )}
          </TableBody>
        </Table>

        {meta !== undefined ? (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={setPage}
            itemLabel="kullanıcı"
          />
        ) : null}
      </Card>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  pending,
  onToggleStatus,
}: {
  user: AuthUser;
  isSelf: boolean;
  pending: boolean;
  onToggleStatus: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} size="md" tone={user.isActive ? 'primary' : 'muted'} />
          <div className="min-w-0">
            <p className="truncate text-label-md text-on-surface">
              {user.fullName}
              {isSelf ? <span className="ml-2 text-xs text-outline">(siz)</span> : null}
            </p>
            <p className="truncate text-sm text-on-surface-variant">{user.email}</p>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant={user.role === 'SUPER_ADMIN' ? 'primary' : 'neutral'}>
          {USER_ROLE_LABELS[user.role]}
        </Badge>
      </TableCell>

      <TableCell className="text-on-surface-variant">
        {user.phone ?? <span className="text-outline">—</span>}
      </TableCell>

      <TableCell className="whitespace-nowrap text-on-surface-variant">
        {formatDateTime(user.lastLoginAt)}
      </TableCell>

      <TableCell>
        <Badge variant={user.isActive ? 'success' : 'neutral'}>
          {user.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      </TableCell>

      <TableCell className="text-right">
        <Button
          variant={user.isActive ? 'ghost' : 'secondary'}
          size="sm"
          onClick={onToggleStatus}
          // Kendi hesabını pasife alma backend'de de reddedilir; burada
          // butonu kapatmak yalnızca gereksiz hatayı önlemek içindir.
          disabled={isSelf || pending}
          title={isSelf ? 'Kendi hesabınızın durumunu değiştiremezsiniz.' : undefined}
        >
          {user.isActive ? <UserX /> : <ShieldCheck />}
          {user.isActive ? 'Pasife Al' : 'Aktifleştir'}
        </Button>
      </TableCell>
    </TableRow>
  );
}

/**
 * UTC tarihi Türkiye yerel saatine çevirerek gösterir.
 *
 * Sunucu her zaman UTC saklar (Kural 3); yerelleştirme sunum katmanındadır.
 */
function formatDateTime(value: string | null): string {
  if (value === null) {
    return 'Hiç giriş yapmadı';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

export { CreateUserDialog };

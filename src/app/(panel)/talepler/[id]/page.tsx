import type { Metadata } from 'next';

import { InquiryDetailPage } from '@/components/admin/inquiries/inquiry-detail-page';

export const metadata: Metadata = { title: 'Talep Detayı' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <InquiryDetailPage inquiryId={id} />;
}

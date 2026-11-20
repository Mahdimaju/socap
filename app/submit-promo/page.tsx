import type { Metadata } from 'next';
import { PromoUploader } from '@/components/PromoUploader';

export const metadata: Metadata = {
  title: 'Setor Promo | LaperHemat',
  description: 'Unggah screenshot voucher atau isi manual untuk membuka akses tanpa batas 24 jam.',
};

export default function SubmitPromoPage() {
  return <PromoUploader />;
}

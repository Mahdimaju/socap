import type { Metadata } from 'next';
import { AdminVendorManager } from '@/components/AdminVendorManager';

export const metadata: Metadata = {
  title: 'Tambah Penjual & Estimasi Kalori AI | LaperHemat',
  description: 'Tambahkan penjual makanan sekitar kampus dengan estimasi kalori otomatis Gemini AI.',
};

export default function AdminPage() {
  return <AdminVendorManager />;
}

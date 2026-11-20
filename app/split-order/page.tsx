import type { Metadata } from 'next';
import { SplitOrderCalc } from '@/components/SplitOrderCalc';

export const metadata: Metadata = {
  title: 'Mode Pesta (Pecah Transaksi) | LaperHemat',
  description: 'Hitung strategi pecah transaksi termurah untuk pesanan makanan kelompok.',
};

export default function SplitOrderPage() {
  return <SplitOrderCalc />;
}

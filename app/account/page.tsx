import type { Metadata } from 'next';
import { AccountView } from '@/components/AccountView';

export const metadata: Metadata = {
  title: 'Akun & Langganan Pro | LaperHemat',
  description: 'Masuk untuk menyimpan poin kontributor dan berlangganan LaperHemat Pro via Midtrans.',
};

export default function AccountPage() {
  return <AccountView />;
}

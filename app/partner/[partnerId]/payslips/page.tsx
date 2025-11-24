import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import PayslipsClient from './PayslipsClient';

export default async function PayslipsPage({ params }: { params: { partnerId: string } }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect('/partner');
  }

  return <PayslipsClient partnerId={params.partnerId} />;
}




















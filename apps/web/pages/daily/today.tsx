import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function TodayRedirect() {
  const router = useRouter();
  useEffect(() => {
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    router.replace(`/daily/${iso}`);
  }, [router]);
  return null;
}

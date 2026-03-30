'use client';

import { useAuth } from '@/context/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    // Rol bazlı yönlendirme
    if (profile.role === 'admin') router.replace('/admin');
    else if (profile.role === 'teacher') router.replace('/teacher');
    else if (profile.role === 'student') router.replace('/student');
  }, [profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-400 text-lg">Yükleniyor...</div>
    </div>
  );
}

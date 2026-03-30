'use client';

import { useAuth } from '@/context/AuthProvider';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, profile, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            window.location.href = '/login';
            return;
        }

        if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
            // Yetkisiz rol — kendi paneline yönlendir
            const routes = { admin: '/admin', teacher: '/teacher', student: '/student' };
            window.location.href = routes[profile.role] || '/login';
        }
    }, [user, profile, loading, allowedRoles]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-gray-400 text-lg">Yükleniyor...</div>
            </div>
        );
    }

    if (!user || !profile) return null;

    if (allowedRoles && !allowedRoles.includes(profile.role)) return null;

    return children;
}

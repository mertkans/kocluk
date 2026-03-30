'use client';

import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StudentLayout({ children }) {
    return (
        <ProtectedRoute allowedRoles={['student']}>
            <div className="flex min-h-screen bg-[#f8f9fb]">
                <Sidebar />
                <main className="flex-1 p-4 sm:p-6 md:p-8 pt-16 md:pt-8 overflow-auto">{children}</main>
            </div>
        </ProtectedRoute>
    );
}

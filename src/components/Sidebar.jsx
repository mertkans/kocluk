'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { useState } from 'react';

const menuSections = {
    admin: [
        { label: 'Genel', items: [
            { href: '/admin', label: 'Ana Sayfa', icon: '📊' },
            { href: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
        ]},
    ],
    teacher: [
        { label: 'Genel', items: [
            { href: '/teacher', label: 'Ana Sayfa', icon: '📊' },
            { href: '/teacher/students', label: 'Öğrencilerim', icon: '👨‍🎓' },
            { href: '/teacher/assignments', label: 'Ödevler', icon: '📋' },
        ]},
        { 
            label: 'Tanımlamalar', 
            icon: '⚙️', 
            isCollapsible: true,
            items: [
                { href: '/teacher/classes', label: 'Sınıflar', icon: '🏫' },
                { href: '/teacher/topics', label: 'Konular', icon: '📎' },
                { href: '/teacher/answer-keys', label: 'Cevap Anahtarları', icon: '🔑' },
            ]
        },
    ],
    student: [
        { label: 'Genel', items: [
            { href: '/student', label: 'Ödevlerim', icon: '📋' },
            { href: '/student/agenda', label: 'Ajandam', icon: '📅' },
        ]},
    ],
};

const roleLabels = {
    admin: 'Yönetici',
    teacher: 'Öğretmen',
    student: 'Öğrenci',
};

const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-emerald-100 text-emerald-700',
};

export default function Sidebar() {
    const { profile, signOut } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (label) => {
        setExpandedSections(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    if (!profile) return null;

    const sections = menuSections[profile.role] || [];

    const navContent = (
        <>
            {/* Logo / Başlık */}
            <div className="px-5 pt-6 pb-4">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">🎯 Koçluk Paneli</h1>
                <div className="mt-3 flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[profile.role]}`}>
                        {roleLabels[profile.role]}
                    </span>
                </div>
                <p className="text-sm text-gray-500 mt-1.5 truncate">{profile.name}</p>
            </div>

            {/* Navigasyon */}
            <nav className="flex-1 px-3 mt-2 overflow-y-auto">
                {sections.map((section) => (
                    <div key={section.label} className="mb-4">
                        {section.isCollapsible ? (
                            <div>
                                <button
                                    onClick={() => toggleSection(section.label)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{expandedSections[section.label] ? '−' : '+'}</span>
                                        {section.label}
                                    </div>
                                </button>
                                {expandedSections[section.label] && (
                                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-50 pl-2">
                                        {section.items.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <li key={item.href}>
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => setMobileOpen(false)}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                                                                ? 'bg-gray-900 text-white shadow-sm'
                                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                                            }`}
                                                    >
                                                        <span className="text-base">{item.icon}</span>
                                                        {item.label}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <>
                                {section.label !== 'Genel' && (
                                    <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                        {section.label}
                                    </h3>
                                )}
                                <ul className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    onClick={() => setMobileOpen(false)}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                                            ? 'bg-gray-900 text-white shadow-sm'
                                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                        }`}
                                                >
                                                    <span className="text-lg">{item.icon}</span>
                                                    {item.label}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </div>
                ))}
            </nav>

            {/* Çıkış */}
            <div className="px-3 pb-5">
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                    <span className="text-lg">🚪</span>
                    Çıkış Yap
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobil Hamburger Butonu */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-lg rounded-xl p-2.5 border border-gray-100"
                aria-label="Menüyü aç"
            >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Masaüstü Sidebar */}
            <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 bg-white border-r border-gray-100 h-screen sticky top-0">
                {navContent}
            </aside>

            {/* Mobil Sidebar (Overlay) */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="relative w-72 bg-white h-full flex flex-col shadow-2xl animate-slide-in">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
                            aria-label="Menüyü kapat"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {navContent}
                    </aside>
                </div>
            )}
        </>
    );
}

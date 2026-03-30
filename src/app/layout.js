import './globals.css';
import AuthProvider from '@/context/AuthProvider';

export const metadata = {
  title: 'ÖdevTakip - Ödev Takip Sistemi',
  description: 'Optik form tabanlı interaktif ödev takip sistemi. Öğretmen ve öğrenci panelleri.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

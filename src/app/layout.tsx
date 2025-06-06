
import type { Metadata } from 'next';
import { Belleza, Alegreya } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import AppNavbar from '@/components/layout/app-navbar';
import AppFooter from '@/components/layout/app-footer';

const belleza = Belleza({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-belleza',
  display: 'swap',
});

const alegreya = Alegreya({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-alegreya',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Koperasi Digital Merah Putih',
  description: 'Platform Digital Koperasi Merah Putih Sejahtera',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${belleza.variable} ${alegreya.variable}`}>
      <head>
        {/* Next/font handles font loading optimally, no need for manual <link> tags for these fonts */}
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <AppNavbar />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <AppFooter />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

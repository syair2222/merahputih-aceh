
import type { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image 
            src="https://placehold.co/100x100.png" // Replace with actual logo URL
            alt="Koperasi Merah Putih Sejahtera Logo" 
            width={80} 
            height={80} 
            className="mx-auto rounded-full shadow-md"
            data-ai-hint="cooperative logo" 
          />
          <h1 className="text-3xl font-headline mt-4 font-bold text-primary">
            Koperasi Merah Putih Sejahtera
          </h1>
          <p className="text-muted-foreground">
            Platform Digital untuk Anggota Koperasi
          </p>
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-2xl border border-border/50">
          {children}
        </div>
         <p className="text-center mt-6 text-sm text-muted-foreground">
            Tahun Pendirian: 2025 <br/>
            Gampong Uteunkot, Kecamatan Muara Dua, Kota Lhokseumawe, Provinsi Aceh, Indonesia
        </p>
      </div>
    </div>
  );
}

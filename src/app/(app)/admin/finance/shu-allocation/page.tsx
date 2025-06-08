
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShieldAlert, Loader2, Percent, Save, Settings2 } from 'lucide-react';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
// import { db } from '@/lib/firebase';
// import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const allowedRoles: Array<UserProfile['role']> = ['admin_utama', 'sekertaris', 'bendahara'];

interface ShuAllocationConfig {
  danaCadangan: number;
  jasaModalAnggota: number;
  jasaUsahaAnggota: number;
  danaPendidikan: number;
  danaSosial: number;
  danaPengurusKaryawan: number;
}

export default function ShuAllocationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [config, setConfig] = useState<ShuAllocationConfig>({
    danaCadangan: 25,
    jasaModalAnggota: 20,
    jasaUsahaAnggota: 40,
    danaPendidikan: 5,
    danaSosial: 5,
    danaPengurusKaryawan: 5,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // For initial data load (future)

  // useEffect untuk memuat konfigurasi dari Firestore (implementasi di masa depan)
  useEffect(() => {
    // Placeholder: if (user) fetchConfigFromFirestore();
    setPageLoading(false); // For now, just stop loading
  }, [user]);


  useEffect(() => {
    if (!authLoading) {
      if (user && allowedRoles.includes(user.role as UserProfile['role'])) {
        // User is authorized
      } else if (user) {
        router.push('/admin/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setConfig(prev => ({ ...prev, [name]: numValue }));
    } else if (value === '') {
      setConfig(prev => ({ ...prev, [name]: 0 }));
    }
  };

  const calculateTotalPercentage = () => {
    return Object.values(config).reduce((sum, val) => sum + (val || 0), 0);
  };

  const totalPercentage = calculateTotalPercentage();

  const handleSaveConfig = async () => {
    if (totalPercentage !== 100) {
      toast({
        title: "Total Persentase Salah",
        description: `Total persentase alokasi harus 100%, saat ini ${totalPercentage}%.`,
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    toast({
        title: "Simulasi Simpan",
        description: "Fitur penyimpanan konfigurasi ke database akan diimplementasikan. Data saat ini hanya tersimpan di state halaman.",
    });
    console.log("Konfigurasi yang akan disimpan:", config);
    // Placeholder untuk menyimpan ke Firestore
    // try {
    //   await setDoc(doc(db, 'koperasiConfig', 'shuAllocation'), {
    //     ...config,
    //     lastUpdated: serverTimestamp(),
    //     updatedBy: user?.uid
    //   });
    //   toast({ title: "Konfigurasi Disimpan", description: "Pengaturan alokasi SHU berhasil diperbarui." });
    // } catch (error) {
    //   console.error("Error saving SHU config:", error);
    //   toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan.", variant: "destructive" });
    // }
    setIsSaving(false);
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role as UserProfile['role'])) {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Kembali ke Dasbor Admin</Button>
      </div>
    );
  }

  const allocationFields: Array<{ key: keyof ShuAllocationConfig; label: string }> = [
    { key: 'danaCadangan', label: 'Dana Cadangan Koperasi' },
    { key: 'jasaModalAnggota', label: 'Jasa Modal Anggota' },
    { key: 'jasaUsahaAnggota', label: 'Jasa Usaha Anggota' },
    { key: 'danaPendidikan', label: 'Dana Pendidikan Koperasi' },
    { key: 'danaSosial', label: 'Dana Sosial' },
    { key: 'danaPengurusKaryawan', label: 'Dana Pengurus & Karyawan' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Pengaturan Alokasi SHU</h1>
        </div>
        <Button onClick={() => router.push('/admin/finance/reports')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Laporan Keuangan
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Konfigurasi Persentase Alokasi SHU</CardTitle>
          <CardDescription>
            Atur persentase pembagian Sisa Hasil Usaha (SHU) sesuai dengan AD/ART Koperasi.
            Pastikan total persentase adalah 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {allocationFields.map(field => (
            <div key={field.key} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={field.key} className="col-span-2">{field.label}</Label>
              <div className="relative col-span-1">
                <Input
                  id={field.key}
                  name={field.key}
                  type="number"
                  value={config[field.key]}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="pr-7"
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Total Persentase Alokasi:</span>
              <span className={totalPercentage === 100 ? 'text-green-600' : 'text-destructive'}>
                {totalPercentage.toFixed(2)}%
              </span>
            </div>
            {totalPercentage !== 100 && (
              <Alert variant="destructive" className="mt-2">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Perhatian!</AlertTitle>
                <AlertDescription>Total persentase alokasi harus sama dengan 100%.</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveConfig} disabled={isSaving || totalPercentage !== 100}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Konfigurasi (Simulasi)
          </Button>
        </CardFooter>
      </Card>

      <Alert>
        <Settings2 className="h-4 w-4" />
        <AlertTitle>Tahap Selanjutnya</AlertTitle>
        <AlertDescription>
          Setelah konfigurasi ini disimpan (implementasi penyimpanan ke database akan dilakukan berikutnya), langkah selanjutnya adalah:
          <ul className="list-disc list-inside mt-2 pl-4">
            <li>Memastikan Laporan Laba Rugi Bulanan sudah akurat.</li>
            <li>Mengembangkan mekanisme untuk menghitung SHU yang akan dibagikan berdasarkan laba bersih dan persentase ini.</li>
            <li>Mengelola data partisipasi anggota untuk perhitungan Jasa Usaha dan Jasa Modal.</li>
            <li>Membuat jurnal akuntansi untuk pencatatan distribusi SHU.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

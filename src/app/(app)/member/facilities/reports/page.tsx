
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // For file input placeholder
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ArrowLeft, ShieldAlert, Loader2, LineChart, FileText, UploadCloud, Send, Printer } from 'lucide-react';
import type { FacilityApplicationData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';


const reportSchema = z.object({
  selectedFacilityId: z.string().min(1, "Pilih fasilitas yang akan dilaporkan."),
  progressDescription: z.string().min(20, "Deskripsi perkembangan minimal 20 karakter."),
  // photoFile: z.instanceof(FileList).optional(), // Placeholder for actual file handling
});
type ReportFormValues = z.infer<typeof reportSchema>;

export default function MemberFacilityReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [approvedApplications, setApprovedApplications] = useState<FacilityApplicationData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      selectedFacilityId: '',
      progressDescription: '',
    },
  });

  const fetchApprovedApplications = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const q = query(
        collection(db, 'facilityApplications'),
        where('userId', '==', user.uid),
        where('status', 'in', ['approved', 'completed']) // Report for approved or completed
      );
      const querySnapshot = await getDocs(q);
      const appsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<FacilityApplicationData, 'id'>),
        applicationDate: (doc.data().applicationDate as Timestamp)?.toDate(),
      })) as FacilityApplicationData[];
      setApprovedApplications(appsData);
    } catch (error) {
      console.error("Error fetching approved applications:", error);
      toast({ title: "Error", description: "Gagal memuat daftar fasilitas Anda.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'member') {
        router.push('/');
      } else if (user.status !== 'approved') {
        // Allow access but show different message or limit functionality if needed
      } else {
        fetchApprovedApplications();
      }
    }
  }, [user, authLoading, router, fetchApprovedApplications]);

  const onSubmitReport = async (values: ReportFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // In a real scenario, handle file upload for values.photoFile
      // For now, we'll just save the text report
      await addDoc(collection(db, 'facilityReports'), {
        memberId: user.uid,
        facilityApplicationId: values.selectedFacilityId,
        reportDate: serverTimestamp(),
        progressDescription: values.progressDescription,
        // photoUrls: [], // Placeholder for uploaded photo URLs
      });
      toast({ title: "Laporan Terkirim", description: "Laporan perkembangan usaha Anda berhasil dikirim." });
      form.reset();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({ title: "Gagal Mengirim Laporan", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };


  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Akses Ditolak</AlertTitle><AlertDescription>Anda harus menjadi anggota untuk mengakses halaman ini.</AlertDescription></Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  if (user.status !== 'approved') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Fitur Terbatas</AlertTitle><AlertDescription>Status keanggotaan Anda belum disetujui. Anda belum dapat membuat laporan usaha.</AlertDescription></Alert>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <LineChart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Laporan Perkembangan Usaha</h1>
        </div>
        <div>
          <Button onClick={handlePrint} variant="outline" className="mr-2">
            <Printer className="mr-2 h-4 w-4" /> Cetak Halaman
          </Button>
          <Button onClick={() => router.push('/member/dashboard')} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor</Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitReport)}>
            <CardHeader>
              <CardTitle className="text-xl font-headline text-accent">Kirim Laporan Baru</CardTitle>
              <CardDescription>Laporkan perkembangan usaha atau penggunaan fasilitas yang Anda terima.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="selectedFacilityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilih Fasilitas yang Dilaporkan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih dari daftar fasilitas yang disetujui..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {approvedApplications.length > 0 ? (
                          approvedApplications.map(app => (
                            <SelectItem key={app.id} value={app.id!}>
                              {app.facilityType} ({app.specificProductName || app.quantityOrAmount}) - Diajukan: {app.applicationDate instanceof Date ? app.applicationDate.toLocaleDateString('id-ID') : 'N/A'}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground">Belum ada fasilitas yang disetujui untuk dilaporkan.</div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="progressDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi Perkembangan Usaha/Penggunaan Fasilitas</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} placeholder="Jelaskan kemajuan, hasil, atau kendala yang dihadapi..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Unggah Foto Pendukung (Opsional)</FormLabel>
                <FormControl>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Klik untuk unggah</span> atau seret file</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 5MB)</p>
                        </div>
                        <Input id="photo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" disabled />
                        {/* Actual file handling for form.setValue('photoFile', e.target.files) would go here */}
                    </label>
                  </div>
                </FormControl>
                <FormDescription>Unggah foto yang relevan dengan laporan Anda (fitur segera hadir).</FormDescription>
                <FormMessage />
              </FormItem>

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || approvedApplications.length === 0}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Kirim Laporan
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

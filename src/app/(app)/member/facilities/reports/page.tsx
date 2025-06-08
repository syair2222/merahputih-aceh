
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react'; // Added useRef
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ArrowLeft, ShieldAlert, Loader2, LineChart, FileText, UploadCloud, Send, Printer, AlertTriangle, CheckCircle } from 'lucide-react'; // Added AlertTriangle, CheckCircle
import type { FacilityApplicationData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image'; // Added Image for preview

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const reportSchema = z.object({
  selectedFacilityId: z.string().min(1, "Pilih fasilitas yang akan dilaporkan."),
  progressDescription: z.string().min(20, "Deskripsi perkembangan minimal 20 karakter."),
  photoFile: z.instanceof(FileList).optional() // Keep for schema validation if file is attached, but direct RHF control is minimal
});
type ReportFormValues = z.infer<typeof reportSchema>;

interface PhotoUploadStatus {
  isLoading: boolean;
  url?: string;
  error?: string;
  fileDetails?: {
    name: string;
    type: string;
    size: number;
    previewUrl?: string; // For image preview
  };
}

export default function MemberFacilityReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [approvedApplications, setApprovedApplications] = useState<FacilityApplicationData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [photoUploadStatus, setPhotoUploadStatus] = useState<PhotoUploadStatus>({ isLoading: false });
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      selectedFacilityId: '',
      progressDescription: '',
      photoFile: undefined,
    },
  });

  const fetchApprovedApplications = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const q = query(
        collection(db, 'facilityApplications'),
        where('userId', '==', user.uid),
        where('status', 'in', ['approved', 'completed'])
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
        setDataLoading(false); // Stop loading if not approved
      } else {
        fetchApprovedApplications();
      }
    }
  }, [user, authLoading, router, fetchApprovedApplications]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      if (photoUploadStatus.fileDetails || photoUploadStatus.url) {
        setPhotoUploadStatus({ isLoading: false, url: undefined, error: undefined, fileDetails: undefined });
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Upload Gagal", description: `File ${file.name} terlalu besar (Maks 5MB).`, variant: "destructive" });
      setPhotoUploadStatus({ isLoading: false, error: "File terlalu besar", fileDetails: { name: file.name, type: file.type, size: file.size } });
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Upload Gagal", description: `Format file ${file.name} tidak didukung. Hanya JPG, PNG, WEBP.`, variant: "destructive" });
      setPhotoUploadStatus({ isLoading: false, error: "Format file tidak didukung", fileDetails: { name: file.name, type: file.type, size: file.size } });
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      return;
    }

    setPhotoUploadStatus({
      isLoading: true,
      url: undefined,
      error: undefined,
      fileDetails: {
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      }
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'koperasi_unsigned_preset'); // Replace with your Cloudinary upload preset

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dj0g9plk8/image/upload', { // Replace with your Cloudinary cloud name
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Cloudinary upload failed: ${response.statusText}`);
      }
      const data = await response.json();
      setPhotoUploadStatus(prev => ({
        ...prev,
        isLoading: false,
        url: data.secure_url,
      }));
      toast({ title: "Upload Berhasil", description: `${file.name} telah diupload.` });
    } catch (err: any) {
      console.error("Error uploading to Cloudinary:", err);
      toast({ title: "Upload Gagal", description: `Gagal mengupload ${file.name}. ${err.message}`, variant: "destructive" });
      setPhotoUploadStatus(prev => ({
        ...prev,
        isLoading: false,
        error: `Upload ${file.name} gagal.`,
      }));
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input on error
    }
  };

  const onSubmitReport = async (values: ReportFormValues) => {
    if (!user) return;
    if (photoUploadStatus.isLoading) {
        toast({ title: "Proses Unggah", description: "Mohon tunggu foto selesai diunggah.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'facilityReports'), {
        memberId: user.uid,
        facilityApplicationId: values.selectedFacilityId,
        reportDate: serverTimestamp(),
        progressDescription: values.progressDescription,
        photoUrls: photoUploadStatus.url ? [photoUploadStatus.url] : [],
      });
      toast({ title: "Laporan Terkirim", description: "Laporan perkembangan usaha Anda berhasil dikirim." });
      form.reset();
      setPhotoUploadStatus({ isLoading: false });
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
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

  const triggerFileInputClick = () => {
    fileInputRef.current?.click();
  };


  if (authLoading || (dataLoading && user?.status === 'approved')) {
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
              {/* Modified File Input Area */}
              <FormItem>
                <FormLabel>Unggah Foto Pendukung (Opsional)</FormLabel>
                <FormControl>
                  <div
                    onClick={triggerFileInputClick}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {photoUploadStatus.isLoading ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : photoUploadStatus.fileDetails?.previewUrl && !photoUploadStatus.error ? (
                      <Image src={photoUploadStatus.fileDetails.previewUrl} alt="Pratinjau Foto" width={80} height={80} className="object-contain rounded-md max-h-20" />
                    ) : (
                      <UploadCloud className="w-8 h-8 text-muted-foreground" />
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-semibold">
                        {photoUploadStatus.fileDetails && !photoUploadStatus.error ? 'Ganti Foto' : 'Klik untuk unggah'}
                      </span> atau seret file
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 5MB)</p>
                    <Input
                      ref={fileInputRef}
                      id="photo-upload-report-input" // Changed ID to avoid potential conflicts with any label's htmlFor
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoUpload}
                      disabled={photoUploadStatus.isLoading}
                    />
                  </div>
                </FormControl>
                <FormDescription>Unggah foto yang relevan dengan laporan Anda.</FormDescription>
                {photoUploadStatus.error && (
                  <p className="text-sm text-destructive mt-1 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> {photoUploadStatus.error}
                  </p>
                )}
                {photoUploadStatus.url && !photoUploadStatus.error && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" /> Foto "{photoUploadStatus.fileDetails?.name}" berhasil diunggah.
                  </p>
                )}
                 {/* For RHF field-level errors if photoFile was required & validated by Zod directly */}
                <FormMessage />
              </FormItem>

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || approvedApplications.length === 0 || photoUploadStatus.isLoading}>
                {(isSubmitting || photoUploadStatus.isLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Kirim Laporan
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}


'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ShieldAlert, Loader2, Send, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import type { FacilityApplicationData, FacilityType, MemberBusinessArea } from '@/types';
import { FacilityTypeOptions, MemberBusinessAreaOptions } from '@/types';
import { db } from '@/lib/firebase'; // Assuming you'll save to Firestore
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const fileSchema = z.instanceof(FileList)
  .optional()
  .refine(
    (files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE,
    `Ukuran file maksimal 5MB.`
  )
  .refine(
    (files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files[0].type),
    "Format file tidak valid. Hanya JPG, PNG, WEBP, atau PDF."
  );


const applicationSchema = z.object({
  memberFullName: z.string().min(1, "Nama lengkap wajib diisi."),
  memberIdNumber: z.string().min(1, "Nomor anggota koperasi wajib diisi."),
  memberAddress: z.string().min(1, "Alamat domisili wajib diisi."),
  facilityType: z.enum(FacilityTypeOptions, { required_error: "Jenis produk/layanan wajib dipilih." }),
  specificProductName: z.string().optional(),
  quantityOrAmount: z.string().min(1, "Jumlah atau kuantitas wajib diisi."),
  purpose: z.string().min(10, "Tujuan penggunaan minimal 10 karakter."),
  memberBusinessArea: z.enum(MemberBusinessAreaOptions, { required_error: "Bidang usaha wajib dipilih." }),
  otherMemberBusinessArea: z.string().optional(),
  estimatedUsageOrRepaymentTime: z.string().optional(),
  hasAppliedBefore: z.enum(['Ya', 'Tidak'], { required_error: "Mohon pilih salah satu." }),
  previousApplicationDetails: z.string().optional(),
  additionalNotes: z.string().optional(),
  proposalFile: fileSchema,
  productPhotoFile: fileSchema,
  statementLetterFile: fileSchema,
  otherSupportFile: fileSchema,
}).refine(data => {
    if (data.facilityType === 'Lainnya') {
      return !!data.specificProductName && data.specificProductName.length > 0;
    }
    return true;
  }, {
    message: "Nama produk/layanan khusus wajib diisi jika memilih 'Lainnya'.",
    path: ['specificProductName'],
  })
  .refine(data => {
    if (data.memberBusinessArea === 'Lainnya') {
      return !!data.otherMemberBusinessArea && data.otherMemberBusinessArea.length > 0;
    }
    return true;
  }, {
    message: "Bidang usaha lainnya wajib diisi jika memilih 'Lainnya'.",
    path: ['otherMemberBusinessArea'],
  })
  .refine(data => {
    if (data.hasAppliedBefore === 'Ya') {
      return !!data.previousApplicationDetails && data.previousApplicationDetails.length > 0;
    }
    return true;
  }, {
    message: "Detail pengajuan sebelumnya wajib diisi jika pernah mengajukan.",
    path: ['previousApplicationDetails'],
  });

type ApplicationFormValues = z.infer<typeof applicationSchema>;

// Placeholder for Cloudinary upload, adapt from registration form if needed
const uploadFileToCloudinary = async (file: File, uploadPreset: string, cloudName: string): Promise<string> => {
  // This is a MOCK. Replace with actual Cloudinary upload logic.
  console.log(`Mock uploading ${file.name}...`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
  return `https://res.cloudinary.com/${cloudName}/image/upload/v1620000000/placeholder_${file.name.replace(/\s/g, '_')}.jpg`;
};


export default function MemberApplyFacilityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, string | null>>({});
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number | null>>({});


  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      memberFullName: '',
      memberIdNumber: '',
      memberAddress: '',
      specificProductName: '',
      quantityOrAmount: '',
      purpose: '',
      otherMemberBusinessArea: '',
      estimatedUsageOrRepaymentTime: '',
      previousApplicationDetails: '',
      additionalNotes: '',
      hasAppliedBefore: undefined,
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'member') {
        router.push('/');
      } else if (user.status !== 'approved') {
         // Allow access to form, but submission might be blocked or noted
      }
      // Pre-fill form with user data if available
      form.setValue('memberFullName', user.displayName || '');
      if (user.memberIdNumber) { // Assuming memberIdNumber is populated in user object after approval
        form.setValue('memberIdNumber', user.memberIdNumber);
      }
      // You might need to fetch member's address from 'members' collection
      // For now, let's keep it manual or fetch it here:
      const fetchMemberAddress = async () => {
        if (user.uid) {
            const memberDocRef = doc(db, "members", user.uid);
            const memberDocSnap = await getDoc(memberDocRef);
            if (memberDocSnap.exists()) {
                const memberDetails = memberDocSnap.data();
                const fullAddress = `${memberDetails.addressDusun}, RT/RW ${memberDetails.addressRtRw}, Desa ${memberDetails.addressDesa}, Kec. ${memberDetails.addressKecamatan}`;
                form.setValue('memberAddress', fullAddress);
                if (memberDetails.memberIdNumber) {
                    form.setValue('memberIdNumber', memberDetails.memberIdNumber);
                }
            }
        }
      };
      fetchMemberAddress();

    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router, form]);


  const handleFileUploadForField = async (file: File | undefined, fieldName: keyof ApplicationFormValues) => {
    if (!file) {
      setFilePreviews(prev => ({ ...prev, [fieldName]: null }));
      form.setValue(fieldName as any, undefined); // Clear FileList if file is removed
      return;
    }

    const validationResult = fileSchema.safeParse(new DataTransfer().files); // Wrap file in FileList for schema
    if (validationResult.success && validationResult.data && validationResult.data[0]){
       // Use the file from validationResult.data[0]
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      toast({ title: "File Tidak Sesuai", description: `File ${file.name} tidak valid (format/ukuran).`, variant: "destructive" });
      setFilePreviews(prev => ({ ...prev, [fieldName]: null }));
      form.setValue(fieldName as any, undefined);
      form.setError(fieldName as any, { message: "File tidak valid."});
      return;
    }
    form.clearErrors(fieldName as any);

    setFilePreviews(prev => ({ ...prev, [fieldName]: URL.createObjectURL(file) }));
    // The file object itself is stored in the form state by react-hook-form's Controller
    // Actual upload to Cloudinary will happen on form submission
  };


  const onSubmit = async (data: ApplicationFormValues) => {
    if (user?.status !== 'approved') {
      toast({
        title: "Aksi Belum Diizinkan",
        description: "Status keanggotaan Anda belum 'approved'. Anda belum dapat mengajukan fasilitas.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const supportingDocuments: { name: string; url: string; type: string; size: number }[] = [];
      const CLOUDINARY_CLOUD_NAME = 'dj0g9plk8'; // TODO: Move to env
      const CLOUDINARY_UPLOAD_PRESET = 'koperasi_unsigned_preset'; // TODO: Move to env

      const uploadPromises: Promise<void>[] = [];

      const processUpload = async (fileList: FileList | undefined, originalName: string) => {
        if (fileList && fileList.length > 0) {
          const file = fileList[0];
          // Actual Cloudinary upload function
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          
          const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error(`Upload ${file.name} gagal.`);
          const result = await response.json();
          supportingDocuments.push({ name: originalName || file.name, url: result.secure_url, type: file.type, size: file.size });
        }
      };
      
      if (data.proposalFile && data.proposalFile.length > 0) uploadPromises.push(processUpload(data.proposalFile, "Proposal Usaha"));
      if (data.productPhotoFile && data.productPhotoFile.length > 0) uploadPromises.push(processUpload(data.productPhotoFile, "Foto Produk/Alat"));
      if (data.statementLetterFile && data.statementLetterFile.length > 0) uploadPromises.push(processUpload(data.statementLetterFile, "Surat Pernyataan"));
      if (data.otherSupportFile && data.otherSupportFile.length > 0) uploadPromises.push(processUpload(data.otherSupportFile, "Dokumen Pendukung Lainnya"));

      await Promise.all(uploadPromises);


      const applicationToSave: Omit<FacilityApplicationData, 'id' | 'proposalFile' | 'productPhotoFile' | 'statementLetterFile' | 'otherSupportFile'> = {
        userId: user!.uid,
        memberFullName: data.memberFullName,
        memberIdNumber: data.memberIdNumber,
        memberAddress: data.memberAddress,
        facilityType: data.facilityType,
        specificProductName: data.specificProductName,
        quantityOrAmount: data.quantityOrAmount,
        purpose: data.purpose,
        memberBusinessArea: data.memberBusinessArea,
        otherMemberBusinessArea: data.otherMemberBusinessArea,
        estimatedUsageOrRepaymentTime: data.estimatedUsageOrRepaymentTime,
        hasAppliedBefore: data.hasAppliedBefore,
        previousApplicationDetails: data.previousApplicationDetails,
        additionalNotes: data.additionalNotes,
        supportingDocuments: supportingDocuments,
        applicationDate: serverTimestamp(),
        status: 'pending_review',
        lastUpdated: serverTimestamp(),
      };

      await addDoc(collection(db, 'facilityApplications'), applicationToSave);

      toast({
        title: 'Pengajuan Berhasil Dikirim!',
        description: 'Pengajuan Anda telah diterima dan akan segera diproses.',
      });
      form.reset();
      setFilePreviews({});
      router.push('/member/facilities/history');
    } catch (error) {
      console.error("Error submitting application: ", error);
      toast({
        title: 'Pengajuan Gagal',
        description: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat halaman...</p>
      </div>
    );
  }

  if (!user || user.role !== 'member') {
    // This case should ideally be handled by redirect in useEffect,
    // but as a fallback:
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda harus menjadi anggota untuk mengakses halaman ini.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  if (user.status !== 'approved') {
    return (
      <div className="text-center p-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Fitur Terbatas</AlertTitle>
          <AlertDescription>Status keanggotaan Anda belum disetujui. Anda belum dapat mengajukan fasilitas.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor Anggota
        </Button>
      </div>
    );
  }

  const renderFileInput = (
    formFieldName: keyof ApplicationFormValues,
    label: string,
    dataAiHint?: string
  ) => (
    <FormField
      control={form.control}
      name={formFieldName}
      render={({ field: { onChange, value, ...restField }}) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(",")}
              onChange={(e) => {
                onChange(e.target.files); // Update react-hook-form state with FileList
                handleFileUploadForField(e.target.files?.[0], formFieldName);
              }}
              {...restField}
              className="border-dashed border-2 hover:border-primary pt-2"
            />
          </FormControl>
          <FormDescription>Format: JPG, PNG, WEBP, PDF. Maks 5MB.</FormDescription>
          {filePreviews[formFieldName] && ACCEPTED_FILE_TYPES.some(type => filePreviews[formFieldName]?.startsWith(type.split('/')[0])) && !filePreviews[formFieldName]?.endsWith('pdf') && (
            <Image src={filePreviews[formFieldName]!} alt={`Preview ${label}`} width={100} height={100} className="mt-2 rounded border" data-ai-hint={dataAiHint || "document"} />
          )}
          {filePreviews[formFieldName] && filePreviews[formFieldName]?.endsWith('pdf') && (
             <p className="text-xs text-muted-foreground mt-1">Pratinjau PDF: {value?.[0]?.name}</p>
          )}
           {form.formState.errors[formFieldName] && (
             <FormMessage>{form.formState.errors[formFieldName]?.message?.toString()}</FormMessage>
           )}
        </FormItem>
      )}
    />
  );


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Send className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold text-primary">Formulir Pengajuan Produk Koperasi</h1>
        </div>
        <Button onClick={() => router.push('/member/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dasbor
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent">Detail Pengajuan</CardTitle>
          <CardDescription>Isi semua data yang diperlukan dengan benar dan lengkap.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="memberFullName" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap (Sesuai KTP)</FormLabel><FormControl><Input {...field} placeholder="Nama Anda" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="memberIdNumber" render={({ field }) => (<FormItem><FormLabel>Nomor Anggota Koperasi</FormLabel><FormControl><Input {...field} placeholder="Nomor ID Anggota Anda" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="memberAddress" render={({ field }) => (<FormItem><FormLabel>Alamat Domisili Saat Ini</FormLabel><FormControl><Textarea {...field} placeholder="Alamat lengkap Anda" /></FormControl><FormMessage /></FormItem>)} />

              <FormField control={form.control} name="facilityType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Produk atau Layanan yang Diajukan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Jenis Produk/Layanan" /></SelectTrigger></FormControl>
                    <SelectContent>{FacilityTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {form.watch('facilityType') === 'Lainnya' && (
                <FormField control={form.control} name="specificProductName" render={({ field }) => (<FormItem><FormLabel>Nama Produk atau Layanan Khusus</FormLabel><FormControl><Input {...field} placeholder="Cth: Pupuk Urea 50 kg" /></FormControl><FormMessage /></FormItem>)} />
              )}
              <FormField control={form.control} name="quantityOrAmount" render={({ field }) => (<FormItem><FormLabel>Jumlah atau Kuantitas yang Diajukan</FormLabel><FormControl><Input {...field} placeholder="Cth: 5 unit, Rp 5.000.000" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="purpose" render={({ field }) => (<FormItem><FormLabel>Tujuan atau Kebutuhan Penggunaan</FormLabel><FormControl><Textarea {...field} placeholder="Jelaskan tujuan pengajuan Anda" /></FormControl><FormMessage /></FormItem>)} />

              <FormField control={form.control} name="memberBusinessArea" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bidang Usaha Anggota</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih Bidang Usaha" /></SelectTrigger></FormControl>
                    <SelectContent>{MemberBusinessAreaOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {form.watch('memberBusinessArea') === 'Lainnya' && (
                <FormField control={form.control} name="otherMemberBusinessArea" render={({ field }) => (<FormItem><FormLabel>Bidang Usaha Lainnya</FormLabel><FormControl><Input {...field} placeholder="Sebutkan bidang usaha Anda" /></FormControl><FormMessage /></FormItem>)} />
              )}

              <FormField control={form.control} name="estimatedUsageOrRepaymentTime" render={({ field }) => (<FormItem><FormLabel>Estimasi Waktu Penggunaan atau Pelunasan (Jika Pinjaman)</FormLabel><FormControl><Input {...field} placeholder="Cth: 3 bulan, atau tanggal YYYY-MM-DD" /></FormControl><FormMessage /></FormItem>)} />

              <FormField control={form.control} name="hasAppliedBefore" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Apakah Anggota Sudah Pernah Mengajukan Bantuan Sebelumnya?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Ya" /></FormControl><FormLabel className="font-normal">Ya</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Tidak" /></FormControl><FormLabel className="font-normal">Tidak</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {form.watch('hasAppliedBefore') === 'Ya' && (
                <FormField control={form.control} name="previousApplicationDetails" render={({ field }) => (<FormItem><FormLabel>Jika Ya, jelaskan bentuk bantuan dan statusnya</FormLabel><FormControl><Textarea {...field} placeholder="Cth: Pinjaman modal Rp 2.000.000, status Lunas" /></FormControl><FormMessage /></FormItem>)} />
              )}

              <h3 className="text-md font-semibold pt-4 border-t">Upload Dokumen Pendukung (Opsional)</h3>
              {renderFileInput('proposalFile', 'Proposal Usaha', 'business proposal')}
              {renderFileInput('productPhotoFile', 'Foto Produk / Alat', 'product photo')}
              {renderFileInput('statementLetterFile', 'Surat Pernyataan', 'statement letter')}
              {renderFileInput('otherSupportFile', 'Dokumen Pendukung Lainnya', 'document scan')}


              <FormField control={form.control} name="additionalNotes" render={({ field }) => (<FormItem><FormLabel>Catatan Tambahan (Opsional)</FormLabel><FormControl><Textarea {...field} placeholder="Informasi tambahan yang relevan" /></FormControl><FormMessage /></FormItem>)} />

            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Pengajuan
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}


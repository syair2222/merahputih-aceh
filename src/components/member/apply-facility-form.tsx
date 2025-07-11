
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UploadCloud, CheckCircle, AlertTriangle, Users, ChevronDown, ChevronsUpDown, Building, Briefcase, Home } from 'lucide-react'; // Added Building, Briefcase, Home
import type { FacilityApplicationData, MemberRegistrationData, TargetEntityType } from '@/types'; // Added TargetEntityType
import { FacilityTypeOptions, MemberBusinessAreaOptions, TargetEntityTypeOptions } from '@/types'; // Added TargetEntityTypeOptions
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_PDF_TYPES = ["application/pdf"];
const ALL_ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_PDF_TYPES];

const CLOUDINARY_CLOUD_NAME = 'dj0g9plk8';
const CLOUDINARY_UPLOAD_PRESET = 'koperasi_unsigned_preset';

const fileInputSchema = z.instanceof(FileList)
  .optional()
  .refine(
    (files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE,
    `Ukuran file maksimal 5MB.`
  )
  .refine(
    (files) => !files || files.length === 0 || ALL_ACCEPTED_TYPES.includes(files[0].type),
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
  
  targetEntityType: z.enum(TargetEntityTypeOptions).optional(),
  targetEntityName: z.string().optional(),

  proposalFile: fileInputSchema,
  productPhotoFile: fileInputSchema,
  statementLetterFile: fileInputSchema,
  otherSupportFile: fileInputSchema,
  selectedRecommenderIds: z.array(z.string()).optional().default([]),
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
  }).refine(data => {
    if (data.targetEntityType === 'BANK_MITRA' || data.targetEntityType === 'DINAS_TERKAIT') {
        return !!data.targetEntityName && data.targetEntityName.trim().length > 0;
    }
    return true;
  }, {
    message: "Nama Bank/Dinas wajib diisi jika jenis target dipilih.",
    path: ["targetEntityName"]
  });

type ApplicationFormValues = z.infer<typeof applicationSchema>;
type FileInputFieldName = 'proposalFile' | 'productPhotoFile' | 'statementLetterFile' | 'otherSupportFile';

interface FileUploadStatus {
  isLoading: boolean;
  url?: string;
  error?: string;
  fileDetails?: {
    name: string;
    type: string;
    size: number;
    previewUrl?: string;
  };
}

interface ApplyFacilityFormProps {
  onFormSubmitSuccess?: () => void;
  className?: string;
}

interface AvailableMember {
  id: string;
  fullName: string;
  email?: string; 
}

const targetEntityTypeDisplay: Record<TargetEntityType, {label: string, icon?: React.ElementType}> = {
    KOPERASI_INTERNAL: {label: 'Koperasi Internal', icon: Home},
    BANK_MITRA: {label: 'Bank Mitra', icon: Building},
    DINAS_TERKAIT: {label: 'Dinas Terkait', icon: Briefcase},
    UMUM_BELUM_DITENTUKAN: {label: 'Umum / Belum Ditentukan', icon: Users},
};

export default function ApplyFacilityForm({ onFormSubmitSuccess, className }: ApplyFacilityFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMembersForRec, setAvailableMembersForRec] = useState<AvailableMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [fileUploadStates, setFileUploadStates] = useState<Record<FileInputFieldName, FileUploadStatus>>({
    proposalFile: { isLoading: false },
    productPhotoFile: { isLoading: false },
    statementLetterFile: { isLoading: false },
    otherSupportFile: { isLoading: false },
  });

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    mode: "onChange",
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
      targetEntityType: 'KOPERASI_INTERNAL', // Default to Koperasi Internal
      targetEntityName: '',
      proposalFile: undefined,
      productPhotoFile: undefined,
      statementLetterFile: undefined,
      otherSupportFile: undefined,
      selectedRecommenderIds: [],
    },
  });

  useEffect(() => {
    if (user) {
      form.setValue('memberFullName', user.displayName || '');
      const fetchMemberDetails = async () => {
        if (user.uid) {
            const memberDocRef = doc(db, "members", user.uid);
            const memberDocSnap = await getDoc(memberDocRef);
            if (memberDocSnap.exists()) {
                const memberDetails = memberDocSnap.data() as MemberRegistrationData;
                const fullAddress = `${memberDetails.addressDusun || ''}, RT/RW ${memberDetails.addressRtRw || ''}, Desa ${memberDetails.addressDesa || ''}, Kec. ${memberDetails.addressKecamatan || ''}`.replace(/^, |, $/g, '');
                form.setValue('memberAddress', fullAddress);
                if (memberDetails.memberIdNumber) {
                    form.setValue('memberIdNumber', memberDetails.memberIdNumber);
                }
            }
        }
      };
      fetchMemberDetails();
    }
  }, [user, form]);

  useEffect(() => {
    const fetchAvailableMembers = async () => {
      if (!user) return;
      setLoadingMembers(true);
      try {
        const membersRef = collection(db, 'members');
        const q = query(membersRef, where('status', '==', 'approved'));
        const querySnapshot = await getDocs(q);
        const membersList = querySnapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AvailableMember))
          .filter(member => member.id !== user.uid); 
        setAvailableMembersForRec(membersList);
      } catch (error) {
        console.error("Error fetching available members:", error);
        toast({ title: "Gagal Memuat Anggota", description: "Tidak dapat memuat daftar anggota untuk rekomendasi.", variant: "destructive" });
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchAvailableMembers();
  }, [user, toast]);


  const handleIndividualFileUpload = async (
    file: File | undefined,
    fieldName: FileInputFieldName
  ) => {
    if (!file) {
      setFileUploadStates(prev => ({
        ...prev,
        [fieldName]: { isLoading: false, url: undefined, error: undefined, fileDetails: undefined }
      }));
      form.clearErrors(fieldName);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
        toast({ title: "Upload Gagal", description: `File ${file.name} terlalu besar (Maks 5MB).`, variant: "destructive" });
        form.setValue(fieldName, undefined); 
        form.setError(fieldName, { message: "Ukuran file maksimal 5MB."});
        setFileUploadStates(prev => ({ ...prev, [fieldName]: { isLoading: false, error: "File terlalu besar", fileDetails: undefined }}));
        return;
    }
    if (!ALL_ACCEPTED_TYPES.includes(file.type)) {
        toast({ title: "Upload Gagal", description: `Format file ${file.name} tidak didukung.`, variant: "destructive" });
        form.setValue(fieldName, undefined);
        form.setError(fieldName, { message: "Format file tidak valid."});
        setFileUploadStates(prev => ({ ...prev, [fieldName]: { isLoading: false, error: "Format file tidak valid", fileDetails: undefined }}));
        return;
    }
    form.clearErrors(fieldName);

    setFileUploadStates(prev => ({
      ...prev,
      [fieldName]: {
        isLoading: true,
        url: undefined,
        error: undefined,
        fileDetails: {
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        }
      }
    }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Cloudinary upload failed: ${response.statusText}`);
      }
      const data = await response.json();
      const cloudinaryUrl = data.secure_url;

      if (cloudinaryUrl) {
        setFileUploadStates(prev => ({
          ...prev,
          [fieldName]: {
            isLoading: false,
            url: cloudinaryUrl,
            error: undefined,
            fileDetails: prev[fieldName].fileDetails
          }
        }));
        toast({ title: "Upload Berhasil", description: `${file.name} telah diupload.` });
      } else {
        throw new Error('Upload berhasil, tetapi URL tidak diterima dari Cloudinary.');
      }
    } catch (err: any) {
      console.error(`Error uploading ${fieldName} to Cloudinary:`, err);
      toast({ title: "Upload Gagal", description: `Gagal mengupload ${file.name}. ${err.message}`, variant: "destructive" });
      setFileUploadStates(prev => ({
        ...prev,
        [fieldName]: {
          isLoading: false,
          url: undefined,
          error: `Upload ${file.name} gagal.`,
          fileDetails: prev[fieldName].fileDetails
        }
      }));
    }
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

    if (Object.values(fileUploadStates).some(s => s.isLoading)) {
      toast({ title: "Proses Unggah", description: "Mohon tunggu semua file selesai diunggah sebelum mengirim.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const supportingDocuments: Array<{ name: string; url: string; type: string; size: number }> = [];
      (Object.keys(fileUploadStates) as FileInputFieldName[]).forEach(fieldName => {
        const status = fileUploadStates[fieldName];
        if (status.url && status.fileDetails) {
          supportingDocuments.push({
            name: status.fileDetails.name,
            url: status.url,
            type: status.fileDetails.type,
            size: status.fileDetails.size,
          });
        }
      });

      const requestedRecommendations = (data.selectedRecommenderIds || [])
        .map(memberId => {
            const member = availableMembersForRec.find(m => m.id === memberId);
            return {
              memberId: memberId,
              memberName: member ? member.fullName : 'Anggota Tidak Dikenal',
              status: 'pending' as const
            };
          });

      const applicationToSave: Omit<FacilityApplicationData, 'id'> = {
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
        requestedRecommendations: requestedRecommendations,
        recommendationCount: 0,
        targetEntityType: data.targetEntityType || 'KOPERASI_INTERNAL', // Default if undefined
        targetEntityName: (data.targetEntityType === 'BANK_MITRA' || data.targetEntityType === 'DINAS_TERKAIT') ? data.targetEntityName : undefined,
      };

      await addDoc(collection(db, 'facilityApplications'), applicationToSave);

      toast({
        title: 'Pengajuan Berhasil Dikirim!',
        description: 'Pengajuan Anda telah diterima dan akan segera diproses.',
      });
      form.reset(); 
      setFileUploadStates({
        proposalFile: { isLoading: false },
        productPhotoFile: { isLoading: false },
        statementLetterFile: { isLoading: false },
        otherSupportFile: { isLoading: false },
      });
      form.setValue('proposalFile', undefined);
      form.setValue('productPhotoFile', undefined);
      form.setValue('statementLetterFile', undefined);
      form.setValue('otherSupportFile', undefined);
      form.setValue('selectedRecommenderIds', []);
      form.setValue('targetEntityType', 'KOPERASI_INTERNAL');
      form.setValue('targetEntityName', '');


      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      }
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

  const renderFileInput = (
    formFieldName: FileInputFieldName,
    label: string,
    description: string,
    dataAiHint?: string
  ) => {
    const uploadStatus = fileUploadStates[formFieldName];
    const currentFileList = form.watch(formFieldName);

    return (
      <FormField
        control={form.control}
        name={formFieldName}
        render={({ field: { onChange: onRHFChange, ref: fieldRef, ...restField } }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type="file"
                accept={ALL_ACCEPTED_TYPES.join(",")}
                onChange={(e) => {
                  const files = e.target.files;
                  onRHFChange(files); 
                  handleIndividualFileUpload(files?.[0], formFieldName);
                }}
                disabled={uploadStatus.isLoading}
                ref={fieldRef}
                className="pt-2 border-dashed border-2 hover:border-primary"
              />
            </FormControl>
            <FormDescription>{description} Max 5MB.</FormDescription>
            
            {uploadStatus.isLoading && <div className="flex items-center text-sm text-muted-foreground mt-1"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengupload {uploadStatus.fileDetails?.name}...</div>}
            
            {!uploadStatus.isLoading && uploadStatus.url && uploadStatus.fileDetails && (
                <div className="flex items-center text-sm text-green-600 mt-1">
                    <CheckCircle className="mr-2 h-4 w-4" /> {uploadStatus.fileDetails.name} berhasil diupload.
                    <Link href={uploadStatus.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs underline hover:text-primary">Lihat file</Link>
                </div>
            )}
            {!uploadStatus.isLoading && uploadStatus.error && (
                 <div className="flex items-center text-sm text-destructive mt-1"><AlertTriangle className="mr-2 h-4 w-4" /> {uploadStatus.error} ({uploadStatus.fileDetails?.name})</div>
            )}
            {!uploadStatus.isLoading && !uploadStatus.url && currentFileList?.[0] && (
              <div className="mt-2">
                {currentFileList[0].type.startsWith("image/") ? (
                  <Image src={URL.createObjectURL(currentFileList[0])} alt={`Preview ${label}`} width={100} height={100} className="rounded object-contain border" data-ai-hint={dataAiHint || "document"} />
                ) : currentFileList[0].type === "application/pdf" ? (
                  <p className="text-sm text-muted-foreground">Pratinjau PDF: {currentFileList[0].name}</p>
                ) : null}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
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
            <FormField control={form.control} name="specificProductName" render={({ field }) => (<FormItem><FormLabel>Nama Produk atau Layanan Khusus</FormLabel><FormControl><Input {...field} placeholder="Cth: Pupuk Urea 50 kg" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          )}
          <FormField control={form.control} name="quantityOrAmount" render={({ field }) => (<FormItem><FormLabel>Jumlah atau Kuantitas yang Diajukan</FormLabel><FormControl><Input {...field} placeholder="Cth: 5 unit, Rp 5.000.000" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="purpose" render={({ field }) => (<FormItem><FormLabel>Tujuan atau Kebutuhan Penggunaan</FormLabel><FormControl><Textarea {...field} placeholder="Jelaskan tujuan pengajuan Anda" value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />

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
            <FormField control={form.control} name="otherMemberBusinessArea" render={({ field }) => (<FormItem><FormLabel>Bidang Usaha Lainnya</FormLabel><FormControl><Input {...field} placeholder="Sebutkan bidang usaha Anda" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          )}

          <FormField control={form.control} name="estimatedUsageOrRepaymentTime" render={({ field }) => (<FormItem><FormLabel>Estimasi Waktu Penggunaan atau Pelunasan (Jika Pinjaman)</FormLabel><FormControl><Input {...field} placeholder="Cth: 3 bulan, atau tanggal YYYY-MM-DD" value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />

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
            <FormField control={form.control} name="previousApplicationDetails" render={({ field }) => (<FormItem><FormLabel>Jika Ya, jelaskan bentuk bantuan dan statusnya</FormLabel><FormControl><Textarea {...field} placeholder="Cth: Pinjaman modal Rp 2.000.000, status Lunas" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          )}

        <div className="pt-4 border-t">
            <FormField
                control={form.control}
                name="targetEntityType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-md font-semibold">Tujukan Pengajuan Ke:</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value as TargetEntityType);
                            if (value !== 'BANK_MITRA' && value !== 'DINAS_TERKAIT') {
                                form.setValue('targetEntityName', ''); // Clear name if not bank or agency
                            }
                        }} defaultValue={field.value || 'KOPERASI_INTERNAL'}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih tujuan pengajuan..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {TargetEntityTypeOptions.map(type => {
                                    const Icon = targetEntityTypeDisplay[type].icon;
                                    return (
                                        <SelectItem key={type} value={type}>
                                            <div className="flex items-center">
                                                {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                                                {targetEntityTypeDisplay[type].label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <FormDescription>Pilih kepada siapa pengajuan ini ditujukan.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {(form.watch('targetEntityType') === 'BANK_MITRA' || form.watch('targetEntityType') === 'DINAS_TERKAIT') && (
                <FormField
                    control={form.control}
                    name="targetEntityName"
                    render={({ field }) => (
                        <FormItem className="mt-4">
                            <FormLabel>Nama {form.watch('targetEntityType') === 'BANK_MITRA' ? 'Bank Mitra' : 'Dinas Terkait'}</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder={`Masukkan nama ${form.watch('targetEntityType') === 'BANK_MITRA' ? 'bank' : 'dinas'}...`} value={field.value ?? ''}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>


          <h3 className="text-md font-semibold pt-4 border-t">Upload Dokumen Pendukung (Opsional)</h3>
          {renderFileInput('proposalFile', 'Proposal Usaha (Jika Ada)', 'Format: JPG, PNG, WEBP, PDF.', 'business proposal')}
          {renderFileInput('productPhotoFile', 'Foto Produk / Alat (Jika Relevan)', 'Format: JPG, PNG, WEBP, PDF.', 'product item equipment')}
          {renderFileInput('statementLetterFile', 'Surat Pernyataan (Jika Diminta)', 'Format: JPG, PNG, WEBP, PDF.', 'formal letter document')}
          {renderFileInput('otherSupportFile', 'Dokumen Pendukung Lainnya', 'Format: JPG, PNG, WEBP, PDF.', 'document scan certificate')}

          <FormField control={form.control} name="additionalNotes" render={({ field }) => (<FormItem><FormLabel>Catatan Tambahan (Opsional)</FormLabel><FormControl><Textarea {...field} placeholder="Informasi tambahan yang relevan" value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
        
          <div className="pt-4 border-t">
            <FormField
                control={form.control}
                name="selectedRecommenderIds"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-md font-semibold">Minta Rekomendasi dari Anggota Lain (Opsional)</FormLabel>
                        <FormDescription>Pilih anggota yang ingin Anda mintai dukungan untuk pengajuan ini.</FormDescription>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {field.value && field.value.length > 0 ? `${field.value.length} anggota dipilih` : "Pilih anggota..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0">
                                {loadingMembers ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Memuat daftar anggota...</div>
                                ) : availableMembersForRec.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada anggota lain yang tersedia untuk dimintai rekomendasi.</div>
                                ) : (
                                    <ScrollArea className="max-h-72">
                                        <div className="p-2 space-y-1">
                                        {availableMembersForRec.map((member) => (
                                            <FormItem key={member.id} className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-muted/50 rounded-md">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(member.id)}
                                                        onCheckedChange={(checked) => {
                                                            const currentValues = field.value || [];
                                                            return checked
                                                                ? field.onChange([...currentValues, member.id])
                                                                : field.onChange(currentValues.filter((id) => id !== member.id));
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm w-full cursor-pointer">
                                                    {member.fullName} <span className="text-xs text-muted-foreground">({member.email || member.id.substring(0,6)+'...'})</span>
                                                </FormLabel>
                                            </FormItem>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>

          <Button type="submit" className="w-full mt-6" disabled={isSubmitting || Object.values(fileUploadStates).some(s => s.isLoading)}>
            {(isSubmitting || Object.values(fileUploadStates).some(s => s.isLoading)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kirim Pengajuan
          </Button>
      </form>
    </Form>
  );
}


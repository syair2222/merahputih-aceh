
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import React, { useState, useId } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { MemberRegistrationData, MembershipType, BusinessField } from '@/types';
import { BusinessFieldsOptions } from '@/types';
import { CalendarIcon, Eye, EyeOff, Loader2, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Image from 'next/image';
import type { FirebaseError } from 'firebase/app';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_PDF_TYPES = ["application/pdf"];

// Cloudinary constants
const CLOUDINARY_CLOUD_NAME = 'dj0g9plk8'; 
const CLOUDINARY_UPLOAD_PRESET = 'koperasi_unsigned_preset'; 

const singleImageFileSchema = z.instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, `Ukuran file maksimal 5MB.`)
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Format file tidak valid. Hanya .jpg, .jpeg, .png, .webp yang diperbolehkan."
  ).optional();

const singleImageOrPdfFileSchema = z.instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, `Ukuran file maksimal 5MB.`)
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type) || ACCEPTED_PDF_TYPES.includes(file.type),
    "Format file tidak valid. Hanya JPG, PNG, WEBP, atau PDF yang diperbolehkan."
  ).optional();

const fileListSchema = (isRequired: boolean, acceptedTypes: string[] = ACCEPTED_IMAGE_TYPES, customError?: string) =>
  z.any() 
    .refine((fileList) => {
        if (!isRequired && (!fileList || fileList.length === 0)) return true; 
        if (isRequired && (!fileList || fileList.length === 0)) return false; // Fail if required and no file
        return fileList[0]?.size <= MAX_FILE_SIZE;
    }, `Ukuran file maksimal 5MB.`)
    .refine((fileList) => {
        if (!isRequired && (!fileList || fileList.length === 0)) return true;
        if (isRequired && (!fileList || fileList.length === 0)) return false; // Fail if required and no file
        return acceptedTypes.includes(fileList[0]?.type);
    }, customError || `Format file tidak valid. Hanya ${acceptedTypes.map(t => t.split('/')[1]).join(', ')} yang diperbolehkan.`
    ).optional();


const registrationSchema = z.object({
  // Step 0: Akun
  username: z.string().min(3, "Username minimal 3 karakter.").regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh berisi huruf, angka, dan underscore."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  confirmPassword: z.string().min(6, "Konfirmasi password minimal 6 karakter."),

  // Step 1: Data Pribadi
  fullName: z.string().min(3, "Nama lengkap wajib diisi."),
  nik: z.string().length(16, "NIK harus 16 digit."),
  kk: z.string().length(16, "Nomor KK harus 16 digit.").optional().or(z.literal('')),
  birthPlace: z.string().min(1, "Tempat lahir wajib diisi."),
  birthDate: z.date({ required_error: "Tanggal lahir wajib diisi." }),
  gender: z.enum(['Laki-laki', 'Perempuan'], { required_error: "Jenis kelamin wajib dipilih." }),
  addressDusun: z.string().min(1, "Dusun wajib diisi."),
  addressRtRw: z.string().min(1, "RT/RW wajib diisi.").regex(/^\d{1,3}\/\d{1,3}$/, "Format RT/RW salah (contoh: 001/002)."),
  addressDesa: z.string().min(1, "Desa wajib diisi."),
  addressKecamatan: z.string().min(1, "Kecamatan wajib diisi."),
  phoneNumber: z.string().min(10, "Nomor telepon minimal 10 digit.").regex(/^08[0-9]{8,}$/, "Format nomor telepon tidak valid (contoh: 081234567890)."),
  currentJob: z.string().min(1, "Pekerjaan saat ini wajib diisi."),

  // Step 2: Status Kependudukan
  isPermanentResident: z.boolean().default(false),
  residentDesaName: z.string().optional(),

  ktpScan: fileListSchema(false), 
  ktpScanUrl: z.string({required_error: "Scan KTP wajib diupload."}).url("URL KTP tidak valid atau upload gagal.").min(1, "Scan KTP wajib diupload."),

  kkScan: fileListSchema(false),
  kkScanUrl: z.string().url().optional(),

  selfieKtp: fileListSchema(false), 
  selfieKtpUrl: z.string({required_error: "Selfie KTP wajib diupload."}).url("URL Selfie KTP tidak valid atau upload gagal.").min(1, "Selfie KTP wajib diupload."),

  // Step 3: Pilihan Keanggotaan
  membershipType: z.enum(['Anggota Konsumen', 'Anggota Produsen', 'Anggota Simpan Pinjam', 'Anggota Jasa Lainnya'], { required_error: "Jenis keanggotaan wajib dipilih." }),
  businessFields: z.array(z.enum(BusinessFieldsOptions)).min(1, "Pilih minimal satu bidang usaha."),
  otherBusinessField: z.string().optional(),

  // Step 4: Komitmen Keuangan
  agreedToCommitment: z.boolean().refine(val => val === true, { message: "Anda harus menyetujui komitmen keuangan." }),

  // Step 5: Lampiran Dokumen
  pasFoto: fileListSchema(false), 
  pasFotoUrl: z.string({required_error: "Pas Foto wajib diupload."}).url("URL Pas Foto tidak valid atau upload gagal.").min(1, "Pas Foto wajib diupload."),

  domicileProof: fileListSchema(false, [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_PDF_TYPES], "Format Bukti Domisili hanya JPG, PNG, WEBP, atau PDF."),
  domicileProofUrl: z.string().url().optional(),

  businessDocument: fileListSchema(false, [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_PDF_TYPES], "Format Dokumen Usaha hanya JPG, PNG, WEBP, atau PDF."),
  businessDocumentUrl: z.string().url().optional(),

  // Step 6: Pernyataan
  agreedToTerms: z.boolean().refine(val => val === true, { message: "Anda harus menyetujui pernyataan ini." }),
  agreedToBecomeMember: z.boolean().refine(val => val === true, { message: "Anda harus setuju untuk menjadi anggota." }),
})
.refine(data => data.password === data.confirmPassword, {
  message: "Password dan konfirmasi password tidak cocok.",
  path: ["confirmPassword"],
})
.refine(data => {
  if (data.membershipType === 'Anggota Produsen' && data.businessFields.includes('Kerajinan / UMKM')) {
    return !!data.businessDocumentUrl; 
  }
  return true;
}, {
  message: "Dokumen usaha wajib diupload jika mendaftar sebagai produsen/UMKM.",
  path: ["businessDocumentUrl"],
});


type RegistrationFormValues = z.infer<typeof registrationSchema>;
type FileInputFieldName = 'ktpScan' | 'kkScan' | 'selfieKtp' | 'pasFoto' | 'domicileProof' | 'businessDocument';


const steps = [
  { id: 'akun', title: 'Data Akun', fields: ['username', 'email', 'password', 'confirmPassword'] },
  { id: 'pribadi', title: 'Data Pribadi', fields: ['fullName', 'nik', 'kk', 'birthPlace', 'birthDate', 'gender', 'addressDusun', 'addressRtRw', 'addressDesa', 'addressKecamatan', 'phoneNumber', 'currentJob'] },
  { id: 'kependudukan', title: 'Status Kependudukan & Dokumen Identitas', fields: ['isPermanentResident', 'residentDesaName', 'ktpScan', 'ktpScanUrl', 'kkScan', 'kkScanUrl', 'selfieKtp', 'selfieKtpUrl'] },
  { id: 'keanggotaan', title: 'Pilihan Keanggotaan & Usaha', fields: ['membershipType', 'businessFields', 'otherBusinessField'] },
  { id: 'keuangan', title: 'Komitmen Keuangan', fields: ['agreedToCommitment'] },
  { id: 'dokumen', title: 'Lampiran Dokumen Tambahan', fields: ['pasFoto', 'pasFotoUrl', 'domicileProof', 'domicileProofUrl', 'businessDocument', 'businessDocumentUrl'] },
  { id: 'pernyataan', title: 'Pernyataan & Persetujuan', fields: ['agreedToTerms', 'agreedToBecomeMember'] },
];

export default function RegistrationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fileLoadingStates, setFileLoadingStates] = useState<Record<FileInputFieldName, boolean>>({
    ktpScan: false, kkScan: false, selfieKtp: false, pasFoto: false, domicileProof: false, businessDocument: false,
  });


  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange", 
    defaultValues: {
      username: '', email: '', password: '', confirmPassword: '',
      fullName: '', nik: '', kk: '', birthPlace: '', gender: undefined, birthDate: undefined,
      addressDusun: '', addressRtRw: '', addressDesa: '', addressKecamatan: '',
      phoneNumber: '', currentJob: '',
      isPermanentResident: false, residentDesaName: '', // Default residentDesaName to empty string
      ktpScan: undefined, ktpScanUrl: undefined,
      kkScan: undefined, kkScanUrl: undefined,
      selfieKtp: undefined, selfieKtpUrl: undefined,
      membershipType: undefined, businessFields: [], otherBusinessField: '', // Default otherBusinessField to empty string
      agreedToCommitment: false,
      pasFoto: undefined, pasFotoUrl: undefined,
      domicileProof: undefined, domicileProofUrl: undefined,
      businessDocument: undefined, businessDocumentUrl: undefined,
      agreedToTerms: false, agreedToBecomeMember: false,
    },
  });

  const handleIndividualFileUpload = async (
    file: File | undefined,
    fileInputFieldName: FileInputFieldName,
    isPdfAllowed: boolean = false
  ) => {
    const fileUrlFieldNameKey = `${fileInputFieldName}Url` as keyof RegistrationFormValues;

    if (!file) {
      form.setValue(fileUrlFieldNameKey, undefined);
      form.clearErrors(fileUrlFieldNameKey);
      form.trigger(fileUrlFieldNameKey); // Trigger validation to re-evaluate dependent fields or overall form state
      return;
    }

    const singleFileValidationSchema = isPdfAllowed ? singleImageOrPdfFileSchema : singleImageFileSchema;
    const validationResult = singleFileValidationSchema.safeParse(file);

    if (!validationResult.success) {
      form.setError(fileInputFieldName, {
        type: "manual",
        message: validationResult.error.errors[0].message,
      });
      form.setValue(fileUrlFieldNameKey, undefined);
      form.trigger(fileUrlFieldNameKey);
      return;
    }
    form.clearErrors(fileInputFieldName); 

    setFileLoadingStates(prev => ({ ...prev, [fileInputFieldName]: true }));
    form.setValue(fileUrlFieldNameKey, undefined); 

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Cloudinary upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const cloudinaryUrl = data.secure_url;

      if (cloudinaryUrl) {
        form.setValue(fileUrlFieldNameKey, cloudinaryUrl);
        form.clearErrors(fileUrlFieldNameKey); 
        toast({ title: "Upload Berhasil", description: `${file.name} telah diupload.` });
      } else {
        throw new Error('Upload berhasil, tetapi URL tidak diterima dari Cloudinary.');
      }
    } catch (err: any) {
      console.error(`Error uploading ${fileInputFieldName} to Cloudinary:`, err);
      let description = `Gagal mengupload ${file.name}.`;
       if (err.message) {
          description += ` Pesan: ${err.message}`;
      }
      toast({ title: "Upload Gagal", description, variant: "destructive" });
      form.setError(fileUrlFieldNameKey, { type: "manual", message: `Upload ${file.name} gagal.` });
      form.setValue(fileUrlFieldNameKey, undefined);
    } finally {
      setFileLoadingStates(prev => ({ ...prev, [fileInputFieldName]: false }));
      form.trigger(fileUrlFieldNameKey);
    }
  };


  async function onSubmit(data: RegistrationFormValues) {
    setIsLoading(true);
    
    try {
      const usernameQuery = await getDoc(doc(db, "usernames", data.username.toLowerCase()));
      if (usernameQuery.exists()) {
        form.setError("username", { message: "Username sudah digunakan." });
        toast({ title: "Pendaftaran Gagal", description: "Username sudah digunakan.", variant: "destructive" });
        setIsLoading(false);
        setCurrentStep(0);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      await updateProfile(user, { 
        displayName: data.fullName,
        photoURL: data.pasFotoUrl || null
      });
      
      const memberDataForFirestore: any = {
        userId: user.uid,
        username: data.username.toLowerCase(),
        email: data.email,
        fullName: data.fullName,
        nik: data.nik,
        birthPlace: data.birthPlace,
        birthDate: format(data.birthDate, "yyyy-MM-dd"),
        gender: data.gender,
        addressDusun: data.addressDusun,
        addressRtRw: data.addressRtRw,
        addressDesa: data.addressDesa,
        addressKecamatan: data.addressKecamatan,
        phoneNumber: data.phoneNumber,
        currentJob: data.currentJob,
        isPermanentResident: data.isPermanentResident,
        ktpScanUrl: data.ktpScanUrl, 
        selfieKtpUrl: data.selfieKtpUrl,
        membershipType: data.membershipType,
        businessFields: data.businessFields,
        agreedToCommitment: data.agreedToCommitment,
        pasFotoUrl: data.pasFotoUrl,
        agreedToTerms: data.agreedToTerms,
        agreedToBecomeMember: data.agreedToBecomeMember,
        registrationTimestamp: serverTimestamp(),
        status: 'pending',
        otpVerified: false,
      };

      if (data.kk) memberDataForFirestore.kk = data.kk;
      
      if (data.isPermanentResident) {
        memberDataForFirestore.residentDesaName = data.residentDesaName || ''; 
      }

      if (data.kkScanUrl) memberDataForFirestore.kkScanUrl = data.kkScanUrl;
      
      if (data.businessFields.includes('Lainnya')) {
        memberDataForFirestore.otherBusinessField = data.otherBusinessField || '';
      }

      if (data.domicileProofUrl) memberDataForFirestore.domicileProofUrl = data.domicileProofUrl;
      if (data.businessDocumentUrl) memberDataForFirestore.businessDocumentUrl = data.businessDocumentUrl;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: data.fullName,
        role: 'prospective_member',
        photoURL: data.pasFotoUrl || null,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'members', user.uid), memberDataForFirestore as MemberRegistrationData);
      await setDoc(doc(db, "usernames", data.username.toLowerCase()), { uid: user.uid });

      toast({
        title: 'Pendaftaran Berhasil!',
        description: 'Data Anda telah dikirim. Silakan tunggu verifikasi dari admin.',
      });
      router.push('/login?registrationSuccess=true');
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Terjadi kesalahan saat pendaftaran.';
      if ((error as FirebaseError).code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah terdaftar. Silakan gunakan email lain atau login.';
        form.setError("email", { message: errorMessage });
        setCurrentStep(0); 
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Pendaftaran Gagal',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields as Array<keyof RegistrationFormValues>;
    
    let anyUploadsInProgressForCurrentStep = false;
    for (const fieldKey of fieldsToValidate) {
        if (Object.keys(fileLoadingStates).includes(fieldKey) && fileLoadingStates[fieldKey as FileInputFieldName]) {
            anyUploadsInProgressForCurrentStep = true;
            toast({
                title: "Upload Sedang Berlangsung",
                description: `Mohon tunggu hingga upload untuk ${fieldKey} selesai.`,
                variant: "destructive",
            });
            break; 
        }
    }

    if (anyUploadsInProgressForCurrentStep) {
        return; 
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    } else {
       toast({
        title: "Form Tidak Lengkap atau Tidak Valid",
        description: "Mohon periksa kembali isian pada bagian ini. Pastikan semua field yang wajib telah diisi dan data valid.",
        variant: "destructive",
      });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const renderFileInput = (
    name: FileInputFieldName, 
    label: string,
    description: string,
    isPdfAllowed: boolean = false,
    dataAiHint?: string
  ) => {
    const isLoadingFile = fileLoadingStates[name];
    const currentRenderScopeUrlFieldName = `${name}Url` as keyof RegistrationFormValues;
    const uploadedUrl = form.watch(currentRenderScopeUrlFieldName);

    return (
      <FormField
        control={form.control}
        name={name} 
        render={({ field: { onChange: onFileListChange, value: fileListValue, ref: fieldRef } }) => {
          return (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept={isPdfAllowed ? "image/*,.pdf" : "image/*"}
                  onChange={(e) => {
                    onFileListChange(e.target.files); 
                    handleIndividualFileUpload(e.target.files?.[0], name, isPdfAllowed);
                  }}
                  disabled={isLoadingFile}
                  ref={fieldRef}
                  className="pt-2 border-dashed border-2 hover:border-primary"
                />
              </FormControl>
              <FormDescription>{description} Max 5MB.</FormDescription>
              {isLoadingFile && <div className="flex items-center text-sm text-muted-foreground mt-1"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengupload...</div>}
              
              {form.formState.errors[name] && (
                   <div className="flex items-center text-sm text-destructive mt-1"><AlertTriangle className="mr-2 h-4 w-4" /> {form.formState.errors[name]?.message}</div>
              )}

              {!isLoadingFile && uploadedUrl && !form.formState.errors[currentRenderScopeUrlFieldName] && (
                  <div className="flex items-center text-sm text-green-600 mt-1">
                      <CheckCircle className="mr-2 h-4 w-4" /> Upload berhasil. 
                      <Link href={uploadedUrl as string} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs underline hover:text-primary">Lihat file</Link>
                  </div>
              )}
              {!isLoadingFile && form.formState.errors[currentRenderScopeUrlFieldName] && (
                   <div className="flex items-center text-sm text-destructive mt-1"><AlertTriangle className="mr-2 h-4 w-4" /> {form.formState.errors[currentRenderScopeUrlFieldName]?.message}</div>
              )}
              
              {fileListValue?.[0] && fileListValue[0] instanceof File && !isLoadingFile && !uploadedUrl && ( 
                <div className="mt-2">
                  {fileListValue[0].type.startsWith("image/") ? (
                    <Image src={URL.createObjectURL(fileListValue[0])} alt={`Preview ${label}`} width={200} height={120} className="rounded object-contain border" data-ai-hint={dataAiHint || "document"} />
                  ) : fileListValue[0].type === "application/pdf" ? (
                    <p className="text-sm text-muted-foreground">Pratinjau PDF: {fileListValue[0].name}</p>
                  ) : null}
                </div>
              )}
            </FormItem>
          );
        }}
      />
    );
  };


  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Data Akun
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="username" render={({ field: { name, onBlur, onChange, ref, value } }) => (
              <FormItem>
                <FormLabel>Username (untuk login)</FormLabel>
                <FormControl><Input placeholder="cth: budi_123" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="email" render={({ field: { name, onBlur, onChange, ref, value } }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="nama@email.com" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field: { name, onBlur, onChange, ref, value } }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="******" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="confirmPassword" render={({ field: { name, onBlur, onChange, ref, value } }) => (
              <FormItem>
                <FormLabel>Konfirmasi Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showConfirmPassword ? "text" : "password"} placeholder="******" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}/>
          </div>
        );
      case 1: // Data Pribadi
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="fullName" render={({ field: { name, onBlur, onChange, ref, value } }) => (<FormItem><FormLabel>Nama Lengkap (Sesuai KTP)</FormLabel><FormControl><Input placeholder="Nama Lengkap Anda" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="nik" render={({ field: { name, onBlur, onChange, ref, value } }) => (
              <FormItem>
                <FormLabel>Nomor Induk Kependudukan (NIK)</FormLabel>
                <FormControl><Input type="number" placeholder="16 digit NIK" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="kk" render={({ field: { name, onBlur, onChange, ref, value } }) => (
              <FormItem>
                <FormLabel>Nomor Kartu Keluarga (Opsional)</FormLabel>
                <FormControl><Input type="number" placeholder="16 digit Nomor KK" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''}  /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="birthPlace" render={({ field: { name, onBlur, onChange, ref, value } }) => (
                <FormItem>
                  <FormLabel>Tempat Lahir</FormLabel>
                  <FormControl><Input placeholder="Kota Kelahiran" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Lahir</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus captionLayout="dropdown-buttons" fromYear={1900} toYear={new Date().getFullYear() - 17} />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem><FormLabel>Jenis Kelamin</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Jenis Kelamin" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent>
                </Select><FormMessage />
              </FormItem>
            )}/>
            <FormLabel className="text-base font-semibold">Alamat Lengkap (Sesuai KTP)</FormLabel>
            <FormField control={form.control} name="addressDusun" render={({ field: { name, onBlur, onChange, ref, value } }) => ( <FormItem><FormLabel className="text-sm">Dusun</FormLabel><FormControl><Input placeholder="Nama Dusun" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="addressRtRw" render={({ field: { name, onBlur, onChange, ref, value } }) => ( <FormItem><FormLabel className="text-sm">RT/RW</FormLabel><FormControl><Input placeholder="cth: 001/002" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="addressDesa" render={({ field: { name, onBlur, onChange, ref, value } }) => ( <FormItem><FormLabel className="text-sm">Desa/Kelurahan</FormLabel><FormControl><Input placeholder="Nama Desa/Kelurahan" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="addressKecamatan" render={({ field: { name, onBlur, onChange, ref, value } }) => ( <FormItem><FormLabel className="text-sm">Kecamatan</FormLabel><FormControl><Input placeholder="Nama Kecamatan" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="phoneNumber" render={({ field: { name, onBlur, onChange, ref, value } }) => (<FormItem><FormLabel>Nomor Telepon / WhatsApp</FormLabel><FormControl><Input type="tel" placeholder="08xxxxxxxxxx" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="currentJob" render={({ field: { name, onBlur, onChange, ref, value } }) => (<FormItem><FormLabel>Pekerjaan Saat Ini</FormLabel><FormControl><Input placeholder="Pekerjaan Anda" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
          </div>
        );
      case 2: // Status Kependudukan & Dokumen Identitas
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="isPermanentResident" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Saya adalah warga tetap Desa {form.watch('residentDesaName') || '___'}</FormLabel>
                  <FormDescription>Centang jika Anda warga tetap desa tempat koperasi berada.</FormDescription>
                </div>
              </FormItem>
            )}/>
            {form.watch('isPermanentResident') && (
               <FormField
                 control={form.control}
                 name="residentDesaName"
                 render={({ field: { name, onBlur, onChange, ref, value } }) => (
                   <FormItem>
                     <FormLabel>Nama Desa (Tempat Tinggal Tetap)</FormLabel>
                     <FormControl>
                       <Input
                         placeholder="Nama Desa Anda"
                         name={name}
                         onBlur={onBlur}
                         onChange={onChange}
                         ref={ref}
                         value={value ?? ''}
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            )}
            {renderFileInput('ktpScan', 'Upload Scan/Foto KTP (Jelas)', 'Format: JPG, PNG, WEBP.', false, 'identity card')}
            {renderFileInput('kkScan', 'Upload Scan/Foto KK (Opsional)', 'Format: JPG, PNG, WEBP.', false, 'family card')}
            {renderFileInput('selfieKtp', 'Upload Foto Selfie dengan KTP', 'Pastikan wajah dan KTP terlihat jelas.', false, 'selfie id')}
          </div>
        );
       case 3: // Pilihan Keanggotaan
        const membershipTypes: MembershipType[] = ['Anggota Konsumen', 'Anggota Produsen', 'Anggota Simpan Pinjam', 'Anggota Jasa Lainnya'];
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="membershipType" render={({ field }) => (
              <FormItem><FormLabel>Jenis Keanggotaan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Jenis Keanggotaan" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {membershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )}/>
             <Controller
              control={form.control}
              name="businessFields"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilihan Bidang Usaha yang Ingin Diikuti (Bisa lebih dari satu)</FormLabel>
                  {BusinessFieldsOptions.map((item) => (
                    <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0 my-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            return checked
                              ? field.onChange([...currentValues, item])
                              : field.onChange(currentValues.filter((value) => value !== item));
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{item}</FormLabel>
                    </FormItem>
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('businessFields')?.includes('Lainnya') && (
                <FormField control={form.control} name="otherBusinessField" render={({ field: { name, onBlur, onChange, ref, value } }) => (<FormItem><FormLabel>Bidang Usaha Lainnya (Isian Bebas)</FormLabel><FormControl><Textarea placeholder="Sebutkan bidang usaha lainnya" name={name} onBlur={onBlur} onChange={onChange} ref={ref} value={value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            )}
          </div>
        );
      case 4: // Komitmen Keuangan
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Komitmen Keuangan</h3>
            <p className="text-sm text-muted-foreground">Simpanan Pokok: Rp50.000 (dibayar sekali saat pendaftaran diterima)</p>
            <p className="text-sm text-muted-foreground">Simpanan Wajib: Rp10.000/bulan (dibayar rutin setiap bulan)</p>
            <FormField control={form.control} name="agreedToCommitment" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Saya bersedia menyetorkan simpanan pokok dan wajib sesuai ketentuan.</FormLabel>
                </div>
              </FormItem>
            )}/>
            <FormMessage>{form.formState.errors.agreedToCommitment?.message}</FormMessage>
          </div>
        );
      case 5: // Lampiran Dokumen Tambahan
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Scan/Foto KTP dan Selfie KTP sudah diupload pada langkah sebelumnya.</p>
            {renderFileInput('pasFoto', 'Upload Pas Foto (Ukuran 3x4)', 'Format: JPG, PNG, WEBP.', false, 'portrait photo')}
            {renderFileInput('domicileProof', 'Upload Bukti Domisili (Opsional)', 'Bisa surat RT/RW jika alamat KTP berbeda. Format: JPG, PNG, WEBP, PDF.', true, 'address proof')}
            {renderFileInput('businessDocument', 'Upload Dokumen Usaha (Jika Produsen/UMKM)', 'Surat Izin Usaha, dll. Format: JPG, PNG, WEBP, PDF.', true, 'business document')}
          </div>
        );
      case 6: // Pernyataan
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="agreedToTerms" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Saya menyatakan bahwa data yang saya isi adalah benar. Saya bersedia mematuhi Anggaran Dasar dan Rumah Tangga (AD/ART) Koperasi Merah Putih Sejahtera dan aktif dalam kegiatan koperasi.</FormLabel>
                  <FormDescription><Link href="/info#ad-art" target="_blank" className="text-primary hover:underline">Baca AD/ART Koperasi</Link></FormDescription>
                </div>
              </FormItem>
            )}/>
            <FormMessage>{form.formState.errors.agreedToTerms?.message}</FormMessage>
            <FormField control={form.control} name="agreedToBecomeMember" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Saya setuju dan bersedia menjadi anggota Koperasi Merah Putih Sejahtera.</FormLabel>
                </div>
              </FormItem>
            )}/>
            <FormMessage>{form.formState.errors.agreedToBecomeMember?.message}</FormMessage>
            <p className="text-xs text-muted-foreground mt-4">Tanggal & waktu pendaftaran akan dicatat otomatis oleh sistem.</p>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base">
            {steps.map((step, index) => (
              <li key={step.id} className={cn(
                "flex md:w-full items-center",
                index <= currentStep ? "text-primary dark:text-blue-500" : "",
                index < steps.length -1 ? "sm:after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-gray-700" : ""
              )}>
                <span className={cn(
                  "flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200 dark:after:text-gray-500",
                  index <= currentStep ? "border-primary" : "border-gray-300"
                )}>
                  {index < currentStep ? (
                     <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                    </svg>
                  ) : (
                    <span className={cn("mr-2", index === currentStep ? "text-primary font-bold" : "")}>{index + 1}</span>
                  )}
                  {step.title}
                </span>
              </li>
            ))}
          </ol>
        </div>


        {renderStepContent()}

        <div className="flex justify-between pt-6">
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={handlePrev} disabled={isLoading || Object.values(fileLoadingStates).some(loading => loading)}>
              Kembali
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="button" onClick={handleNext} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || Object.values(fileLoadingStates).some(loading => loading)}>
              Selanjutnya
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button type="submit" className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || Object.values(fileLoadingStates).some(loading => loading)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Pendaftaran
            </Button>
          )}
        </div>
      </form>
      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </Form>
  );
}


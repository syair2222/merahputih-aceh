
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
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { MemberRegistrationData, MembershipType, BusinessField } from '@/types';
import { BusinessFieldsOptions } from '@/types';
import { CalendarIcon, Eye, EyeOff, Loader2, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];


const fileSchema = z.any()
  .refine((file) => file && file.length > 0, "File dibutuhkan.")
  .refine((file) => file && file[0]?.size <= MAX_FILE_SIZE, `Ukuran file maksimal 5MB.`)
  .refine(
    (file) => file && ACCEPTED_IMAGE_TYPES.includes(file[0]?.type),
    "Format file tidak valid. Hanya .jpg, .jpeg, .png, .webp yang diperbolehkan."
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
  ktpScan: fileSchema.refine(val => val && val.length > 0, { message: "Scan KTP wajib diupload."}),
  kkScan: fileSchema,
  selfieKtp: fileSchema.refine(val => val && val.length > 0, { message: "Foto selfie dengan KTP wajib diupload."}),

  // Step 3: Pilihan Keanggotaan
  membershipType: z.enum(['Anggota Konsumen', 'Anggota Produsen', 'Anggota Simpan Pinjam', 'Anggota Jasa Lainnya'], { required_error: "Jenis keanggotaan wajib dipilih." }),
  businessFields: z.array(z.enum(BusinessFieldsOptions)).min(1, "Pilih minimal satu bidang usaha."),
  otherBusinessField: z.string().optional(),

  // Step 4: Komitmen Keuangan
  agreedToCommitment: z.boolean().refine(val => val === true, { message: "Anda harus menyetujui komitmen keuangan." }),

  // Step 5: Lampiran Dokumen
  // ktpScan is already in step 2
  pasFoto: fileSchema.refine(val => val && val.length > 0, { message: "Pas foto wajib diupload."}),
  domicileProof: fileSchema,
  businessDocument: fileSchema,

  // Step 6: Pernyataan
  agreedToTerms: z.boolean().refine(val => val === true, { message: "Anda harus menyetujui pernyataan ini." }),
  agreedToBecomeMember: z.boolean().refine(val => val === true, { message: "Anda harus setuju untuk menjadi anggota." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Password dan konfirmasi password tidak cocok.",
  path: ["confirmPassword"],
}).refine(data => {
  if (data.membershipType === 'Anggota Produsen' && data.businessFields.includes('Kerajinan / UMKM')) {
    return data.businessDocument && data.businessDocument.length > 0;
  }
  return true;
}, {
  message: "Dokumen usaha wajib diupload jika mendaftar sebagai produsen/UMKM.",
  path: ["businessDocument"],
});


type RegistrationFormValues = z.infer<typeof registrationSchema>;

const steps = [
  { id: 'akun', title: 'Data Akun', fields: ['username', 'email', 'password', 'confirmPassword'] },
  { id: 'pribadi', title: 'Data Pribadi', fields: ['fullName', 'nik', 'kk', 'birthPlace', 'birthDate', 'gender', 'addressDusun', 'addressRtRw', 'addressDesa', 'addressKecamatan', 'phoneNumber', 'currentJob'] },
  { id: 'kependudukan', title: 'Status Kependudukan', fields: ['isPermanentResident', 'residentDesaName', 'ktpScan', 'kkScan', 'selfieKtp'] },
  { id: 'keanggotaan', title: 'Pilihan Keanggotaan & Usaha', fields: ['membershipType', 'businessFields', 'otherBusinessField'] },
  { id: 'keuangan', title: 'Komitmen Keuangan', fields: ['agreedToCommitment'] },
  { id: 'dokumen', title: 'Lampiran Dokumen', fields: ['pasFoto', 'domicileProof', 'businessDocument'] },
  { id: 'pernyataan', title: 'Pernyataan & Persetujuan', fields: ['agreedToTerms', 'agreedToBecomeMember'] },
];

export default function RegistrationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange", // Validate on change for better UX
    defaultValues: {
      username: '', email: '', password: '', confirmPassword: '',
      fullName: '', nik: '', kk: '', birthPlace: '', gender: undefined, birthDate: undefined,
      addressDusun: '', addressRtRw: '', addressDesa: '', addressKecamatan: '',
      phoneNumber: '', currentJob: '',
      isPermanentResident: false, residentDesaName: '',
      ktpScan: undefined, kkScan: undefined, selfieKtp: undefined,
      membershipType: undefined, businessFields: [], otherBusinessField: '',
      agreedToCommitment: false,
      pasFoto: undefined, domicileProof: undefined, businessDocument: undefined,
      agreedToTerms: false, agreedToBecomeMember: false,
    },
  });

  const uploadFile = async (file: File, path: string): Promise<string | undefined> => {
    if (!file) return undefined;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
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
      await updateProfile(user, { displayName: data.fullName });

      const ktpScanUrl = data.ktpScan?.[0] ? await uploadFile(data.ktpScan[0], `members/${user.uid}/ktpScan.${data.ktpScan[0].name.split('.').pop()}`) : undefined;
      const kkScanUrl = data.kkScan?.[0] ? await uploadFile(data.kkScan[0], `members/${user.uid}/kkScan.${data.kkScan[0].name.split('.').pop()}`) : undefined;
      const selfieKtpUrl = data.selfieKtp?.[0] ? await uploadFile(data.selfieKtp[0], `members/${user.uid}/selfieKtp.${data.selfieKtp[0].name.split('.').pop()}`) : undefined;
      const pasFotoUrl = data.pasFoto?.[0] ? await uploadFile(data.pasFoto[0], `members/${user.uid}/pasFoto.${data.pasFoto[0].name.split('.').pop()}`) : undefined;
      const domicileProofUrl = data.domicileProof?.[0] ? await uploadFile(data.domicileProof[0], `members/${user.uid}/domicileProof.${data.domicileProof[0].name.split('.').pop()}`) : undefined;
      const businessDocumentUrl = data.businessDocument?.[0] ? await uploadFile(data.businessDocument[0], `members/${user.uid}/businessDocument.${data.businessDocument[0].name.split('.').pop()}`) : undefined;

      const memberData: MemberRegistrationData = {
        userId: user.uid,
        username: data.username.toLowerCase(), 
        email: data.email,
        fullName: data.fullName,
        nik: data.nik,
        kk: data.kk,
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
        residentDesaName: data.isPermanentResident ? data.residentDesaName : undefined,
        ktpScanUrl,
        kkScanUrl,
        selfieKtpUrl,
        membershipType: data.membershipType,
        businessFields: data.businessFields,
        otherBusinessField: data.businessFields.includes('Lainnya') ? data.otherBusinessField : undefined,
        agreedToCommitment: data.agreedToCommitment,
        pasFotoUrl,
        domicileProofUrl,
        businessDocumentUrl,
        agreedToTerms: data.agreedToTerms,
        agreedToBecomeMember: data.agreedToBecomeMember,
        registrationTimestamp: serverTimestamp() as unknown as string, 
        status: 'pending',
        otpVerified: false, 
      };
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: data.fullName,
        role: 'prospective_member', 
        photoURL: pasFotoUrl || null,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'members', user.uid), memberData);
      
      await setDoc(doc(db, "usernames", data.username.toLowerCase()), { uid: user.uid });

      toast({
        title: 'Pendaftaran Berhasil!',
        description: 'Data Anda telah dikirim. Silakan tunggu verifikasi dari admin.',
      });
      router.push('/login?registrationSuccess=true'); 
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Terjadi kesalahan saat pendaftaran.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah terdaftar. Silakan gunakan email lain atau login.';
        form.setError("email", { message: errorMessage });
        setCurrentStep(0);
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
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    } else {
       toast({
        title: "Form Tidak Lengkap",
        description: "Mohon periksa kembali isian pada bagian ini.",
        variant: "destructive",
      });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Data Akun
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Username (untuk login)</FormLabel>
                <FormControl><Input placeholder="cth: budi_123" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="nama@email.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="******" {...field} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Konfirmasi Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showConfirmPassword ? "text" : "password"} placeholder="******" {...field} />
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
            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Nama Lengkap (Sesuai KTP)</FormLabel><FormControl><Input placeholder="Nama Lengkap Anda" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="nik" render={({ field }) => (<FormItem><FormLabel>Nomor Induk Kependudukan (NIK)</FormLabel><FormControl><Input type="number" placeholder="16 digit NIK" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="kk" render={({ field }) => (<FormItem><FormLabel>Nomor Kartu Keluarga (Opsional)</FormLabel><FormControl><Input type="number" placeholder="16 digit Nomor KK" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="birthPlace" render={({ field }) => (<FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota Kelahiran" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Lahir</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear() - 17} 
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem><FormLabel>Jenis Kelamin</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Jenis Kelamin" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent>
                </Select><FormMessage />
              </FormItem>
            )}/>
            <FormLabel className="text-base font-semibold">Alamat Lengkap (Sesuai KTP)</FormLabel>
            <FormField control={form.control} name="addressDusun" render={({ field }) => (<FormItem><FormLabel className="text-sm">Dusun</FormLabel><FormControl><Input placeholder="Nama Dusun" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="addressRtRw" render={({ field }) => (<FormItem><FormLabel className="text-sm">RT/RW</FormLabel><FormControl><Input placeholder="cth: 001/002" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="addressDesa" render={({ field }) => (<FormItem><FormLabel className="text-sm">Desa/Kelurahan</FormLabel><FormControl><Input placeholder="Nama Desa/Kelurahan" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="addressKecamatan" render={({ field }) => (<FormItem><FormLabel className="text-sm">Kecamatan</FormLabel><FormControl><Input placeholder="Nama Kecamatan" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Nomor Telepon / WhatsApp</FormLabel><FormControl><Input type="tel" placeholder="08xxxxxxxxxx" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="currentJob" render={({ field }) => (<FormItem><FormLabel>Pekerjaan Saat Ini</FormLabel><FormControl><Input placeholder="Pekerjaan Anda" {...field} /></FormControl><FormMessage /></FormItem>)}/>
          </div>
        );
      case 2: // Status Kependudukan
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
               <FormField control={form.control} name="residentDesaName" render={({ field }) => (<FormItem><FormLabel>Nama Desa (Tempat Tinggal Tetap)</FormLabel><FormControl><Input placeholder="Nama Desa Anda" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            )}
            <FormField control={form.control} name="ktpScan" render={({ field: { onChange, value, ...rest }}) => (
                <FormItem><FormLabel>Upload Scan/Foto KTP (Jelas)</FormLabel>
                <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...rest} className="pt-2 border-dashed border-2 hover:border-primary"/></FormControl>
                <FormDescription>Format: JPG, PNG, WEBP. Max 5MB.</FormDescription><FormMessage />
                {value?.[0] && <Image src={URL.createObjectURL(value[0])} alt="Preview KTP" width={200} height={120} className="mt-2 rounded object-contain" data-ai-hint="identity card" />}</FormItem>
            )}/>
            <FormField control={form.control} name="kkScan" render={({ field: { onChange, value, ...rest }}) => (
                <FormItem><FormLabel>Upload Scan/Foto KK (Opsional)</FormLabel>
                <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...rest} className="pt-2 border-dashed border-2 hover:border-primary"/></FormControl>
                <FormDescription>Format: JPG, PNG, WEBP. Max 5MB.</FormDescription><FormMessage />
                {value?.[0] && <Image src={URL.createObjectURL(value[0])} alt="Preview KK" width={200} height={280} className="mt-2 rounded object-contain" data-ai-hint="family card" />}</FormItem>
            )}/>
             <FormField control={form.control} name="selfieKtp" render={({ field: { onChange, value, ...rest }}) => (
                <FormItem><FormLabel>Upload Foto Selfie dengan KTP</FormLabel>
                <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...rest} className="pt-2 border-dashed border-2 hover:border-primary"/></FormControl>
                <FormDescription>Pastikan wajah dan KTP terlihat jelas. Max 5MB.</FormDescription><FormMessage />
                {value?.[0] && <Image src={URL.createObjectURL(value[0])} alt="Preview Selfie KTP" width={200} height={200} className="mt-2 rounded object-contain" data-ai-hint="selfie id" />}</FormItem>
            )}/>
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
            <FormField 
              control={form.control} 
              name="businessFields" 
              render={({ field }) => ( // This 'field' is for 'businessFields' (the array)
              <FormItem>
                <FormLabel>Pilihan Bidang Usaha yang Ingin Diikuti (Bisa lebih dari satu)</FormLabel>
                {BusinessFieldsOptions.map((item) => (
                  <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0 my-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(item)}
                        onCheckedChange={(checked) => {
                          const currentValues = field.value || [];
                          if (checked) {
                            field.onChange([...currentValues, item]);
                          } else {
                            field.onChange(currentValues.filter((value) => value !== item));
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">{item}</FormLabel>
                  </FormItem>
                ))}
                <FormMessage />
              </FormItem>
            )}/>
            {form.watch('businessFields')?.includes('Lainnya') && (
                <FormField control={form.control} name="otherBusinessField" render={({ field }) => (<FormItem><FormLabel>Bidang Usaha Lainnya (Isian Bebas)</FormLabel><FormControl><Textarea placeholder="Sebutkan bidang usaha lainnya" {...field} /></FormControl><FormMessage /></FormItem>)}/>
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
      case 5: // Lampiran Dokumen
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Scan/Foto KTP sudah diupload pada bagian Status Kependudukan.</p>
             <FormField control={form.control} name="pasFoto" render={({ field: { onChange, value, ...rest }}) => (
                <FormItem><FormLabel>Upload Pas Foto (Ukuran 3x4)</FormLabel>
                <FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...rest} className="pt-2 border-dashed border-2 hover:border-primary"/></FormControl>
                <FormDescription>Format: JPG, PNG, WEBP. Max 5MB.</FormDescription><FormMessage />
                {value?.[0] && <Image src={URL.createObjectURL(value[0])} alt="Preview Pas Foto" width={150} height={200} className="mt-2 rounded object-contain" data-ai-hint="portrait photo" />}</FormItem>
            )}/>
            <FormField control={form.control} name="domicileProof" render={({ field: { onChange, value, ...rest }}) => (
                <FormItem><FormLabel>Upload Bukti Domisili (Opsional)</FormLabel>
                <FormControl><Input type="file" accept="image/*,.pdf" onChange={e => onChange(e.target.files)} {...rest} className="pt-2 border-dashed border-2 hover:border-primary"/></FormControl>
                <FormDescription>Bisa surat RT/RW jika alamat KTP berbeda. Max 5MB.</FormDescription><FormMessage />
                {value?.[0] && value[0].type.startsWith("image/") && <Image src={URL.createObjectURL(value[0])} alt="Preview Bukti Domisili" width={200} height={280} className="mt-2 rounded object-contain" data-ai-hint="address proof" />}
                {value?.[0] && value[0].type === "application/pdf" && <p className="text-sm mt-1 text-green-600">File PDF: {value[0].name} dipilih.</p>}
                </FormItem>
            )}/>
             <FormField control={form.control} name="businessDocument" render={({ field: { onChange, value, ...rest }}) => (
                <FormItem><FormLabel>Upload Dokumen Usaha (Jika Produsen/UMKM)</FormLabel>
                <FormControl><Input type="file" accept="image/*,.pdf" onChange={e => onChange(e.target.files)} {...rest} className="pt-2 border-dashed border-2 hover:border-primary"/></FormControl>
                <FormDescription>Surat Izin Usaha, dll. Max 5MB.</FormDescription><FormMessage />
                {value?.[0] && value[0].type.startsWith("image/") && <Image src={URL.createObjectURL(value[0])} alt="Preview Dokumen Usaha" width={200} height={280} className="mt-2 rounded object-contain" data-ai-hint="business document" />}
                {value?.[0] && value[0].type === "application/pdf" && <p className="text-sm mt-1 text-green-600">File PDF: {value[0].name} dipilih.</p>}
                </FormItem>
            )}/>
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
            <Button type="button" variant="outline" onClick={handlePrev} disabled={isLoading}>
              Kembali
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="button" onClick={handleNext} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              Selanjutnya
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button type="submit" className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
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


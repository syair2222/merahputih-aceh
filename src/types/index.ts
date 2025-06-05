
export interface PersonalData {
  fullName: string;
  nik: string;
  kk?: string;
  birthPlace: string;
  birthDate: string; // ISO string
  gender: 'Laki-laki' | 'Perempuan';
  addressDusun: string;
  addressRtRw: string;
  addressDesa: string;
  addressKecamatan: string;
  phoneNumber: string;
  email?: string;
  currentJob: string;
}

export interface ResidentialStatus {
  isPermanentResident: boolean;
  residentDesaName?: string; // Name of the Desa if isPermanentResident is true
  ktpScanUrl?: string;
  kkScanUrl?: string;
  selfieKtpUrl?: string;
}

export type MembershipType = 'Anggota Konsumen' | 'Anggota Produsen' | 'Anggota Simpan Pinjam' | 'Anggota Jasa Lainnya';

export const BusinessFieldsOptions = [
  'Sembako & Kebutuhan Harian',
  'Hasil Tani / Perkebunan',
  'Peternakan',
  'Simpan Pinjam',
  'Kerajinan / UMKM',
  'Teknologi Informasi / Jasa Digital',
  'Transportasi / Jasa Logistik',
  'Pendidikan & Pelatihan',
] as const;
export type BusinessField = typeof BusinessFieldsOptions[number];


export interface MembershipChoice {
  membershipType: MembershipType;
  businessFields: BusinessField[];
  otherBusinessField?: string;
}

export interface FinancialCommitment {
  agreedToCommitment: boolean;
  // Simpanan Pokok: Rp50.000 (hanya sekali)
  // Simpanan Wajib: Rp10.000/bulan
}

export interface DocumentAttachments {
  // ktpScanUrl is in ResidentialStatus
  pasFotoUrl?: string; // 3x4
  domicileProofUrl?: string; // Optional
  businessDocumentUrl?: string; // if producer/UMKM
}

export interface Agreement {
  agreedToTerms: boolean;
  agreedToBecomeMember: boolean;
}

export interface MemberRegistrationData extends PersonalData, ResidentialStatus, MembershipChoice, FinancialCommitment, DocumentAttachments, Agreement {
  userId?: string; // Link to Firebase Auth UID
  username: string; // For login
  registrationTimestamp?: string; // ISO string, server-generated
  ipAddress?: string; // Optional, server-generated
  status: 'pending' | 'approved' | 'rejected' | 'verified'; // 'verified' could be post-OTP
  adminComments?: string;
  otpVerified?: boolean; // For OTP verification status
}


export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  source: string; // Admin name or "Dinas Koperasi"
  authorId: string;
  comments?: AnnouncementComment[];
}

export interface AnnouncementComment {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  timestamp: string; // ISO string
  aiAssistedResponse?: string;
  adminResponse?: string; 
}

// UserProfile is in auth-context.ts, can be moved here if needed widely

export interface FacilityApplication {
  id: string;
  memberId: string;
  memberName: string;
  applicationDate: string; // ISO string
  facilityType: string; // e.g., 'Pinjaman Modal Usaha', 'Penyaluran Hasil Tani'
  amountOrDetails: string; // Amount for loan, or details for other facilities
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComments?: string;
  approvalDate?: string; // ISO string
}

export interface FacilityReport {
  id: string;
  applicationId: string;
  memberId: string;
  reportDate: string; // ISO string
  progressDescription: string;
  photoUrls?: string[]; // URLs of uploaded photos
}

// For user credentials in Firestore (separate from Firebase Auth user object)
export interface UserDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin_utama' | 'sekertaris' | 'bendahara' | 'dinas' | 'member' | 'prospective_member';
  photoURL?: string | null;
  // other app-specific user data
}

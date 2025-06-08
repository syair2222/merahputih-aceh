

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
  'Lainnya', // Added 'Lainnya' to BusinessFieldsOptions
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

export interface ReferralInformation {
  referralSource?: 'member' | 'other_source' | 'no_referral';
  referrerMemberId?: string;
  referrerName?: string;
  referralNotes?: string;
}

export interface MemberRegistrationData extends PersonalData, ResidentialStatus, MembershipChoice, FinancialCommitment, DocumentAttachments, Agreement, ReferralInformation {
  userId?: string; // Link to Firebase Auth UID
  username: string; // For login
  registrationTimestamp?: any; // Firestore Timestamp or string (ISO)
  ipAddress?: string; // Optional, server-generated
  status: 'pending' | 'approved' | 'rejected' | 'verified' | 'requires_correction'; // 'verified' could be post-OTP, 'requires_correction' added
  adminComments?: string;
  otpVerified?: boolean; // For OTP verification status
  memberIdNumber?: string; // Cooperative member ID, generated after approval
  lastAdminActionBy?: string; // UID of admin performing the action
  lastAdminActionByName?: string; // DisplayName of admin performing the action
  lastAdminActionTimestamp?: any; // Firestore Timestamp for last admin action
  adminRating?: number; // Rating 1-5 by admin
  recommendationsGivenCount?: number;

  // New fields for bank details
  bankName?: string; // Nama Bank
  bankAccountName?: string; // Nama Pemilik Rekening
  bankAccountNumber?: string; // Nomor Rekening Bank
}


export interface Announcement {
  id: string; // Firestore document ID
  title: string;
  content: string;
  authorId: string; // Firebase Auth UID of admin
  authorName: string; // displayName or email of admin
  createdAt: any; // Firestore Timestamp
  status: 'published' | 'draft';
  // 'date' and 'source' from original design can be derived:
  // date for display from createdAt
  // source from authorName
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

export interface UserProfile { // Already exists in auth-context.ts, but defining here for clarity if needed elsewhere
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: 'admin_utama' | 'sekertaris' | 'bendahara' | 'dinas' | 'member' | 'prospective_member' | 'bank_partner_admin' | 'related_agency_admin';
  status?: 'pending' | 'approved' | 'rejected' | 'verified' | 'requires_correction';
  memberIdNumber?: string;
}


export const FacilityTypeOptions = [
  'Pinjaman Usaha',
  'Pembelian Barang',
  'Pelatihan',
  'Sewa Alat',
  'Bahan Produksi',
  'Lainnya'
] as const;
export type FacilityType = typeof FacilityTypeOptions[number];

export const MemberBusinessAreaOptions = [
  'Pertanian',
  'Perdagangan',
  'Peternakan',
  'Perikanan',
  'UMKM (Usaha Mikro Kecil Menengah)',
  'Jasa',
  'Lainnya'
] as const;
export type MemberBusinessArea = typeof MemberBusinessAreaOptions[number];

export interface RequestedRecommendation {
  memberId: string;
  memberName: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string; // Recommender's comment
  decisionDate?: any; // Firestore Timestamp
}

export const TargetEntityTypeOptions = [
  'KOPERASI_INTERNAL',
  'BANK_MITRA',
  'DINAS_TERKAIT',
  'UMUM_BELUM_DITENTUKAN',
] as const;
export type TargetEntityType = typeof TargetEntityTypeOptions[number];


export interface FacilityApplicationData {
  id?: string; // Firestore document ID
  userId: string; // Firebase Auth UID of the member
  memberFullName: string;
  memberIdNumber: string; // Cooperative member ID, should exist if applying
  memberAddress: string;

  facilityType: FacilityType;
  specificProductName?: string;
  quantityOrAmount: string;
  purpose: string;
  memberBusinessArea: MemberBusinessArea;
  otherMemberBusinessArea?: string; // If memberBusinessArea is 'Lainnya'
  estimatedUsageOrRepaymentTime?: string;

  hasAppliedBefore: 'Ya' | 'Tidak';
  previousApplicationDetails?: string;

  supportingDocuments?: Array<{ name: string; url: string; type: string; size: number }>;
  proposalFile?: FileList;
  productPhotoFile?: FileList;
  statementLetterFile?: FileList;
  otherSupportFile?: FileList;

  additionalNotes?: string;

  targetEntityType?: TargetEntityType; // New field
  targetEntityName?: string; // New field: e.g., "Bank XYZ" or "Dinas Pertanian"

  applicationDate: any; // Firestore Timestamp
  status: 'pending_review' | 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'cancelled_by_member' | 'requires_correction';
  adminComments?: string; // Comments from cooperative admin
  decisionMaker?: string; // Cooperative admin who made the decision
  decisionDate?: any; // Date of cooperative admin decision
  lastUpdated?: any;

  requestedRecommendations?: RequestedRecommendation[];
  recommendationCount?: number;

  bankDecisionStatus?: 'pending' | 'approved' | 'rejected'; // Decision from bank
  bankComments?: string; // Comments from bank
  bankDecisionMaker?: string; // Name or UID of bank personnel
  bankDecisionTimestamp?: any; // Firestore Timestamp for bank decision
}

export const statusDisplay: Record<FacilityApplicationData['status'], string> = {
  pending_review: 'Menunggu Review',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled_by_member: 'Dibatalkan Anggota',
  requires_correction: 'Perlu Perbaikan'
};


export interface FacilityReport {
  id: string;
  applicationId: string;
  memberId: string;
  reportDate: string; // ISO string
  progressDescription: string;
  photoUrls?: string[]; // URLs of uploaded photos
}

export interface UserDocument { // This is often what's stored in a 'users' collection in Firestore
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserProfile['role'];
  status?: UserProfile['status']; // User's account status, not necessarily membership status
  photoURL?: string | null;
  memberIdNumber?: string; // If the user is a member and has an ID
  createdAt?: any; // Firestore Timestamp
  lastLogin?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp for user document updates
  updatedBy?: string; // UID of admin who last updated the user document
}

// --- Financial System Types ---

export type AccountType = 'ASET' | 'LIABILITAS' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
export type NormalBalance = 'DEBIT' | 'KREDIT';

export interface ChartOfAccountItem {
  id?: string; // Firestore document ID
  accountId: string; // Unique account code, e.g., "1010" for Kas, "4000" for Pendapatan Jasa
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  balance?: number; // Current balance, should be updated by transactions
  parentId?: string | null; // For hierarchical CoA, refers to another accountId
  isActive?: boolean;
  description?: string; // Optional description
}

export interface Transaction {
  id?: string; // Firestore document ID
  transactionDate: any; // Firestore Timestamp
  description: string;
  referenceNumber?: string;
  status?: 'DRAFT' | 'POSTED' | 'VOID'; // Status of the transaction
  createdAt?: any; // Firestore Timestamp
  createdBy?: string; // UID of the user who created the transaction
  postedAt?: any; // Firestore Timestamp, if status is POSTED
  postedBy?: string; // UID of the user who posted
  totalDebit?: number;
  totalCredit?: number;
}

export interface TransactionDetail {
  id?: string; // Firestore document ID (can be a sub-collection item)
  transactionId: string; // Foreign key to Transaction.id
  accountId: string; // Foreign key to ChartOfAccountItem.accountId
  debitAmount?: number;
  creditAmount?: number;
  notes?: string; // Optional notes for this specific entry
}

export interface FinancialPeriod {
  id?: string; // e.g., "2024-01" for January 2024
  name: string; // e.g., "Januari 2024"
  startDate: any; // Firestore Timestamp
  endDate: any; // Firestore Timestamp
  status: 'OPEN' | 'CLOSED';
}


// --- Input Type for Anomaly Detection Flow ---
export interface TransactionInput {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  accountId?: string;
  accountName?: string;
  type?: 'debit' | 'credit';
  category?: string;
  userId?: string;
}
// --- End Financial System Types ---




import RegistrationForm from '@/components/auth/registration-form';

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-2xl font-headline font-semibold text-center mb-6 text-foreground">
        Formulir Pendaftaran Calon Anggota Koperasi
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Silakan isi data berikut dengan benar dan lengkap.
      </p>
      <RegistrationForm />
    </div>
  );
}

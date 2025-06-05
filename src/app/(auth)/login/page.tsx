
import LoginForm from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-2xl font-headline font-semibold text-center mb-6 text-foreground">
        Masuk ke Akun Anda
      </h2>
      <LoginForm />
    </div>
  );
}

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-console-black flex flex-col justify-center items-center p-4">
      {/* Background radial gradient to give it a "spotlight" feel without changing hues */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-shadow-black via-console-black to-console-black -z-10" />

      <div className="w-full max-w-md bg-paper-white p-8 sm:p-12 rounded-[24px] shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] flex flex-col items-center">
        {/* Placeholder for Logo */}
        <div className="mb-8 font-light text-2xl tracking-tight text-display-ink text-center">
          Material Operations
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

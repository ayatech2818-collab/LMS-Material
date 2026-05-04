import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#000] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* M-stripe at top of card */}
        <div className="m-stripe" />

        <div className="bg-[#1a1a1a] border border-[#3c3c3c] border-t-0 p-8 sm:p-12 flex flex-col items-center">
          <div className="mb-8 text-center">
            <p className="text-[#7e7e7e] text-xs tracking-[3px] uppercase mb-2">Ayatech AI</p>
            <h1 className="text-2xl font-bold text-white tracking-[3px] uppercase">
              Material Operations
            </h1>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}

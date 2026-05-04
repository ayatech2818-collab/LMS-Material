"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginAction(email, password);
      if (result.error) {
        setError(result.error);
      } else if (result.role) {
        window.location.href = `/${result.role}`;
      } else {
        setError("Account not fully set up. Contact your administrator.");
      }
    } catch {
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      {error && (
        <div className="p-3 bg-[#e22718]/10 border border-[#e22718] text-[#e22718] text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-[#bbbbbb] text-xs font-bold tracking-[1.5px] uppercase block">
          Sign-In ID (Email Address)
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-3 text-[#e6e6e6] text-sm outline-none focus:border-[#0066b1] focus:ring-1 focus:ring-[#0066b1] placeholder:text-[#7e7e7e] transition-all"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-[#bbbbbb] text-xs font-bold tracking-[1.5px] uppercase block">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-3 text-[#e6e6e6] text-sm outline-none focus:border-[#0066b1] focus:ring-1 focus:ring-[#0066b1] placeholder:text-[#7e7e7e] transition-all"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-m w-full disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white disabled:cursor-not-allowed"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </div>
    </form>
  );
}

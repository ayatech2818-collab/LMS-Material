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
        // Full page navigation ensures fresh cookies are sent
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
    <form onSubmit={handleLogin} className="space-y-6 w-full max-w-sm">
      {error && (
        <div className="p-3 bg-warning-red/10 border border-warning-red rounded-md text-warning-red text-sm font-medium">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="email" className="text-body-gray text-sm font-medium block">
          Sign-In ID (Email Address)
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full bg-paper-white border border-mute-gray rounded-[3px] px-4 py-3 text-deep-charcoal text-base outline-none focus:ring-2 focus:ring-ps-blue placeholder:text-mute-gray transition-shadow"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-body-gray text-sm font-medium block">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-paper-white border border-mute-gray rounded-[3px] px-4 py-3 text-deep-charcoal text-base outline-none focus:ring-2 focus:ring-ps-blue placeholder:text-mute-gray transition-shadow"
        />
      </div>

      <div className="pt-4 flex justify-center">
        <button
          type="submit"
          disabled={loading}
          className="btn-playstation w-max disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-ps-blue disabled:hover:shadow-none"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </div>
    </form>
  );
}

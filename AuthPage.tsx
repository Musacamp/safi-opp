import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Building2, Mail, Lock, Loader2 } from "lucide-react";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    if (err) {
      setError(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-950 via-brand-900 to-ocean-950">
      {/* Header section */}
      <div className="flex-1 flex flex-col justify-center px-6 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Building2 className="w-8 h-8 text-brand-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Safi OPP</h1>
            <p className="text-sm text-brand-200">Landlord Operations</p>
          </div>
        </div>

        <p className="text-white/80 text-sm leading-relaxed max-w-xs mb-8">
          Your landlord calling assistant. Manage contacts, track follow-ups, and
          discover vacancies — all in one place.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "signin"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "signup"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@safirooms.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-danger-600 bg-danger-50 rounded-xl px-4 py-3 animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          {mode === "signin"
            ? "New to Safi OPP? Tap Create Account above."
            : "Already have an account? Tap Sign In above."}
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("user", JSON.stringify({ email, name: "Test User" }));
    localStorage.setItem("token", "test-token");
    navigate("/profile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-sm bg-card border border-border rounded-sm p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-full border border-accent flex items-center justify-center flex-shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">TravelLust</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight mb-1">Welcome back</h1>
        <p className="text-xs text-muted-foreground mb-6">
          Sign in to your account to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full h-8 bg-secondary border border-input rounded-sm px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-8 bg-secondary border border-input rounded-sm px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />

            <a
              href="#"
              className="block text-right text-xs text-accent hover:opacity-80 mt-1.5 transition-opacity"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full h-8 bg-accent hover:opacity-90 active:scale-[0.99] text-accent-foreground text-xs font-medium rounded-sm transition-all"
          >
            Log in
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="text-accent hover:opacity-80 transition-opacity"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
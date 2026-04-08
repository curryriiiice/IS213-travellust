import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.message || "Invalid email or password");
        return;
      }

      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname ||
        "/trips";

      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
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
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-8 bg-accent hover:opacity-90 active:scale-[0.99] text-accent-foreground text-xs font-medium rounded-sm transition-all disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-accent hover:opacity-80 transition-opacity"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
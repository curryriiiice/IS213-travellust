import { getUser, logout } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

export default function Profile() {
  const user = getUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name?.charAt(0).toUpperCase() ?? "?";

  if (!user) return <div className="p-6 text-muted-foreground">No user found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton={true} />   {/* ← adds back the navbar */}

      <div className="p-8 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-5 text-sm text-muted-foreground">
          <span>TravelLust</span>
          <span>/</span>
          <span className="text-foreground">Profile</span>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="flex items-center gap-4 p-6 border-b border-border bg-background">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium text-accent border border-accent/40 bg-accent/10">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">Traveller</p>
            </div>
            <div className="ml-auto">
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-green-500/30 bg-green-500/10 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Active
              </span>
            </div>
          </div>

          <div className="divide-y divide-border px-6">
            {[
              { label: "Name", value: user.name },
              { label: "Email", value: user.email, accent: true },
              { label: "ID", value: user.id, mono: true, small: true },
            ].map(({ label, value, accent, mono, small }) => (
              <div key={label} className="flex items-center py-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground w-20">{label}</span>
                <span className={`${mono ? "font-mono" : ""} ${accent ? "text-accent" : "text-foreground"} ${small ? "text-xs text-muted-foreground" : "text-sm"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleLogout} className="mt-4 w-full py-2 text-sm border border-border rounded text-muted-foreground hover:border-destructive/30 hover:text-destructive hover:bg-destructive/5 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleCancel = () => {
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

        <h1 className="text-xl font-semibold tracking-tight mb-1">Log out</h1>
        <p className="text-xs text-muted-foreground mb-6">
          Are you sure you want to sign out of your account?
        </p>

        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full h-8 bg-accent hover:opacity-90 active:scale-[0.99] text-accent-foreground text-xs font-medium rounded-sm transition-all"
          >
            Log out
          </button>

          <button
            onClick={handleCancel}
            className="w-full h-8 bg-secondary border border-input hover:opacity-90 text-foreground text-xs font-medium rounded-sm transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
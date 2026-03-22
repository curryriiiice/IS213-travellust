import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Sun, Moon, User, Mail, MapPin, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";

const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Compass className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium tracking-tight text-foreground">TravelLust</span>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/trips")}>
            My Trips
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Back button */}
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mb-8 -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-3 h-3 mr-1" /> Back
          </Button>

          {/* Avatar + name */}
          <div className="flex items-center gap-5 mb-10">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent/40">
              <User className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Alex Johnson</h1>
              <p className="text-sm text-muted-foreground">Frequent traveler · 12 trips</p>
            </div>
          </div>

          {/* Info cards */}
          <div className="space-y-3 mb-10">
            <div className="flex items-center gap-3 p-4 rounded-sm bg-card border border-border">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">alex.johnson@email.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-sm bg-card border border-border">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Home base</p>
                <p className="text-sm text-foreground">San Francisco, CA</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-sm bg-card border border-border">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="text-sm text-foreground">January 2024</p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <h2 className="text-sm font-medium tracking-tight text-foreground mb-4">Preferences</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-sm bg-card border border-border">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm text-foreground">Appearance</p>
                  <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
                </div>
              </div>
              <Switch checked={theme === "light"} onCheckedChange={toggleTheme} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;

import { useNavigate } from 'react-router-dom';
import { Compass, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface HeaderProps {
  /** Additional content to render in the center/right area before the notification bell */
  children?: ReactNode;
  /** Additional class names for the header */
  className?: string;
  /** Whether to show the logo (default: true) */
  showLogo?: boolean;
  /** Whether to show the profile button (default: true) */
  showProfile?: boolean;
  /** Whether to show the notification bell (default: true) */
  showNotifications?: boolean;
  /** Whether to show a back button (default: false) */
  showBackButton?: boolean;
  /** Custom back handler (defaults to navigate(-1)) */
  onBack?: () => void;
  /** Custom left side content (overrides logo) */
  leftContent?: ReactNode;
}

export function Header({
  children,
  className,
  showLogo = true,
  showProfile = true,
  showNotifications = true,
  showBackButton = false,
  onBack,
  leftContent,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        'h-12 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-50',
        className,
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        {leftContent ? (
          leftContent
        ) : showLogo ? (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Compass className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium tracking-tight">
              TravelLust
            </span>
          </button>
        ) : (
          <div /> // Empty div to maintain flex spacing
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {children}

        {showNotifications && <NotificationBell />}

        {showProfile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/profile')}
          >
            <User className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { securityService, SecuritySettings } from '../services/securityService';
import { passcodeService } from '../services/passcodeService';

export function useIdleTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<SecuritySettings>(() => securityService.getSettings());
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // Load latest settings from cloud and listen for live changes
  useEffect(() => {
    securityService.loadFromCloud().then(setSettings);

    const handleSettingsChanged = (e: any) => {
      if (e?.detail) {
        setSettings(e.detail);
      }
    };

    window.addEventListener('tisha_security_settings_changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('tisha_security_settings_changed', handleSettingsChanged);
    };
  }, []);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timeoutMinutes = settings.idleTimeoutMinutes;
    if (timeoutMinutes === 0) {
      // Auto-logout disabled
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const isImmediate = timeoutMinutes === -1;
    // For immediate: 30 seconds of inactivity on the active page, or instant on tab switch
    const timeoutMs = isImmediate ? 30 * 1000 : timeoutMinutes * 60 * 1000;
    const checkIntervalMs = isImmediate ? 1000 : 5000;

    lastActivityRef.current = Date.now();

    const triggerLogout = (reason: string) => {
      if (timerRef.current) clearInterval(timerRef.current);
      passcodeService.lockSession();
      logout();
      toast.warning(reason);
      navigate('/login');
    };

    const handleVisibilityChange = () => {
      if (isImmediate && document.visibilityState === 'hidden') {
        triggerLogout('Logged out immediately upon switching away as configured.');
      }
    };

    if (isImmediate) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetActivity, { passive: true });
    });

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs) {
        triggerLogout(
          isImmediate
            ? 'Logged out immediately due to inactivity.'
            : `Logged out due to ${timeoutMinutes} minute${timeoutMinutes > 1 ? 's' : ''} of inactivity.`
        );
      }
    }, checkIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (isImmediate) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetActivity);
      });
    };
  }, [isAuthenticated, settings.idleTimeoutMinutes, logout, navigate, resetActivity, toast]);

  return { settings, setSettings };
}

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  Sliders, 
  Sparkles, 
  Copy, 
  Check, 
  Eye, 
  Code, 
  ExternalLink,
  CreditCard,
  Layers,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { MASTER_SUPER_ADMIN_EMAIL } from '../../types/auth';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export interface WeeklyEmailTemplateConfig {
  subjectTemplate: string;
  headerTitle: string;
  companyName: string;
  greetingMessage: string;
  showKpiCards: boolean;
  showClientTable: boolean;
  showNotes: boolean;
  showBankDetails: boolean;
  showDashboardButton: boolean;
  footerText: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    upiId: string;
    accountHolder: string;
  };
}

export interface WeeklyEmailConfig {
  enabled: boolean;
  recipients: string[];
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly_1st' | 'monthly_15th' | 'monthly_end';
  dayOfWeek: string;
  timeStr: string;
  dispatchMethod: 'apps_script' | 'edge_function';
  appsScriptUrl: string;
  senderName: string;
  template: WeeklyEmailTemplateConfig;
  updatedAt?: string;
  updatedBy?: string;
}

const STORAGE_KEY = 'tisha_weekly_email_settings_v2';

const DEFAULT_TEMPLATE: WeeklyEmailTemplateConfig = {
  subjectTemplate: '[{{company_name}}] Weekly Financial Report: ₹{{total_due}} Pending ({{pending_count}} Events)',
  headerTitle: 'Financial Performance & Collections',
  companyName: 'Tisha LED Walls',
  greetingMessage: 'Automated digest of all active event rentals, payments, partial amounts & outstanding dues.',
  showKpiCards: true,
  showClientTable: true,
  showNotes: true,
  showBankDetails: true,
  showDashboardButton: true,
  footerText: 'Tisha LED Walls • Automated Financial Operations Digest',
  bankDetails: {
    bankName: 'HDFC Bank',
    accountNumber: '50200067891234',
    ifsc: 'HDFC0001234',
    upiId: '7703948857@upi',
    accountHolder: 'Tisha LED Walls'
  }
};

const DEFAULT_CONFIG: WeeklyEmailConfig = {
  enabled: true,
  recipients: ['ms960000@gmail.com'],
  frequency: 'weekly',
  dayOfWeek: 'Sunday',
  timeStr: '10:00',
  dispatchMethod: 'apps_script',
  appsScriptUrl: '',
  senderName: 'Tisha LED Walls Accounts',
  template: DEFAULT_TEMPLATE
};

// Generate all 48 half-hour slots for 24 hours
const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const label = `${String(displayH).padStart(2, '0')}:${mm} ${period} (${hh}:${mm} IST)`;
    TIME_OPTIONS.push({ value: `${hh}:${mm}`, label });
  }
}

const DAY_OPTIONS = [
  { value: 'Sunday', label: 'Every Sunday (Recommended)' },
  { value: 'Monday', label: 'Every Monday' },
  { value: 'Tuesday', label: 'Every Tuesday' },
  { value: 'Wednesday', label: 'Every Wednesday' },
  { value: 'Thursday', label: 'Every Thursday' },
  { value: 'Friday', label: 'Every Friday' },
  { value: 'Saturday', label: 'Every Saturday' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly (Every 7 days on chosen day)' },
  { value: 'daily', label: 'Daily (Every single day)' },
  { value: 'biweekly', label: 'Bi-Weekly (Every 14 days)' },
  { value: 'monthly_1st', label: 'Monthly (1st of every month)' },
  { value: 'monthly_15th', label: 'Monthly (15th of every month)' },
  { value: 'monthly_end', label: 'Monthly (Last day of month)' },
];

const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * TISHA LED WALLS - EMAIL WEBHOOK (GOOGLE APPS SCRIPT)
 * Sends emails directly from your own Gmail / Google Workspace account.
 * 100% Free • No 3rd Party • Zero Domain DNS Setup
 * 
 * Instructions:
 * 1. Go to https://script.google.com/
 * 2. Click "New project"
 * 3. Replace all code with this snippet
 * 4. Click "Deploy" > "New deployment"
 * 5. Type: Select "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. Copy the Web App URL and paste it into the Settings Modal.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var recipients = Array.isArray(data.recipients) ? data.recipients.join(",") : (data.recipients || "");
    var subject = data.subject || "Tisha LED Walls Financial Summary";
    var htmlBody = data.html || "<p>Financial Report</p>";
    var senderName = data.senderName || "Tisha LED Walls Accounts";

    if (!recipients) {
      throw new Error("No recipients specified");
    }

    // Sends directly from your authenticated Google Account
    GmailApp.sendEmail(recipients, subject, "Please view in HTML compatible mail client.", {
      name: senderName,
      htmlBody: htmlBody
    });

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: "Email sent directly from own Google account to " + recipients 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyEmailSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  const { user, isSuperAdmin, hasPermission } = useAuth();

  // Super Admin & Admin / Permissions Matrix check
  const userEmail = (user?.email || '').toLowerCase().trim();
  const isMasterSuperAdmin = userEmail === MASTER_SUPER_ADMIN_EMAIL.toLowerCase().trim();
  const isSuperAdminUser = isSuperAdmin || hasPermission('canManageEmailDigest') || user?.role === 'owner' || user?.role === 'admin' || isMasterSuperAdmin;

  // Active Tab: 'schedule' | 'template' | 'sender' | 'preview'
  const [activeTab, setActiveTab] = useState<'schedule' | 'template' | 'sender' | 'preview'>('schedule');

  const [config, setConfig] = useState<WeeklyEmailConfig>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          template: { ...DEFAULT_TEMPLATE, ...(parsed.template || {}) }
        };
      }
    } catch (e) {}
    return DEFAULT_CONFIG;
  });

  const [recipientsInput, setRecipientsInput] = useState<string>(() => 
    config.recipients.join(', ')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCron, setCopiedCron] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Load latest settings from Supabase company_settings table
  useEffect(() => {
    if (!isOpen) return;

    setTestStatus(null);
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from('company_settings')
        .select('profile')
        .eq('id', 'weekly_email_settings')
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data && data.profile) {
            const loaded = {
              ...DEFAULT_CONFIG,
              ...data.profile,
              template: { ...DEFAULT_TEMPLATE, ...(data.profile.template || {}) }
            };
            setConfig(loaded);
            setRecipientsInput((loaded.recipients || []).join(', '));
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
            } catch (e) {}
          }
        })
        .catch(console.warn);
    }
  }, [isOpen]);

  // Generate dynamic cron expression based on selected schedule
  const cronExpression = useMemo(() => {
    const [hStr, mStr] = config.timeStr.split(':');
    const istH = parseInt(hStr || '10', 10);
    const istM = parseInt(mStr || '00', 10);

    // Convert IST to UTC (subtract 5h 30m)
    let totalMinutes = (istH * 60 + istM) - 330;
    let dayOffset = 0;
    if (totalMinutes < 0) {
      totalMinutes += 1440;
      dayOffset = -1;
    }

    const utcH = Math.floor(totalMinutes / 60);
    const utcM = totalMinutes % 60;

    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6
    };

    let targetDay = dayMap[config.dayOfWeek] ?? 0;
    if (dayOffset === -1) {
      targetDay = (targetDay + 6) % 7;
    }

    if (config.frequency === 'daily') {
      return `${utcM} ${utcH} * * *`;
    }
    if (config.frequency === 'monthly_1st') {
      return `${utcM} ${utcH} 1 * *`;
    }
    if (config.frequency === 'monthly_15th') {
      return `${utcM} ${utcH} 15 * *`;
    }
    if (config.frequency === 'monthly_end') {
      return `${utcM} ${utcH} 28 * *`;
    }
    return `${utcM} ${utcH} * * ${targetDay}`;
  }, [config.frequency, config.dayOfWeek, config.timeStr]);

  // Load preview when preview tab is clicked
  useEffect(() => {
    if (activeTab === 'preview' && !previewHtml) {
      loadLivePreview();
    }
  }, [activeTab]);

  const loadLivePreview = async () => {
    setLoadingPreview(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dsyicahqdiavaidsjmvl.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1xz2VR6veUpoVGMxjtC18Q_1CRofOJn';

      const res = await fetch(`${supabaseUrl}/functions/v1/send-weekly-ledger-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          isTest: true,
          template: config.template,
          senderName: config.senderName
        })
      });

      const data = await res.json();
      if (data.emailHTML) {
        setPreviewHtml(data.emailHTML);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  if (!isOpen) return null;

  // Strict Super Admin Access Guard
  if (!isSuperAdminUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <Lock size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Access Restricted</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Email Digest configuration is restricted to Super Admin and Admin roles.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Handle Save Configuration
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSuperAdminUser) return;

    const emails = recipientsInput
      .split(',')
      .map(e => e.trim())
      .filter(e => Boolean(e) && e.includes('@'));

    if (emails.length === 0) {
      toast.error('Please enter at least one valid recipient email address.');
      return;
    }

    const updatedConfig: WeeklyEmailConfig = {
      ...config,
      recipients: emails,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail
    };

    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
      setConfig(updatedConfig);

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('company_settings')
          .upsert({
            id: 'weekly_email_settings',
            profile: updatedConfig,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (error) {
          console.error('Failed saving to Supabase:', error);
          toast.error('Saved locally. Cloud warning: ' + error.message);
        } else {
          toast.success('Configuration & Email Template saved to cloud database!');
        }
      } else {
        toast.success('Configuration saved!');
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Error saving settings: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Instant Test Dispatch
  const handleInstantTest = async () => {
    if (!isSuperAdminUser) return;

    const emails = recipientsInput
      .split(',')
      .map(e => e.trim())
      .filter(e => Boolean(e) && e.includes('@'));

    if (emails.length === 0) {
      toast.error('Please provide at least one valid email to send test report.');
      return;
    }

    setIsSendingTest(true);
    setTestStatus(null);
    toast.info(`Dispatching test report to ${emails.join(', ')}...`);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dsyicahqdiavaidsjmvl.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1xz2VR6veUpoVGMxjtC18Q_1CRofOJn';

      const res = await fetch(`${supabaseUrl}/functions/v1/send-weekly-ledger-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          recipients: emails,
          isTest: true,
          dispatchMethod: config.dispatchMethod,
          appsScriptUrl: config.appsScriptUrl,
          senderName: config.senderName,
          template: config.template
        })
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || 'Failed to dispatch test email');
      }

      const methodLabel = data.method === 'apps_script' 
        ? 'Own Google Account (Google Apps Script)' 
        : 'Cloud Edge Function (Resend)';

      setTestStatus({
        success: true,
        message: `Dispatched successfully via ${methodLabel} to: ${emails.join(', ')}!`
      });
      toast.success('Live test report delivered! Check your inbox.');
    } catch (err: any) {
      console.error('Instant test error:', err);
      setTestStatus({
        success: false,
        message: err.message || 'Dispatch error occurred. Check your Webhook URL or Resend API key.'
      });
      toast.error('Test dispatch failed: ' + (err.message || 'Check logs'));
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyAppsScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    toast.success('Google Apps Script code copied to clipboard!');
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const copyCronSql = () => {
    const sql = `-- Schedule ${config.frequency.toUpperCase()} at ${config.timeStr} IST (${cronExpression} UTC)
SELECT cron.schedule(
  'weekly-tisha-ledger-email-summary',
  '${cronExpression}',
  $$
  SELECT net.http_post(
    url := 'https://dsyicahqdiavaidsjmvl.supabase.co/functions/v1/send-weekly-ledger-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);`;
    navigator.clipboard.writeText(sql);
    setCopiedCron(true);
    toast.success('Cron Schedule SQL copied to clipboard!');
    setTimeout(() => setCopiedCron(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-xs">
              <Mail size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Financial Email Automation &amp; Templates
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <ShieldCheck size={11} /> Super Admin &amp; Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                24-hr schedule, template customization &amp; send via own Google ID
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar size={14} />
            <span>Schedule &amp; Recipients</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'template'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders size={14} />
            <span>Email Template</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sender')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'sender'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Code size={14} />
            <span>Send From Own ID (No 3rd Party)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('preview');
              loadLivePreview();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Eye size={14} />
            <span>Live Preview</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Security Guard */}
          {!isSuperAdminUser && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-200">
              <Lock size={20} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-rose-300 text-sm">Access Restricted to Super Admin &amp; Admin</div>
                <div className="text-slate-300 leading-relaxed">
                  Only authorized Super Admin or Admin accounts can modify email schedules, templates, sender hooks, and test dispatches.
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Signed in as: <code className="text-rose-300">{userEmail || 'Anonymous'}</code>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: SCHEDULE & RECIPIENTS */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {/* Enabled Switch */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Automated Email Digest Status</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      config.enabled 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {config.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Periodic automatic dispatch of outstanding balances and event rentals.
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdminUser}
                    checked={config.enabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Recipients Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-400" />
                    <span>Recipient Email Addresses</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Comma-separated</span>
                </label>
                <textarea
                  rows={2}
                  disabled={!isSuperAdminUser}
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  placeholder="e.g. ms960000@gmail.com, admin@tishaledwalls.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 font-mono"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  All recipients will receive the financial report at the configured schedule.
                </div>
              </div>

              {/* Comprehensive Frequency, Day, & Full 24-hr Time Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Frequency */}
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Layers size={13} className="text-indigo-400" />
                    <span>Frequency</span>
                  </label>
                  <select
                    disabled={!isSuperAdminUser}
                    value={config.frequency}
                    onChange={(e) => setConfig(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50 cursor-pointer"
                  >
                    {FREQUENCY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Day of Week */}
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Calendar size={13} className="text-indigo-400" />
                    <span>Day of Week</span>
                  </label>
                  <select
                    disabled={!isSuperAdminUser || config.frequency === 'daily'}
                    value={config.dayOfWeek}
                    onChange={(e) => setConfig(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50 cursor-pointer"
                  >
                    {DAY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Complete 24-hr Time Options */}
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Clock size={13} className="text-indigo-400" />
                    <span>Scheduled Time (IST)</span>
                  </label>
                  <select
                    disabled={!isSuperAdminUser}
                    value={config.timeStr}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeStr: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-50 cursor-pointer"
                  >
                    {TIME_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PostgreSQL pg_cron Info Box */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>Cron Expression:</span>
                    <code className="text-amber-300 bg-slate-900 px-2 py-0.5 rounded-md font-mono text-xs">
                      {cronExpression}
                    </code>
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({config.frequency === 'daily' ? 'Daily' : `Every ${config.dayOfWeek}`} at {config.timeStr} IST)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyCronSql}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 transition-all shrink-0 cursor-pointer"
                >
                  {copiedCron ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCron ? 'Copied SQL' : 'Copy pg_cron SQL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL TEMPLATE CONFIGURATION */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              {/* Dynamic Subject Line */}
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-400" />
                    <span>Subject Line Template</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    Tags: &#123;&#123;company_name&#125;&#125;, &#123;&#123;total_due&#125;&#125;, &#123;&#123;pending_count&#125;&#125;, &#123;&#123;date&#125;&#125;
                  </span>
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdminUser}
                  value={config.template.subjectTemplate}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    template: { ...prev.template, subjectTemplate: e.target.value }
                  }))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Brand & Header Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                    Company / Brand Name
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdminUser}
                    value={config.template.companyName}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      template: { ...prev.template, companyName: e.target.value }
                    }))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                    Email Header Title
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdminUser}
                    value={config.template.headerTitle}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      template: { ...prev.template, headerTitle: e.target.value }
                    }))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Greeting / Subtitle Message */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Opening Greeting / Summary Message
                </label>
                <textarea
                  rows={2}
                  disabled={!isSuperAdminUser}
                  value={config.template.greetingMessage}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    template: { ...prev.template, greetingMessage: e.target.value }
                  }))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Section Toggles */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Email Content Sections
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdminUser}
                      checked={config.template.showKpiCards}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        template: { ...prev.template, showKpiCards: e.target.checked }
                      }))}
                      className="rounded-sm border-slate-600 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span>KPI Cards (Total Due &amp; Advance Paid)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdminUser}
                      checked={config.template.showClientTable}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        template: { ...prev.template, showClientTable: e.target.checked }
                      }))}
                      className="rounded-sm border-slate-600 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Outstanding Invoices Breakdown Table</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdminUser}
                      checked={config.template.showNotes}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        template: { ...prev.template, showNotes: e.target.checked }
                      }))}
                      className="rounded-sm border-slate-600 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Event Notes &amp; Remarks</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdminUser}
                      checked={config.template.showBankDetails}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        template: { ...prev.template, showBankDetails: e.target.checked }
                      }))}
                      className="rounded-sm border-slate-600 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Bank &amp; UPI Remittance Details</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdminUser}
                      checked={config.template.showDashboardButton}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        template: { ...prev.template, showDashboardButton: e.target.checked }
                      }))}
                      className="rounded-sm border-slate-600 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Open Live Dashboard Direct Action Button</span>
                  </label>
                </div>
              </div>

              {/* Remittance & Banking Details (if enabled) */}
              {config.template.showBankDetails && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <CreditCard size={14} className="text-indigo-400" />
                    <span>Official Bank &amp; UPI Remittance Info</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Bank Name</label>
                      <input
                        type="text"
                        disabled={!isSuperAdminUser}
                        value={config.template.bankDetails.bankName}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          template: {
                            ...prev.template,
                            bankDetails: { ...prev.template.bankDetails, bankName: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Account Number</label>
                      <input
                        type="text"
                        disabled={!isSuperAdminUser}
                        value={config.template.bankDetails.accountNumber}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          template: {
                            ...prev.template,
                            bankDetails: { ...prev.template.bankDetails, accountNumber: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        disabled={!isSuperAdminUser}
                        value={config.template.bankDetails.ifsc}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          template: {
                            ...prev.template,
                            bankDetails: { ...prev.template.bankDetails, ifsc: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">UPI ID</label>
                      <input
                        type="text"
                        disabled={!isSuperAdminUser}
                        value={config.template.bankDetails.upiId}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          template: {
                            ...prev.template,
                            bankDetails: { ...prev.template.bankDetails, upiId: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Footer */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Footer Note Text
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdminUser}
                  value={config.template.footerText}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    template: { ...prev.template, footerText: e.target.value }
                  }))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: SENDER & DISPATCH METHOD (OWN ID / NO 3RD PARTY) */}
          {activeTab === 'sender' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Send Email By Own ID (Zero 3rd-Party Dependency)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You can send emails directly from your own Gmail or Google Workspace address (e.g. <strong>{MASTER_SUPER_ADMIN_EMAIL}</strong> or <strong>ms960000@gmail.com</strong>) without depending on Resend or any paid 3rd-party services.
                </p>
              </div>

              {/* Method Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.dispatchMethod === 'apps_script'
                    ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="dispatchMethod"
                      value="apps_script"
                      checked={config.dispatchMethod === 'apps_script'}
                      onChange={() => setConfig(prev => ({ ...prev, dispatchMethod: 'apps_script' }))}
                      className="text-indigo-600"
                    />
                    <span className="text-xs font-bold text-white">Google Apps Script Webhook</span>
                    <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                      Own Gmail ID
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Sends directly from your authenticated Google account with 0 third party dependencies.
                  </div>
                </label>

                <label className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.dispatchMethod === 'edge_function'
                    ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="dispatchMethod"
                      value="edge_function"
                      checked={config.dispatchMethod === 'edge_function'}
                      onChange={() => setConfig(prev => ({ ...prev, dispatchMethod: 'edge_function' }))}
                      className="text-indigo-600"
                    />
                    <span className="text-xs font-bold text-white">Cloud Edge Function (Resend)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Managed cloud delivery via Supabase Edge Function &amp; Resend API key.
                  </div>
                </label>
              </div>

              {/* Sender Display Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdminUser}
                  value={config.senderName}
                  onChange={(e) => setConfig(prev => ({ ...prev, senderName: e.target.value }))}
                  placeholder="e.g. Tisha LED Walls Accounts"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Apps Script Setup Details (if chosen) */}
              {config.dispatchMethod === 'apps_script' && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Code size={14} className="text-emerald-400" />
                      <span>Google Apps Script Web App URL</span>
                    </div>
                    <button
                      type="button"
                      onClick={copyAppsScript}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-all cursor-pointer"
                    >
                      {copiedScript ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedScript ? 'Script Copied!' : 'Copy Apps Script Code'}</span>
                    </button>
                  </div>

                  <input
                    type="url"
                    disabled={!isSuperAdminUser}
                    value={config.appsScriptUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, appsScriptUrl: e.target.value }))}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />

                  {/* 3 Step Setup Guide */}
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>Quick 1-Minute Setup in your Google Account:</span>
                      <a 
                        href="https://script.google.com/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-indigo-400 hover:underline"
                      >
                        script.google.com <ExternalLink size={10} />
                      </a>
                    </div>
                    <div className="leading-relaxed">
                      1. Open <strong className="text-white">script.google.com</strong> while signed in with your email &rarr; Click <strong>New project</strong>.
                    </div>
                    <div className="leading-relaxed">
                      2. Click <strong>"Copy Apps Script Code"</strong> above, paste it into the editor, and click <strong>Deploy &gt; New deployment</strong>.
                    </div>
                    <div className="leading-relaxed">
                      3. Select <strong>Web app</strong>, set Execute as: <strong>Me</strong>, Who has access: <strong>Anyone</strong>, deploy, and paste the URL above!
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Real-time preview rendered using your live Supabase ledger data &amp; current template settings.
                </div>
                <button
                  type="button"
                  onClick={loadLivePreview}
                  disabled={loadingPreview}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg border border-slate-700"
                >
                  <RefreshCw size={12} className={loadingPreview ? 'animate-spin' : ''} />
                  <span>Refresh Preview</span>
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden min-h-[400px]">
                {loadingPreview ? (
                  <div className="flex flex-col items-center justify-center h-80 gap-2 text-slate-400 text-xs">
                    <RefreshCw size={24} className="animate-spin text-indigo-500" />
                    <span>Rendering live email template...</span>
                  </div>
                ) : previewHtml ? (
                  <iframe
                    title="Live Email Preview"
                    srcDoc={previewHtml}
                    className="w-full h-[450px] rounded-lg border-0 bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 gap-2 text-slate-400 text-xs">
                    <span>Click "Refresh Preview" to generate HTML preview.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instant Test Section (Visible on all tabs) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Instant Test Dispatch
                </span>
              </div>
              <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Method: {config.dispatchMethod === 'apps_script' ? 'Own Google ID' : 'Cloud Resend'}
              </span>
            </div>

            <p className="text-[11.5px] text-slate-300 leading-relaxed">
              Dispatch a test report right now to <strong>{recipientsInput || 'no recipients'}</strong> to verify subject, template styling, and inbox delivery.
            </p>

            <button
              type="button"
              disabled={!isSuperAdminUser || isSendingTest}
              onClick={handleInstantTest}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSendingTest ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Dispatching Test Digest...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send Instant Test Email Now</span>
                </>
              )}
            </button>

            {/* Test Status Banner */}
            {testStatus && (
              <div className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testStatus.success 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}>
                {testStatus.success ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <div className="font-bold">
                    {testStatus.success ? 'Dispatch Succeeded!' : 'Dispatch Notice'}
                  </div>
                  <div>{testStatus.message}</div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400">
            {config.updatedAt && (
              <span>Last saved: {new Date(config.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            {isSuperAdminUser && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

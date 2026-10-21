// Supabase Edge Function: send-weekly-ledger-summary
// Triggered weekly by pg_cron or HTTP POST to send weekly collections & dues report
// Supports:
// 1. Sending via own Google Account (Google Apps Script Webhook - Zero 3rd party dependency)
// 2. Sending via Resend API (Cloud fallback)
// 3. Fully customizable email templates, subject tags, section toggles, and bank details

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LedgerRow {
  id: string;
  date: string;
  client_name: string;
  screen_size: string | null;
  total_amount: number;
  paid_amount: number;
  status: string;
  notes: string | null;
  is_deleted?: boolean;
}

function formatINR(val: number | string): string {
  const n = Number(val) || 0;
  return n.toLocaleString("en-IN");
}

function formatCustomDate(d?: string | null): string {
  if (!d) return "—";
  const str = String(d).trim();
  if (str.includes("/") || str.includes("-")) {
    if (str.includes("-") && str.length >= 10 && !str.includes("/")) {
      const parts = str.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return str;
  }
  return str;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let reqBody: any = {};
    if (req.method === "POST") {
      try {
        reqBody = await req.json();
      } catch (e) {
        // empty body is fine
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "https://dsyicahqdiavaidsjmvl.supabase.co";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY") || "sb_publishable_1xz2VR6veUpoVGMxjtC18Q_1CRofOJn";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const defaultRecipient = Deno.env.get("SUMMARY_RECIPIENT_EMAIL") || "ms960000@gmail.com";

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch configured weekly email settings from company_settings
    let configProfile: any = {};
    try {
      const { data: configRow } = await supabase
        .from("company_settings")
        .select("profile")
        .eq("id", "weekly_email_settings")
        .maybeSingle();

      if (configRow && configRow.profile) {
        configProfile = configRow.profile;
      }
    } catch (e) {
      console.warn("Could not read weekly_email_settings from company_settings:", e);
    }

    // Merge settings from request body if passed (useful for instant preview/testing)
    const enabled = reqBody.enabled !== undefined ? reqBody.enabled : (configProfile.enabled !== false);
    if (!enabled && !reqBody.isTest) {
      return new Response(JSON.stringify({
        success: true,
        message: "Weekly automated report is currently paused in settings."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Recipients
    let targetRecipients: string[] = [];
    if (Array.isArray(reqBody.recipients) && reqBody.recipients.length > 0) {
      targetRecipients = reqBody.recipients.map((r: string) => r.trim()).filter(Boolean);
    } else if (Array.isArray(configProfile.recipients) && configProfile.recipients.length > 0) {
      targetRecipients = configProfile.recipients.map((r: string) => r.trim()).filter(Boolean);
    } else {
      targetRecipients = [defaultRecipient];
    }

    // Template Config
    const templateConfig = {
      subjectTemplate: reqBody.template?.subjectTemplate || configProfile.template?.subjectTemplate || "[{{company_name}}] Weekly Financial Report: ₹{{total_due}} Pending ({{pending_count}} Events)",
      headerTitle: reqBody.template?.headerTitle || configProfile.template?.headerTitle || "Financial Performance & Collections",
      companyName: reqBody.template?.companyName || configProfile.template?.companyName || "Tisha LED Walls",
      greetingMessage: reqBody.template?.greetingMessage || configProfile.template?.greetingMessage || "Automated digest of all active event rentals, payments, partial amounts & outstanding dues.",
      showKpiCards: reqBody.template?.showKpiCards !== undefined ? reqBody.template.showKpiCards : (configProfile.template?.showKpiCards !== false),
      showClientTable: reqBody.template?.showClientTable !== undefined ? reqBody.template.showClientTable : (configProfile.template?.showClientTable !== false),
      showNotes: reqBody.template?.showNotes !== undefined ? reqBody.template.showNotes : (configProfile.template?.showNotes !== false),
      showBankDetails: reqBody.template?.showBankDetails !== undefined ? reqBody.template.showBankDetails : (configProfile.template?.showBankDetails === true),
      showDashboardButton: reqBody.template?.showDashboardButton !== undefined ? reqBody.template.showDashboardButton : (configProfile.template?.showDashboardButton !== false),
      footerText: reqBody.template?.footerText || configProfile.template?.footerText || "Tisha LED Walls • Automated Financial Operations Digest",
      bankDetails: reqBody.template?.bankDetails || configProfile.template?.bankDetails || {
        bankName: "State Bank Of India",
        accountNumber: "42410969250",
        ifsc: "SBIN0061222",
        upiId: "9716681122@sbi",
        accountHolder: "Ankush Saini"

      }
    };

    // Sending method & Own ID configuration
    const dispatchMethod = reqBody.dispatchMethod || configProfile.dispatchMethod || (configProfile.appsScriptUrl ? "apps_script" : "edge_function");
    const appsScriptUrl = reqBody.appsScriptUrl || configProfile.appsScriptUrl || "";
    const senderName = reqBody.senderName || configProfile.senderName || "Tisha LED Walls Accounts";

    // 2. Fetch active records from Supabase payment_ledger
    const { data: rows, error: fetchErr } = await supabase
      .from("payment_ledger")
      .select("*")
      .order("date", { ascending: false });

    if (fetchErr) {
      throw new Error(`Supabase query error: ${fetchErr.message}`);
    }

    const ledgerRows: LedgerRow[] = (rows || []).filter((r: any) => !r.is_deleted);

    let totalBalanceDue = 0;
    let totalAdvancePaid = 0;
    let totalEventsValue = 0;
    let pendingCount = 0;
    let partialCount = 0;
    let rowsHTML = "";

    // Process rows
    for (const row of ledgerRows) {
      const statusText = (row.status || "").toLowerCase().trim();
      if (statusText === "received") continue;

      const totalAmt = Number(row.total_amount) || 0;
      let paidAmt = Number(row.paid_amount) || 0;
      let isPartial = false;

      if (statusText === "partial" || paidAmt > 0) {
        isPartial = true;
        partialCount++;
      } else {
        paidAmt = 0;
      }

      const balanceDue = Math.max(0, totalAmt - paidAmt);
      totalBalanceDue += balanceDue;
      totalAdvancePaid += paidAmt;
      totalEventsValue += totalAmt;
      pendingCount++;

      const formattedDate = formatCustomDate(row.date);
      const clientName = row.client_name || "Untitled Client";
      const sizeDisplay = row.screen_size ? String(row.screen_size).trim() : "—";
      const note = (templateConfig.showNotes && row.notes && !row.notes.startsWith("Imported")) ? row.notes : "";

      rowsHTML += `
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:14px 10px;vertical-align:top;">
            <div style="font-weight:700;color:#0f172a;font-size:14.5px;line-height:1.3;letter-spacing:-0.2px;">
              ${clientName}
            </div>
            <div style="margin-top:6px;font-size:12px;">
              <span style="font-weight:800;color:#0f172a;background:#f1f5f9;padding:2px 8px;border-radius:4px;border:1px solid #cbd5e1;display:inline-block;letter-spacing:-0.2px;">
                ${formattedDate}
              </span>
              ${sizeDisplay !== "—" ? `
                <span style="display:inline-block;margin-left:6px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px;border:1px solid #e2e8f0;">
                  ${sizeDisplay}
                </span>
              ` : ""}
            </div>
            <div style="margin-top:7px;">
              ${isPartial ? `
                <span style="display:inline-block;background:#f3e8ff;color:#7e22ce;font-size:11px;font-weight:700;padding:2px 9px;border-radius:12px;border:1px solid #d8b4fe;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#9333ea;margin-right:5px;vertical-align:middle;"></span>Partial (Paid: ₹${formatINR(paidAmt)})
                </span>
              ` : `
                <span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;padding:2px 9px;border-radius:12px;border:1px solid #fca5a5;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dc2626;margin-right:5px;vertical-align:middle;"></span>Unpaid
                </span>
              `}
            </div>
            ${note ? `
              <div style="margin-top:8px;background:#fffbeb;border-left:3px solid #f59e0b;padding:5px 9px;border-radius:0 4px 4px 0;font-size:12px;color:#92400e;line-height:1.4;">
                <strong style="color:#b45309;font-size:10.5px;text-transform:uppercase;">Note:</strong> ${note}
              </div>
            ` : ""}
          </td>
          <td style="padding:14px 10px;vertical-align:top;text-align:right;white-space:nowrap;min-width:90px;">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">
              Balance Due
            </div>
            <div style="font-weight:800;color:${balanceDue >= 15000 ? '#dc2626' : '#ea580c'};font-size:17px;line-height:1.2;letter-spacing:-0.3px;">
              ₹${formatINR(balanceDue)}
            </div>
            ${isPartial ? `
              <div style="font-size:11px;color:#94a3b8;margin-top:3px;">
                Total: ₹${formatINR(totalAmt)}
              </div>
            ` : ""}
          </td>
        </tr>
      `;
    }

    const todayStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date());

    // Generate Dynamic Subject line from user template
    let subject = templateConfig.subjectTemplate
      .replace(/\{\{company_name\}\}/gi, templateConfig.companyName)
      .replace(/\{\{total_due\}\}/gi, formatINR(totalBalanceDue))
      .replace(/\{\{pending_count\}\}/gi, String(pendingCount))
      .replace(/\{\{advances_paid\}\}/gi, formatINR(totalAdvancePaid))
      .replace(/\{\{date\}\}/gi, todayStr);

    if (pendingCount === 0 && subject.includes("Pending")) {
      subject = `[${templateConfig.companyName}] All Payments Cleared (₹0 Due) • ${todayStr}`;
    }

    // Build Email HTML based on configurable toggles
    const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="width:100%;background-color:#f1f5f9;padding:16px 0;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">

          <!-- HEADER -->
          <div style="background:linear-gradient(135deg, #090d16 0%, #1e1b4b 100%);padding:22px 18px;border-top:4px solid #6366f1;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <div style="color:#818cf8;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                    ${templateConfig.headerTitle}
                  </div>
                  <h1 style="margin:3px 0 0 0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
                    ${templateConfig.companyName}
                  </h1>
                </td>
                <td style="text-align:right;vertical-align:top;">
                  <span style="display:inline-block;background:rgba(255,255,255,0.12);color:#e2e8f0;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:16px;border:1px solid rgba(255,255,255,0.18);">
                    ${todayStr}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- GREETING / SUBTITLE -->
          ${templateConfig.greetingMessage ? `
            <div style="padding:14px 18px 0 18px;font-size:13px;color:#475569;line-height:1.5;">
              ${templateConfig.greetingMessage}
            </div>
          ` : ""}

          <!-- KPI SUMMARY CARDS -->
          ${templateConfig.showKpiCards ? `
            <div style="padding:16px 14px 8px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Card 1: Balance Due -->
                  <td width="50%" style="padding-right:6px;vertical-align:top;">
                    <div style="background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:1px solid #fecdd3;border-radius:10px;padding:12px;">
                      <div style="font-size:10px;font-weight:700;color:#9f1239;text-transform:uppercase;letter-spacing:0.4px;">
                        Total Balance Due
                      </div>
                      <div style="font-size:22px;font-weight:900;color:#e11d48;margin-top:3px;letter-spacing:-0.5px;line-height:1.2;">
                        ₹${formatINR(totalBalanceDue)}
                      </div>
                      <div style="font-size:11px;color:#be123c;margin-top:2px;">
                        Across ${pendingCount} events
                      </div>
                    </div>
                  </td>

                  <!-- Card 2: Advance Collected -->
                  <td width="50%" style="padding-left:6px;vertical-align:top;">
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:10px;padding:12px;">
                      <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.4px;">
                        Advance Collected
                      </div>
                      <div style="font-size:22px;font-weight:900;color:#16a34a;margin-top:3px;letter-spacing:-0.5px;line-height:1.2;">
                        ₹${formatINR(totalAdvancePaid)}
                      </div>
                      <div style="font-size:11px;color:#15803d;margin-top:2px;">
                        ${partialCount} partial advances
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          ` : ""}

          <!-- BREAKDOWN SECTION -->
          ${templateConfig.showClientTable ? `
            <div style="padding:12px 14px 16px 14px;">
              <div style="margin-bottom:10px;">
                <h3 style="margin:0;font-size:14px;color:#0f172a;font-weight:700;">
                  Outstanding Event Invoices (${pendingCount})
                </h3>
              </div>

              ${pendingCount > 0 ? `
                <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                    <thead>
                      <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                        <th style="padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Event Details</th>
                        <th style="padding:9px 10px;text-align:right;font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rowsHTML}
                    </tbody>
                  </table>
                </div>
              ` : `
                <div style="background:#f0fdf4;border:1px dashed #86efac;border-radius:10px;padding:24px;text-align:center;">
                  <div style="font-size:16px;font-weight:800;color:#166534;">
                    All Payments Cleared!
                  </div>
                  <div style="font-size:12px;color:#15803d;margin-top:3px;">
                    Zero outstanding balances for this period.
                  </div>
                </div>
              `}
            </div>
          ` : ""}

          <!-- BANK & UPI PAYMENT DETAILS -->
          ${templateConfig.showBankDetails ? `
            <div style="margin:0 14px 16px 14px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
              <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                Official Remittance &amp; Banking Details
              </div>
              <table width="100%" style="font-size:12px;color:#1e293b;line-height:1.6;">
                <tr>
                  <td width="30%" style="color:#64748b;font-weight:600;">Bank Name:</td>
                  <td style="font-weight:700;">${templateConfig.bankDetails.bankName || "—"}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-weight:600;">Account No:</td>
                  <td style="font-weight:700;font-family:monospace;">${templateConfig.bankDetails.accountNumber || "—"}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-weight:600;">IFSC Code:</td>
                  <td style="font-weight:700;font-family:monospace;">${templateConfig.bankDetails.ifsc || "—"}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-weight:600;">UPI ID:</td>
                  <td style="font-weight:700;color:#4f46e5;">${templateConfig.bankDetails.upiId || "—"}</td>
                </tr>
              </table>
            </div>
          ` : ""}

          <!-- BUTTON -->
          ${templateConfig.showDashboardButton ? `
            <div style="text-align:center;margin:10px 0 20px 0;">
              <a href="https://tishaledger.pages.dev" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:13.5px;padding:11px 24px;border-radius:8px;box-shadow:0 4px 14px rgba(99,102,241,0.35);">
                Open Live Payment Dashboard &rarr;
              </a>
            </div>
          ` : ""}

          <!-- FOOTER -->
          <div style="background:#f8fafc;padding:14px 18px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11.5px;color:#64748b;">
              ${templateConfig.footerText}
            </p>
            <p style="margin:3px 0 0 0;font-size:10.5px;color:#94a3b8;">
              Live Cloud Ledger powered by Supabase PostgreSQL
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
    `;

    // 3. DISPATCH METHOD:
    // Option A: Send via Own Google Account (Google Apps Script Webhook - No 3rd Party)
    if (dispatchMethod === "apps_script" && appsScriptUrl) {
      console.log(`Dispatching via user Google Apps Script Webhook: ${appsScriptUrl}`);
      const gasRes = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: targetRecipients,
          subject: subject,
          html: emailHTML,
          senderName: senderName
        })
      });

      let gasData: any = {};
      try {
        gasData = await gasRes.json();
      } catch (e) {
        gasData = { raw: await gasRes.text() };
      }

      if (!gasRes.ok || gasData.success === false) {
        throw new Error(`Google Apps Script error: ${gasData.error || JSON.stringify(gasData)}`);
      }

      return new Response(JSON.stringify({
        success: true,
        method: "apps_script",
        recipients: targetRecipients,
        subject,
        message: "Email dispatched directly through your own Google/Gmail account!",
        gasResponse: gasData,
        emailHTML: reqBody.isTest ? emailHTML : undefined
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Option B: Send via Resend Cloud API (if configured)
    if (resendApiKey) {
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Tisha LED Walls <onboarding@resend.dev>";
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: targetRecipients,
          subject: subject,
          html: emailHTML
        })
      });

      const resendData = await emailRes.json();
      if (!emailRes.ok) {
        throw new Error(`Resend email error: ${JSON.stringify(resendData)}`);
      }

      return new Response(JSON.stringify({
        success: true,
        method: "resend",
        emailId: resendData.id,
        recipients: targetRecipients,
        subject,
        emailHTML: reqBody.isTest ? emailHTML : undefined
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Fallback: If neither Apps Script Webhook nor Resend API Key is set
    return new Response(JSON.stringify({
      success: true,
      method: "preview_only",
      message: "Summary generated. Please configure Google Apps Script Webhook URL (to send from own ID) or RESEND_API_KEY.",
      summary: {
        totalBalanceDue,
        totalAdvancePaid,
        pendingCount,
        partialCount,
        subject
      },
      emailHTML
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});

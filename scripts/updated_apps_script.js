/**
 * TISHA LED WALLS - MIGRATED GOOGLE APPS SCRIPT
 * 
 * Directly queries your live Supabase PostgreSQL database instead of Google Sheets!
 * Runs on your existing weekly time-driven trigger in Google Apps Script.
 * Sends email from your personal Gmail (ms960000@gmail.com) with 100% zero third-party setup.
 */

const SUPABASE_CONFIG = {
  url: "https://dsyicahqdiavaidsjmvl.supabase.co",
  anonKey: "sb_publishable_1xz2VR6veUpoVGMxjtC18Q_1CRofOJn",
  recipientEmail: "ms960000@gmail.com"
};

function formatINR(val) {
  var n = Number(val) || 0;
  return n.toLocaleString("en-IN");
}

function formatCustomDate(d) {
  if (!d) return "—";
  var str = String(d).trim();
  if (str.includes("-") && str.length >= 10 && !str.includes("/")) {
    var parts = str.split("-");
    if (parts.length === 3) {
      return parts[2] + "/" + parts[1] + "/" + parts[0];
    }
  }
  return str;
}

function sendWeeklyEmailSummary() {
  // 1. Fetch live records directly from Supabase payment_ledger
  const apiUrl = SUPABASE_CONFIG.url + "/rest/v1/payment_ledger?select=*&order=date.desc";
  const response = UrlFetchApp.fetch(apiUrl, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_CONFIG.anonKey,
      "Authorization": "Bearer " + SUPABASE_CONFIG.anonKey
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    Logger.log("Failed to fetch ledger from Supabase: " + response.getContentText());
    return;
  }

  const rows = JSON.parse(response.getContentText());

  let totalBalanceDue = 0;
  let totalAdvancePaid = 0;
  let totalEventsValue = 0;
  let pendingCount = 0;
  let partialCount = 0;
  let rowsHTML = "";

  // 2. Process rows
  rows.forEach(function (row) {
    // Skip soft-deleted items if column exists
    if (row.is_deleted === true) return;

    const statusText = (row.status || "").toString().toLowerCase().trim();

    // Skip fully received payments
    if (statusText === "received") return;

    const totalAmt = Number(row.total_amount) || 0;
    let paidAmt = Number(row.paid_amount) || 0;
    let isPartial = false;

    if (statusText.includes("partial") || paidAmt > 0) {
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
    const note = (row.notes && !row.notes.startsWith("Imported")) ? row.notes : "";

    rowsHTML += `
      <tr style="border-bottom:1px solid #edf2f7;">
        <!-- Left Side: Client Info -->
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

        <!-- Right Side: Top-Aligned Amount Due -->
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
  });

  const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd MMM yyyy");

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
                  Financial Performance & Collections
                </div>
                <h1 style="margin:3px 0 0 0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
                  Tisha LED Walls
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

        <!-- KPI SUMMARY CARDS -->
        <div style="padding:18px 14px 8px 14px;">
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

        <!-- BREAKDOWN SECTION -->
        <div style="padding:12px 14px 20px 14px;">
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

          <!-- BUTTON -->
          <div style="text-align:center;margin-top:20px;">
            <a href="https://tishaledger.pages.dev" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:13.5px;padding:11px 24px;border-radius:8px;box-shadow:0 4px 14px rgba(99,102,241,0.35);">
              Open Live Payment Dashboard &rarr;
            </a>
          </div>

        </div>

        <!-- FOOTER -->
        <div style="background:#f8fafc;padding:14px 18px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11.5px;color:#64748b;">
            Tisha LED Walls • Automated Financial Operations Digest
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

  const subject = pendingCount > 0 
    ? `[Tisha LED Walls] Weekly Report: ₹${formatINR(totalBalanceDue)} Pending (${pendingCount} Events)`
    : `[Tisha LED Walls] Weekly Report: All Payments Cleared (₹0 Due)`;

  GmailApp.sendEmail(
    SUPABASE_CONFIG.recipientEmail,
    subject,
    "Your email client does not support HTML. Please view in a compatible email client.",
    { htmlBody: emailHTML }
  );
}

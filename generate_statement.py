import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Chase Bank Account Statement</title>
<style>
  @page {
    size: letter portrait;
    margin: 15mm 15mm 15mm 15mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a202c;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11px;
    line-height: 1.4;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0b2f6d;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .bank-logo {
    font-size: 24px;
    font-weight: 800;
    color: #0b2f6d;
    letter-spacing: -0.5px;
  }
  .bank-subtitle {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .statement-meta {
    text-align: right;
    font-size: 11px;
    color: #334155;
  }
  .statement-meta h1 {
    margin: 0 0 4px 0;
    font-size: 15px;
    color: #0b2f6d;
    font-weight: 700;
  }
  .account-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 16px;
    margin-bottom: 18px;
  }
  .card-box {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    background: #f8fafc;
  }
  .card-box h3 {
    margin: 0 0 6px 0;
    font-size: 11px;
    color: #0b2f6d;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .summary-table td {
    padding: 3px 0;
  }
  .summary-table td:last-child {
    text-align: right;
    font-weight: 600;
  }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #0b2f6d;
    background: #eef2f6;
    padding: 6px 10px;
    border-left: 4px solid #0b2f6d;
    margin: 16px 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .tx-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    margin-bottom: 12px;
  }
  .tx-table th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid #cbd5e1;
    font-size: 10px;
    text-transform: uppercase;
  }
  .tx-table td {
    padding: 5.5px 8px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
  }
  .tx-table tr:nth-child(even) td {
    background: #fafafa;
  }
  .tx-table td.amount {
    text-align: right;
    font-family: "Courier New", Courier, monospace;
    font-weight: 600;
  }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-bill { background: #fee2e2; color: #991b1b; }
  .badge-sub { background: #e0e7ff; color: #3730a3; }
  .badge-purchase { background: #f1f5f9; color: #475569; }
  .badge-income { background: #dcfce7; color: #166534; }
  .footer {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 9.5px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="bank-logo">CHASE <span style="font-size: 15px; font-weight: normal; color: #475569;">&bull; Total Checking&reg;</span></div>
      <div class="bank-subtitle">JPMorgan Chase Bank, N.A. &bull; Member FDIC</div>
    </div>
    <div class="statement-meta">
      <h1>ACCOUNT STATEMENT</h1>
      <div><strong>Statement Period:</strong> Oct 01, 2026 &ndash; Oct 25, 2026</div>
      <div><strong>Account Number:</strong> &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4821</div>
    </div>
  </div>

  <!-- ACCOUNT & SUMMARY CARDS -->
  <div class="account-grid">
    <div class="card-box">
      <h3>Account Holder</h3>
      <div style="font-weight: 700; font-size: 13px; color: #0f172a;">Ziyad Elmahi</div>
      <div style="color: #475569;">742 Evergreen Terrace, Apt 4B</div>
      <div style="color: #475569;">New York, NY 10001</div>
      <div style="margin-top: 6px; font-size: 10px; color: #64748b;">Primary Contact: byzizo@protonmail.com</div>
    </div>

    <div class="card-box">
      <h3>Monthly Activity Summary</h3>
      <table class="summary-table">
        <tr>
          <td>Starting Balance (Oct 01)</td>
          <td>$4,120.50</td>
        </tr>
        <tr>
          <td>Deposits & Other Additions</td>
          <td style="color: #166534;">+$3,400.00</td>
        </tr>
        <tr>
          <td>Recurring Bills & Utilities</td>
          <td style="color: #991b1b;">-$603.70</td>
        </tr>
        <tr>
          <td>Monthly Subscriptions</td>
          <td style="color: #3730a3;">-$126.94</td>
        </tr>
        <tr>
          <td>Store Purchases & Everyday Debit</td>
          <td>-$481.36</td>
        </tr>
        <tr style="border-top: 1px solid #cbd5e1;">
          <td style="font-weight: 700; padding-top: 4px;">Ending Balance (Oct 25)</td>
          <td style="font-weight: 700; font-size: 12px; color: #0b2f6d; padding-top: 4px;">$6,308.50</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- SECTION: RECURRING BILLS -->
  <div class="section-title">1. Scheduled Utility & Living Bills (Due Monthly)</div>
  <table class="tx-table">
    <thead>
      <tr>
        <th style="width: 75px;">Date</th>
        <th>Description / Payee</th>
        <th style="width: 110px;">Classification</th>
        <th style="width: 140px;">Reference / Note</th>
        <th style="width: 90px; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Oct 03, 2026</td>
        <td><strong>ConEdison Electric & Gas</strong></td>
        <td><span class="badge badge-bill">Utility Bill</span></td>
        <td>AutoPay ACH &bull; Acct #98124</td>
        <td class="amount">-$148.60</td>
      </tr>
      <tr>
        <td>Oct 08, 2026</td>
        <td><strong>Comcast Xfinity Internet</strong></td>
        <td><span class="badge badge-bill">Broadband</span></td>
        <td>Gigabit Fiber Service &bull; Autopay</td>
        <td class="amount">-$85.00</td>
      </tr>
      <tr>
        <td>Oct 12, 2026</td>
        <td><strong>GEICO Auto Insurance</strong></td>
        <td><span class="badge badge-bill">Insurance</span></td>
        <td>Policy Premium &bull; Ref #4418</td>
        <td class="amount">-$162.40</td>
      </tr>
      <tr>
        <td>Oct 18, 2026</td>
        <td><strong>City Water & Sewer Utility</strong></td>
        <td><span class="badge badge-bill">Municipal</span></td>
        <td>Monthly Residential Usage</td>
        <td class="amount">-$64.20</td>
      </tr>
      <tr>
        <td>Oct 22, 2026</td>
        <td><strong>AT&T Wireless Unlimited</strong></td>
        <td><span class="badge badge-bill">Phone Plan</span></td>
        <td>2 Lines Unlimited Elite</td>
        <td class="amount">-$95.50</td>
      </tr>
      <tr>
        <td>Oct 25, 2026</td>
        <td><strong>National Grid Heating Gas</strong></td>
        <td><span class="badge badge-bill">Utility Bill</span></td>
        <td>Monthly Billing &bull; ACH 0192</td>
        <td class="amount">-$48.00</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION: SUBSCRIPTIONS -->
  <div class="section-title">2. Active Recurring Subscriptions</div>
  <table class="tx-table">
    <thead>
      <tr>
        <th style="width: 75px;">Date</th>
        <th>Service Provider</th>
        <th style="width: 110px;">Classification</th>
        <th style="width: 140px;">Plan Tier</th>
        <th style="width: 90px; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Oct 02, 2026</td>
        <td><strong>Netflix.com</strong></td>
        <td><span class="badge badge-sub">Subscription</span></td>
        <td>Premium 4K HDR Family</td>
        <td class="amount">-$22.99</td>
      </tr>
      <tr>
        <td>Oct 05, 2026</td>
        <td><strong>Spotify USA</strong></td>
        <td><span class="badge badge-sub">Subscription</span></td>
        <td>Premium Duo Music Plan</td>
        <td class="amount">-$16.99</td>
      </tr>
      <tr>
        <td>Oct 07, 2026</td>
        <td><strong>Planet Fitness</strong></td>
        <td><span class="badge badge-sub">Subscription</span></td>
        <td>Black Card All-Access Gym</td>
        <td class="amount">-$24.99</td>
      </tr>
      <tr>
        <td>Oct 11, 2026</td>
        <td><strong>OpenAI ChatGPT Plus</strong></td>
        <td><span class="badge badge-sub">Subscription</span></td>
        <td>GPT-4o & Advanced Voice</td>
        <td class="amount">-$20.00</td>
      </tr>
      <tr>
        <td>Oct 15, 2026</td>
        <td><strong>Amazon Prime Monthly</strong></td>
        <td><span class="badge badge-sub">Subscription</span></td>
        <td>Free Delivery & Prime Video</td>
        <td class="amount">-$14.99</td>
      </tr>
      <tr>
        <td>Oct 19, 2026</td>
        <td><strong>Apple.com / iCloud 2TB</strong></td>
        <td><span class="badge badge-sub">Subscription</span></td>
        <td>Cloud Storage Family Share</td>
        <td class="amount">-$9.99</td>
      </tr>
      <tr>
        <td>Oct 23, 2026</td>
        <td><strong>YouTube Premium</strong></td>
        <td><span class="badge badge-sub">Subscription</span></td>
        <td>Ad-Free Video & Music</td>
        <td class="amount">-$16.99</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION: EVERYDAY PURCHASES -->
  <div class="section-title">3. Everyday Point-of-Sale Store Purchases</div>
  <table class="tx-table">
    <thead>
      <tr>
        <th style="width: 75px;">Date</th>
        <th>Merchant Name & Location</th>
        <th style="width: 110px;">Category</th>
        <th style="width: 140px;">Payment Method</th>
        <th style="width: 90px; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Oct 01, 2026</td>
        <td><strong>Employer Payroll Direct Deposit</strong></td>
        <td><span class="badge badge-income">Income</span></td>
        <td>ACH Credit &bull; Ref #90184</td>
        <td class="amount" style="color: #166534;">+$3,400.00</td>
      </tr>
      <tr>
        <td>Oct 02, 2026</td>
        <td><strong>Trader Joe's #542</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Groceries</span></td>
        <td>Debit Card &bull; Pos #1820</td>
        <td class="amount">-$78.45</td>
      </tr>
      <tr>
        <td>Oct 04, 2026</td>
        <td><strong>Shell Oil 57384</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Gas & Fuel</span></td>
        <td>Debit Card &bull; Pump 04</td>
        <td class="amount">-$46.20</td>
      </tr>
      <tr>
        <td>Oct 06, 2026</td>
        <td><strong>Starbucks Coffee #1842</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Dining</span></td>
        <td>Contactless Apple Pay</td>
        <td class="amount">-$6.85</td>
      </tr>
      <tr>
        <td>Oct 09, 2026</td>
        <td><strong>Target Store T-2410</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Merchandise</span></td>
        <td>Debit Card &bull; Register 08</td>
        <td class="amount">-$53.12</td>
      </tr>
      <tr>
        <td>Oct 13, 2026</td>
        <td><strong>Chipotle Mexican Grill</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Dining</span></td>
        <td>In-Store POS</td>
        <td class="amount">-$15.40</td>
      </tr>
      <tr>
        <td>Oct 16, 2026</td>
        <td><strong>CVS Pharmacy #3412</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Pharmacy</span></td>
        <td>Debit Card &bull; Pos #02</td>
        <td class="amount">-$28.75</td>
      </tr>
      <tr>
        <td>Oct 17, 2026</td>
        <td><strong>Uber Technologies Inc</strong> &bull; San Francisco CA</td>
        <td><span class="badge badge-purchase">Transit</span></td>
        <td>In-App Mobile Payment</td>
        <td class="amount">-$24.60</td>
      </tr>
      <tr>
        <td>Oct 20, 2026</td>
        <td><strong>Whole Foods Market #102</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Groceries</span></td>
        <td>Debit Card &bull; Register 03</td>
        <td class="amount">-$89.30</td>
      </tr>
      <tr>
        <td>Oct 23, 2026</td>
        <td><strong>The Home Depot #1294</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Home Improv</span></td>
        <td>Debit Card &bull; Pos #14</td>
        <td class="amount">-$62.80</td>
      </tr>
      <tr>
        <td>Oct 25, 2026</td>
        <td><strong>Best Buy #0452</strong> &bull; New York NY</td>
        <td><span class="badge badge-purchase">Electronics</span></td>
        <td>Debit Card &bull; Register 05</td>
        <td class="amount">-$75.89</td>
      </tr>
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    <div>Questions? Call Chase 24/7 Support at 1-800-935-9935 or visit chase.com</div>
    <div>Page 1 of 1 &bull; Document ID: CHASE-STMT-2026-10-4821</div>
  </div>

</body>
</html>
"""

temp_html = r"C:\Users\zkid1\.gemini\antigravity\scratch\family-finance-app\statement_sample.html"
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_content)

desktop_dir = os.path.expanduser(r"~\OneDrive\Desktop")
if not os.path.exists(desktop_dir):
    desktop_dir = os.path.expanduser(r"~\Desktop")

pdf_path = os.path.join(desktop_dir, "Chase_Bank_Statement_October_2026.pdf")
png_path = os.path.join(desktop_dir, "Chase_Bank_Statement_October_2026.png")

# Also copy to local Desktop if both exist
alt_desktop = r"C:\Users\zkid1\Desktop"
if os.path.exists(alt_desktop) and alt_desktop.lower() != desktop_dir.lower():
    alt_pdf = os.path.join(alt_desktop, "Chase_Bank_Statement_October_2026.pdf")
else:
    alt_pdf = None

# Use Edge or Chrome headless to render to PDF and PNG screenshot
msedge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
chrome_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
browser_exe = msedge_exe if os.path.exists(msedge_exe) else chrome_exe

# 1. Print to PDF
cmd_pdf = [
    browser_exe,
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={pdf_path}",
    temp_html
]
subprocess.run(cmd_pdf, check=True)
print(f"Created PDF: {pdf_path}")

# 2. Screenshot to PNG (so user can view or paste into chat immediately)
cmd_png = [
    browser_exe,
    "--headless",
    "--disable-gpu",
    "--window-size=1050,1400",
    f"--screenshot={png_path}",
    temp_html
]
subprocess.run(cmd_png, check=True)
print(f"Created PNG: {png_path}")

if alt_pdf:
    import shutil
    shutil.copy(pdf_path, alt_pdf)
    print(f"Copied PDF to: {alt_pdf}")

import { Customer } from '../types';

const STORAGE_KEY = 'palaniyandavar_finance_records_v2';
const AUTH_KEY = 'palaniyandavar_finance_auth_v1';
const LOCAL_PC_DB_KEY = 'palaniyandavar_finance_pc_db_url_v1';
const LAST_SAVED_KEY = 'palaniyandavar_finance_last_saved_time_v1';
const LINKED_PC_FILE_NAME_KEY = 'palaniyandavar_finance_linked_pc_file_name_v1';

let activePcFileHandle: any = null;

export const DEFAULT_CREDENTIALS = {
  username: 'admin',
  password: '123',
};

// Fresh clean start - no demo data
export const INITIAL_CUSTOMERS: Customer[] = [];

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

export function getLinkedPcFileName(): string | null {
  return localStorage.getItem(LINKED_PC_FILE_NAME_KEY);
}

export async function linkLocalPcFile(customers: Customer[]): Promise<{ success: boolean; filename?: string; error?: string }> {
  if (!isFileSystemAccessSupported()) {
    return { 
      success: false, 
      error: 'Direct PC File Access is supported in Google Chrome & Microsoft Edge on PC/Laptop.' 
    };
  }

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'Palaniyandavar_Finance_PC_Database.json',
      types: [{
        description: 'JSON Database File',
        accept: { 'application/json': ['.json'] },
      }],
    });
    activePcFileHandle = handle;
    localStorage.setItem(LINKED_PC_FILE_NAME_KEY, handle.name);
    // Write current data immediately into this newly chosen PC file
    await saveToLinkedPcFile(customers);
    return { success: true, filename: handle.name };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'File selection was cancelled.' };
    }
    return { success: false, error: err.message || 'Failed to select PC file' };
  }
}

export function unlinkPcFile(): void {
  activePcFileHandle = null;
  localStorage.removeItem(LINKED_PC_FILE_NAME_KEY);
}

export async function saveToLinkedPcFile(customers: Customer[]): Promise<boolean> {
  if (!activePcFileHandle) return false;
  try {
    const writable = await activePcFileHandle.createWritable();
    const payload = JSON.stringify({
      appName: 'Palaniyandavar Finance',
      savedAt: new Date().toISOString(),
      totalCustomers: customers.length,
      customers,
    }, null, 2);
    await writable.write(payload);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Could not auto-write to linked PC file:', err);
    return false;
  }
}

export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading customers from localStorage:', err);
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    localStorage.setItem(LAST_SAVED_KEY, new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    // 1. Auto-save directly into linked PC file on the hard drive if connected
    if (activePcFileHandle) {
      saveToLinkedPcFile(customers);
    }

    // 2. Auto-sync to local PC Database server if configured
    const pcUrl = getLocalPcDbUrl();
    if (pcUrl) {
      syncToLocalPcDb(customers, pcUrl).catch(() => {});
    }
  } catch (err) {
    console.error('Error saving customers to localStorage:', err);
  }
}

export function getLastSavedTime(): string {
  return localStorage.getItem(LAST_SAVED_KEY) || 'Just now';
}

export function clearAllStoredCustomers(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Error clearing customers:', err);
  }
}

export function getLocalPcDbUrl(): string {
  return localStorage.getItem(LOCAL_PC_DB_KEY) || 'https://wild-ravens-bathe.loca.lt/api/save_db';
}

export function setLocalPcDbUrl(url: string): void {
  localStorage.setItem(LOCAL_PC_DB_KEY, url.trim());
}

/**
 * 1-Click Download PC Database Backup (JSON format)
 * Saves directly into the user's PC Downloads / Documents folder
 */
export function exportBackupJSON(customers: Customer[]): void {
  const data = {
    appName: 'Palaniyandavar Finance',
    exportedAt: new Date().toISOString(),
    totalCustomers: customers.length,
    customers,
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const now = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('download', `Palaniyandavar_Finance_PC_DB_Backup_${now}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export as CSV for Microsoft Excel / Google Sheets / PC Database import
 */
export function exportBackupCSV(customers: Customer[]): void {
  const headers = [
    'Customer ID',
    'Name',
    'Phone',
    'Village',
    'Loan Type',
    'Principal Given',
    'Starting Balance',
    'Weekly Due',
    'Tenure Weeks',
    'Start Date',
    'Status',
    'Total Paid',
    'Remaining Balance',
    'Transactions Count',
  ];

  const rows = customers.map((c) => {
    const isWeekly = c.loanType === 'weekly';
    const totalPaid = (c.transactions || []).reduce((acc, t) => acc + (t.isMissedWeek ? 0 : Number(t.amountPaid || 0)), 0);
    const startingBalance = c.initialBalance ?? (isWeekly ? (c.totalPayableAmount || c.principalAmount) : c.principalAmount);
    const remaining = Math.max(0, startingBalance - totalPaid);

    return [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.village.replace(/"/g, '""')}"`,
      `"${c.loanType}"`,
      c.principalAmount || 0,
      startingBalance || 0,
      c.weeklyDueAmount || 0,
      c.tenureWeeks || 0,
      `"${c.startDate}"`,
      `"${c.status}"`,
      totalPaid,
      remaining,
      (c.transactions || []).length,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `Palaniyandavar_Finance_PC_Excel_${now}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generate full MySQL dump (.sql) for PC MySQL database (phpMyAdmin / MySQL Workbench / CLI)
 */
export function exportBackupSQL(customers: Customer[]): void {
  const now = new Date().toISOString().split('T')[0];
  let sql = `-- ========================================================\n`;
  sql += `-- Palaniyandavar Finance - MySQL Database Backup Dump\n`;
  sql += `-- Export Date: ${new Date().toISOString()}\n`;
  sql += `-- Total Customers: ${customers.length}\n`;
  sql += `-- ========================================================\n\n`;
  
  sql += `CREATE DATABASE IF NOT EXISTS \`palaniyandavar_finance\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
  sql += `USE \`palaniyandavar_finance\`;\n\n`;

  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`customers\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`customers\` (\n`;
  sql += `  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`phone\` VARCHAR(32) NOT NULL,\n`;
  sql += `  \`village\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`principal_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  \`starting_balance\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  \`weekly_due_amount\` DECIMAL(12, 2) DEFAULT NULL,\n`;
  sql += `  \`tenure_weeks\` INT DEFAULT 10,\n`;
  sql += `  \`interest_rate\` DECIMAL(6, 2) DEFAULT 2.00,\n`;
  sql += `  \`loan_type\` VARCHAR(32) NOT NULL DEFAULT 'weekly',\n`;
  sql += `  \`start_date\` DATE NOT NULL,\n`;
  sql += `  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',\n`;
  sql += `  \`notes\` TEXT DEFAULT NULL,\n`;
  sql += `  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`transactions\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`transactions\` (\n`;
  sql += `  \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,\n`;
  sql += `  \`customer_id\` VARCHAR(64) NOT NULL,\n`;
  sql += `  \`date\` DATE NOT NULL,\n`;
  sql += `  \`amount_paid\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  \`interest_portion\` DECIMAL(12, 2) DEFAULT 0.00,\n`;
  sql += `  \`principal_portion\` DECIMAL(12, 2) DEFAULT 0.00,\n`;
  sql += `  \`balance_after\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,\n`;
  sql += `  \`payment_mode\` VARCHAR(32) NOT NULL DEFAULT 'cash',\n`;
  sql += `  \`is_missed_week\` TINYINT(1) DEFAULT 0,\n`;
  sql += `  \`notes\` TEXT DEFAULT NULL,\n`;
  sql += `  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  INDEX \`idx_customer_id\` (\`customer_id\`),\n`;
  sql += `  INDEX \`idx_tx_date\` (\`date\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Dumping data for table \`customers\` & \`transactions\`\n`;
  sql += `-- (Using REPLACE INTO so repeated imports update existing rows safely)\n`;
  sql += `-- --------------------------------------------------------\n\n`;

  customers.forEach((c) => {
    const isWeekly = c.loanType === 'weekly';
    const startingBalance = c.initialBalance ?? (isWeekly ? (c.totalPayableAmount || c.principalAmount) : c.principalAmount);
    const safeName = c.name.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const safeVillage = c.village.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const safeNotes = (c.notes || '').replace(/\\/g, '\\\\').replace(/'/g, "''");
    const weeklyDue = c.weeklyDueAmount !== undefined ? c.weeklyDueAmount : 'NULL';
    const tenure = c.tenureWeeks || 10;
    const rate = c.interestRate || 2.0;

    sql += `REPLACE INTO \`customers\` (\`id\`, \`name\`, \`phone\`, \`village\`, \`principal_amount\`, \`starting_balance\`, \`weekly_due_amount\`, \`tenure_weeks\`, \`interest_rate\`, \`loan_type\`, \`start_date\`, \`status\`, \`notes\`) VALUES ('${c.id}', '${safeName}', '${c.phone}', '${safeVillage}', ${c.principalAmount}, ${startingBalance}, ${weeklyDue}, ${tenure}, ${rate}, '${c.loanType}', '${c.startDate}', '${c.status}', '${safeNotes}');\n`;

    (c.transactions || []).forEach((t) => {
      const safeTxNotes = (t.notes || '').replace(/\\/g, '\\\\').replace(/'/g, "''");
      const isMissed = t.isMissedWeek ? 1 : 0;
      sql += `REPLACE INTO \`transactions\` (\`id\`, \`customer_id\`, \`date\`, \`amount_paid\`, \`interest_portion\`, \`principal_portion\`, \`balance_after\`, \`payment_mode\`, \`is_missed_week\`, \`notes\`) VALUES ('${t.id}', '${c.id}', '${t.date}', ${t.amountPaid || 0}, ${t.interestPortion || 0}, ${t.principalPortion || 0}, ${t.balanceAfter || 0}, '${t.paymentMode || 'cash'}', ${isMissed}, '${safeTxNotes}');\n`;
    });
  });

  const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Palaniyandavar_Finance_MySQL_Backup_${now}.sql`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a ready-to-run Python script that directly connects to MySQL on localhost
 * and syncs all entries automatically into the MySQL database tables.
 */
export function downloadMySqlSyncScript(): void {
  const pythonScript = `"""
========================================================================
Palaniyandavar Finance - Live MySQL Database Sync Bridge
========================================================================
Connects directly to your local PC MySQL database (MySQL Server / MariaDB).
Whenever the finance web app records payments or customers, this script
saves them directly into your local MySQL tables in real time!

------------------------------------------------------------------------
STEP 1: Install requirements:
  pip install flask flask-cors pymysql

STEP 2: Run this script:
  python mysql_sync_server.py

STEP 3: Open your browser at:
  http://localhost:5000
  (You can enter your MySQL password right in the browser if requested!)
========================================================================
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import pymysql
import json
import datetime
import os

app = Flask(__name__)
CORS(app)

CONFIG_FILE = "mysql_config.json"

# Default configuration
config = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "palaniyandavar_finance"
}

# Load saved config if exists
if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            saved_config = json.load(f)
            config.update(saved_config)
    except Exception as e:
        print(f"Notice: Could not read {CONFIG_FILE}: {e}")

def save_config():
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")

def get_db_connection():
    conn = pymysql.connect(
        host=config["host"],
        port=int(config["port"]),
        user=config["user"],
        password=config["password"],
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )
    with conn.cursor() as cursor:
        db_name = config["database"]
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS \`{db_name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        cursor.execute(f"USE \`{db_name}\`;")
        
        # Create customers table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS \`customers\` (
            \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
            \`name\` VARCHAR(255) NOT NULL,
            \`phone\` VARCHAR(32) NOT NULL,
            \`village\` VARCHAR(255) NOT NULL,
            \`principal_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
            \`starting_balance\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
            \`weekly_due_amount\` DECIMAL(12, 2) DEFAULT NULL,
            \`tenure_weeks\` INT DEFAULT 10,
            \`interest_rate\` DECIMAL(6, 2) DEFAULT 2.00,
            \`loan_type\` VARCHAR(32) NOT NULL DEFAULT 'weekly',
            \`start_date\` DATE NOT NULL,
            \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
            \`notes\` TEXT DEFAULT NULL,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        
        # Create transactions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS \`transactions\` (
            \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
            \`customer_id\` VARCHAR(64) NOT NULL,
            \`date\` DATE NOT NULL,
            \`amount_paid\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
            \`interest_portion\` DECIMAL(12, 2) DEFAULT 0.00,
            \`principal_portion\` DECIMAL(12, 2) DEFAULT 0.00,
            \`balance_after\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
            \`payment_mode\` VARCHAR(32) NOT NULL DEFAULT 'cash',
            \`is_missed_week\` TINYINT(1) DEFAULT 0,
            \`notes\` TEXT DEFAULT NULL,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX \`idx_customer_id\` (\`customer_id\`),
            INDEX \`idx_tx_date\` (\`date\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
    return conn

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="ta">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Palaniyandavar Finance - MySQL Sync Server</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 text-slate-800 font-sans p-4 sm:p-8">
  <div class="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
    <!-- Header -->
    <div class="bg-indigo-600 text-white p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl sm:text-2xl font-black">Palaniyandavar Finance</h1>
          <p class="text-indigo-200 text-xs mt-1">Local PC MySQL Database Sync Bridge</p>
        </div>
        {% if is_connected %}
          <span class="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
            ● MySQL Connected
          </span>
        {% else %}
          <span class="px-3 py-1 bg-amber-400 text-amber-950 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
            ▲ Needs Password
          </span>
        {% endif %}
      </div>
    </div>

    <div class="p-6 space-y-6">
      {% if message %}
        <div class="p-3.5 rounded-2xl text-xs font-semibold {{ 'bg-emerald-50 border border-emerald-300 text-emerald-900' if is_connected else 'bg-amber-50 border border-amber-300 text-amber-900' }}">
          {{ message }}
        </div>
      {% endif %}

      <!-- Sync Endpoint Card -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          App Settings Sync URL (செயலியில் கொடுக்க வேண்டிய URL):
        </label>
        <div class="flex items-center gap-2 mt-1">
          <input type="text" readonly value="http://localhost:5000/api/save_db" class="w-full bg-white border border-slate-300 text-indigo-700 font-mono text-sm px-3.5 py-2.5 rounded-xl font-bold select-all focus:outline-none">
        </div>
        <p class="text-[11px] text-slate-500 mt-2">
          👉 செயலியில் <strong>Settings > Local MySQL Sync URL</strong> கட்டத்தில் இந்த URL-ஐ உள்ளிட்டு <strong>"Sync Now"</strong> கொடுத்தால் போதுமானது!
        </p>
      </div>

      <!-- MySQL Stats -->
      {% if is_connected %}
      <div class="grid grid-cols-2 gap-3">
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <span class="text-xs text-emerald-800 font-bold block">MySQL Database</span>
          <span class="text-lg font-black text-emerald-900 block mt-1">{{ config.database }}</span>
          <span class="text-[10px] text-emerald-700">Port {{ config.port }}</span>
        </div>
        <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <span class="text-xs text-indigo-800 font-bold block">Current Customers in MySQL</span>
          <span class="text-lg font-black text-indigo-900 block mt-1">{{ customer_count }}</span>
          <span class="text-[10px] text-indigo-700">Transactions: {{ tx_count }}</span>
        </div>
      </div>
      {% endif %}

      <!-- MySQL Settings Form -->
      <form method="POST" action="/update_config" class="border border-slate-200 rounded-2xl p-5 space-y-4">
        <h2 class="text-sm font-bold text-slate-900 flex items-center justify-between">
          <span>MySQL Connection Settings (பாஸ்வேர்ட் மாற்றம்)</span>
          <span class="text-[11px] font-normal text-slate-500">Standalone MySQL / Workbench / XAMPP</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Host:</label>
            <input type="text" name="host" value="{{ config.host }}" class="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Port:</label>
            <input type="number" name="port" value="{{ config.port }}" class="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Username:</label>
            <input type="text" name="user" value="{{ config.user }}" class="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">MySQL Password (ரூட் பாஸ்வேர்ட்):</label>
            <input type="password" name="password" value="{{ config.password }}" placeholder="Enter your MySQL password" class="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500">
          </div>

          <div class="sm:col-span-2">
            <label class="block font-semibold text-slate-700 mb-1">Database Name:</label>
            <input type="text" name="database" value="{{ config.database }}" class="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer">
          💾 Save & Connect to MySQL (இணைக்கவும்)
        </button>
      </form>
    </div>
  </div>
</body>
</html>
"""

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        return save_db()

    is_connected = False
    message = None
    customer_count = 0
    tx_count = 0

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as cnt FROM customers;")
            customer_count = cursor.fetchone()['cnt']
            cursor.execute("SELECT COUNT(*) as cnt FROM transactions;")
            tx_count = cursor.fetchone()['cnt']
        conn.close()
        is_connected = True
        message = f"Connected successfully to MySQL! Database '{config['database']}' is ready."
    except Exception as e:
        is_connected = False
        message = f"Could not connect to MySQL: {e}. Please enter your MySQL password below and click Save & Connect."

    return render_template_string(
        DASHBOARD_HTML,
        is_connected=is_connected,
        message=message,
        config=config,
        customer_count=customer_count,
        tx_count=tx_count
    )

@app.route('/update_config', methods=['POST'])
def update_config():
    config["host"] = request.form.get("host", "localhost").strip()
    config["port"] = int(request.form.get("port", 3306))
    config["user"] = request.form.get("user", "root").strip()
    config["password"] = request.form.get("password", "")
    config["database"] = request.form.get("database", "palaniyandavar_finance").strip()
    save_config()
    return index()

@app.route('/api/save_db', methods=['POST'])
def save_db():
    try:
        data = request.json or {}
        customers = data.get('customers', [])
        
        conn = get_db_connection()
        with conn.cursor() as cursor:
            for c in customers:
                principal = float(c.get('principalAmount', 0))
                is_weekly = c.get('loanType') == 'weekly'
                starting_bal = float(c.get('initialBalance') if c.get('initialBalance') is not None else (c.get('totalPayableAmount') or principal))
                weekly_due = c.get('weeklyDueAmount')
                tenure = c.get('tenureWeeks', 10)
                rate = float(c.get('interestRate', 2.0))
                
                cursor.execute("""
                REPLACE INTO customers (
                    id, name, phone, village, principal_amount, starting_balance,
                    weekly_due_amount, tenure_weeks, interest_rate, loan_type,
                    start_date, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    c.get('id'), c.get('name', ''), c.get('phone', ''), c.get('village', 'General'),
                    principal, starting_bal, weekly_due, tenure, rate, c.get('loanType', 'weekly'),
                    c.get('startDate', str(datetime.date.today())), c.get('status', 'active'), c.get('notes', '')
                ))
                
                # Insert / replace transactions
                for t in c.get('transactions', []):
                    cursor.execute("""
                    REPLACE INTO transactions (
                        id, customer_id, date, amount_paid, interest_portion,
                        principal_portion, balance_after, payment_mode, is_missed_week, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        t.get('id'), c.get('id'), t.get('date', str(datetime.date.today())),
                        float(t.get('amountPaid', 0)), float(t.get('interestPortion', 0)),
                        float(t.get('principalPortion', 0)), float(t.get('balanceAfter', 0)),
                        t.get('paymentMode', 'cash'), 1 if t.get('isMissedWeek') else 0, t.get('notes', '')
                    ))

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] Successfully synced {len(customers)} customers to MySQL ({config['database']})!")
        return jsonify({
            "success": True,
            "message": f"Successfully saved {len(customers)} customers directly to MySQL database!",
            "timestamp": now_str
        })
    except Exception as e:
        print(f"MySQL Sync Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/get_db', methods=['GET'])
def get_db():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM customers")
            customers = cursor.fetchall()
            cursor.execute("SELECT * FROM transactions")
            transactions = cursor.fetchall()
            
            # Map transactions to customers
            tx_map = {}
            for t in transactions:
                cid = t['customer_id']
                if cid not in tx_map:
                    tx_map[cid] = []
                tx_map[cid].append(t)
                
            for c in customers:
                c['transactions'] = tx_map.get(c['id'], [])
                
            return jsonify({"customers": customers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("==========================================================")
    print("Palaniyandavar Finance - Local PC MySQL Sync Bridge Active")
    print(f"Target Database: {config['database']} on {config['host']}:{config['port']}")
    print("Web Dashboard:  http://localhost:5000")
    print("Sync Endpoint:  http://localhost:5000/api/save_db")
    print("Press Ctrl+C to stop.")
    print("==========================================================")
    
    # Try initial connection
    try:
        conn = get_db_connection()
        conn.close()
        print("Connected to MySQL successfully!")
    except pymysql.err.OperationalError as e:
        if e.args[0] == 1045:
            print("\n[!] MySQL root password required.")
            print("[!] Please open http://localhost:5000 in your browser to enter your password.")
            print("    Or you can enter it right now below:")
            import getpass
            try:
                entered_pwd = getpass.getpass("Enter MySQL root password (or press Enter to skip): ")
                if entered_pwd:
                    config["password"] = entered_pwd
                    save_config()
                    conn = get_db_connection()
                    conn.close()
                    print("Connected to MySQL successfully!")
            except Exception as inner_e:
                print(f"Notice: {inner_e}. You can set password at http://localhost:5000")
        else:
            print(f"WARNING: Could not connect to MySQL: {e}")
            print("Please open http://localhost:5000 to configure.")

    app.run(host='0.0.0.0', port=5000, debug=False)
`;

  const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mysql_sync_server.py`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Optional Direct Sync to local PC database server
 * (e.g. if the user runs a local server or secure tunnel)
 */
export async function syncToLocalPcDb(customers: Customer[], targetUrl: string): Promise<{ success: boolean; message: string }> {
  let cleanUrl = targetUrl.trim();
  if (!cleanUrl) {
    return { success: false, message: 'Please enter your Local PC Server URL first (e.g., https://your-tunnel.loca.lt/api/save_db)' };
  }

  // Auto-normalize URL: if user entered tunnel URL without /api/save_db, auto-append /api/save_db!
  try {
    const parsed = new URL(cleanUrl);
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
      parsed.pathname = '/api/save_db';
      cleanUrl = parsed.toString();
    }
  } catch {
    if (!cleanUrl.includes('/api/save_db') && !cleanUrl.includes('/api/backup')) {
      cleanUrl = cleanUrl.replace(/\/+$/, '') + '/api/save_db';
    }
  }

  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        customerCount: customers.length,
        customers,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Successfully synced and saved data directly to PC MySQL database!' };
    } else if (response.status === 405) {
      return {
        success: false,
        message: '405 Method Not Allowed: URL-ன் முடிவில் "/api/save_db" சேர்க்கப்பட வேண்டும் (எடுத்துக்காட்டாக: https://xxxx.loca.lt/api/save_db).'
      };
    } else if (response.status === 511) {
      return { 
        success: false, 
        message: '511 Authentication Required: Localtunnel-ன் ஒருமுறை பாதுகாப்பு உறுதிப்படுத்தல் தேவைப்படுகிறது. உங்கள் மொபைல் பிரவுசரில் அந்த URL-ஐ (எ.கா: https://...loca.lt) ஒரு முறை திறந்து "Click to Continue" / Submit அழுத்தவும். அல்லது மிக எளிய வழியாக மேலே உள்ள "வாட்ஸ்அப் மூலம் ஓனருக்கு பேக்கப் அனுப்பு" பட்டனைப் பயன்படுத்தவும்.' 
      };
    } else {
      return { success: false, message: `PC server responded with error: ${response.status} ${response.statusText}` };
    }
  } catch (err: any) {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isTargetHttp = targetUrl.startsWith('http://');
    const isLocalhost = targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');

    let helpMsg = '';
    if (isLocalhost) {
      helpMsg = 'கிளைன்ட் மொபைலில் இருக்கும்போது "localhost" வேலை செய்யாது (ஏனெனில் உங்கள் PC சர்வர் கிளைன்ட்டின் போனில் இல்லை). மேலும் HTTPS செயலியில் இருந்து HTTP URL-ஐ மொபைல் பிரவுசர் தடுக்கிறது. இதற்கு: 1) கிளைன்ட் "WhatsApp வழியே ஓனருக்கு பேக்கப் அனுப்பு" பட்டனை அழுத்தலாம், அல்லது 2) உங்கள் PC-யில் "npx localtunnel --port 5000" இயக்கி கிடைக்கும் HTTPS URL-ஐ Sync URL-ல் போடலாம்.';
    } else if (isHttps && isTargetHttp) {
      helpMsg = 'மொபைல் பிரவுசர்கள் HTTPS செயலியில் இருந்து சாதாரண HTTP URL-ஐ பிளாக் செய்யும் (Mixed Content Error). உங்கள் PC-யில் "npx localtunnel --port 5000" இயக்கி கிடைக்கும் HTTPS URL-ஐ Sync URL-ல் உள்ளிடவும்.';
    } else {
      helpMsg = `Could not connect to PC database server (${err.message || 'Connection refused'}). Make sure your PC database script is running, or use WhatsApp Share below.`;
    }

    return { 
      success: false, 
      message: helpMsg 
    };
  }
}

/**
 * Share entire database backup to owner via WhatsApp (ideal when client is on mobile)
 */
export async function shareBackupViaWhatsApp(customers: Customer[], ownerPhone: string = ''): Promise<void> {
  const now = new Date().toISOString().split('T')[0];
  const totalCollections = customers.reduce((sum, c) => sum + (c.transactions || []).reduce((tSum, t) => tSum + (t.isMissedWeek ? 0 : Number(t.amountPaid || 0)), 0), 0);
  
  const backupData = {
    appName: 'Palaniyandavar Finance',
    exportDate: new Date().toISOString(),
    totalCustomers: customers.length,
    totalCollections,
    customers,
  };
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const file = new File([blob], `Palaniyandavar_Finance_Backup_${now}.json`, { type: 'application/json' });

  // If mobile supports Web Share with files, share file directly!
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Palaniyandavar Finance Backup',
        text: `Palaniyandavar Finance Backup - ${now} (Customers: ${customers.length}, Collections: Rs. ${totalCollections.toLocaleString('en-IN')})`,
        files: [file],
      });
      return;
    } catch {
      // User cancelled or share dismissed
    }
  }

  // Fallback: Trigger instant download and open WhatsApp to send summary
  exportBackupJSON(customers);
  const summaryMsg = `*Palaniyandavar Finance Daily Backup*\nதேதி: ${now}\nமொத்த வாடிக்கையாளர்கள்: ${customers.length}\nமொத்த வசூல்: Rs. ${totalCollections.toLocaleString('en-IN')}\n\nபேக்கப் பைல் டவுன்லோட் செய்யப்பட்டுள்ளது. PC-யில் Restore செய்துகொள்ளவும்.`;
  const cleanPhone = ownerPhone.replace(/\D/g, '');
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(summaryMsg)}` 
    : `https://wa.me/?text=${encodeURIComponent(summaryMsg)}`;
  window.open(waUrl, '_blank');
}

export function importBackupJSON(file: File, onSuccess: (data: Customer[]) => void, onError: (err: string) => void): void {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const json = JSON.parse(event.target?.result as string);
      if (Array.isArray(json)) {
        saveCustomers(json);
        onSuccess(json);
      } else {
        onError('Invalid file format. Must be an array of customers.');
      }
    } catch {
      onError('Failed to parse JSON file.');
    }
  };
  reader.onerror = () => onError('Failed to read file.');
  reader.readAsText(file);
}

export function getStoredAuthCredentials(): { username: string; password: string } {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(DEFAULT_CREDENTIALS));
      return DEFAULT_CREDENTIALS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CREDENTIALS;
  }
}

export function saveAuthCredentials(creds: { username: string; password: string }): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error('Failed to save auth creds:', err);
  }
}

/**
 * Downloads a ready-to-run 1-file Python background server script (local_pc_server.py)
 * that users can run on their PC to save all app data locally automatically.
 */
export function downloadLocalPcServerScript(): void {
  const pythonScript = `"""
Palaniyandavar Finance - Local PC Background Database Server
Run this on your PC to auto-receive and save all finance entries from your mobile or PC browser.

Requirements:
  pip install flask flask-cors

To run:
  python local_pc_server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import datetime
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the web app

BACKUP_FILE = "palaniyandavar_pc_database.json"

@app.route('/api/save_db', methods=['POST'])
def save_db():
    try:
        data = request.json
        with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        count = data.get('customerCount', len(data.get('customers', [])))
        print(f"[{now}] Successfully saved {count} customers to {BACKUP_FILE} on PC!")
        
        return jsonify({"success": True, "message": "Saved to PC hard drive", "time": now})
    except Exception as e:
        print(f"Error saving to PC: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/get_db', methods=['GET'])
def get_db():
    if os.path.exists(BACKUP_FILE):
        with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify({"customers": []})

if __name__ == '__main__':
    print("==================================================")
    print("Palaniyandavar Finance PC Database Server Running!")
    print("Server URL for app: http://localhost:5000/api/save_db")
    print("Listening on port 5000...")
    print("==================================================")
    app.run(host='0.0.0.0', port=5000, debug=False)
`;

  const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `local_pc_server.py`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


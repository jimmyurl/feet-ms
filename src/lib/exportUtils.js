import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Shared config per app ──────────────────────────────────
const APP_CONFIG = {
  fleetms: {
    name:     'FleetMS – Fleet Management System',
    org:      'Fleet Management',
    color:    [29, 78, 216],   // #1D4ED8 blue
    accent:   [14, 165, 233],  // #0EA5E9
  },
  erp: {
    name:     'POY Dev ERP System',
    org:      'Power of Youth Development – Mwanza',
    color:    [196, 98, 45],   // #c4622d orange
    accent:   [45, 124, 90],   // #2d7d5a green
  },
  vaultis: {
    name:     'Vaultis Inventory Management',
    org:      'Vaultis',
    color:    [196, 75, 49],   // #C84B31 red
    accent:   [45, 124, 90],
  },
};

// ── Helpers ───────────────────────────────────────────────
function fmtTZS(amount) {
  if (amount == null || amount === '') return '—';
  return 'TZS ' + Number(amount).toLocaleString('en-TZ', { minimumFractionDigits: 0 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function today() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function nowTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
}

// ── PDF base builder ──────────────────────────────────────
function createPDFBase(appKey, title, subtitle = '') {
  const cfg = APP_CONFIG[appKey] || APP_CONFIG.erp;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(...cfg.color);
  doc.rect(0, 0, W, 22, 'F');

  // App name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(cfg.name, 14, 10);

  // Org name
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(cfg.org, 14, 16);

  // Date top-right
  doc.setFontSize(8);
  doc.text(`Generated: ${today()}`, W - 14, 13, { align: 'right' });

  // Title
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 14, 40);
  }

  // Thin accent line
  doc.setDrawColor(...cfg.accent);
  doc.setLineWidth(0.5);
  doc.line(14, subtitle ? 44 : 38, W - 14, subtitle ? 44 : 38);

  // Page number footer
  const totalPages = '{total_pages_count_string}';
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);

  return { doc, cfg, startY: subtitle ? 48 : 42, W };
}

function addPageNumbers(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, W / 2, H - 8, { align: 'center' });
  }
}

function savePDF(doc, filename) {
  addPageNumbers(doc);
  doc.save(`${filename}_${nowTimestamp()}.pdf`);
}

// ── Table helper ──────────────────────────────────────────
function addTable(doc, cfg, startY, head, body, opts = {}) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: cfg.color,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: 40 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 14, right: 14 },
    ...opts,
  });
  return doc.lastAutoTable.finalY + 6;
}

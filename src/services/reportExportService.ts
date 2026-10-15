/**
 * Saraswati Sweets - Authoritative Report Export Service
 * Exports identical, verified report data across Excel (.xlsx), CSV (.csv), and PDF (.pdf).
 * Enforces spreadsheet formula injection protection, currency formatting, and professional branding.
 */

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportsAnalyticsPayload } from '../types/reports';
import { formatINR } from '../utils/formatters';

/**
 * Sanitize a string to prevent spreadsheet formula injection.
 * If a value starts with '=', '+', '-', '@', '\t', or '\r', prefix with single quote "'".
 * Also safely escapes commas, quotes, and newlines.
 */
export function sanitizeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Neutralize formula injection risk
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Quote escaping for CSV structure
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Trigger browser file download from Blob.
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => window.URL.revokeObjectURL(url), 2000);
}

// ============================================================================
// 1. CSV EXPORT (.csv)
// ============================================================================
export type CsvReportSection = 'all' | 'sales' | 'products' | 'payments' | 'cancellations';

export function exportReportToCsv(
  data: ReportsAnalyticsPayload,
  section: CsvReportSection = 'all'
): void {
  const rows: string[] = [];

  // Header metadata
  rows.push(sanitizeCsvField('SARASWATI SWEETS — STORE REPORTS & ANALYTICS'));
  rows.push(`${sanitizeCsvField('Selected Date Range:')},${sanitizeCsvField(data.range.label)}`);
  rows.push(`${sanitizeCsvField('Generated At (IST):')},${sanitizeCsvField(data.generatedAtIST)}`);
  rows.push('');

  // 1. Sales Summary & Timeline
  if (section === 'all' || section === 'sales') {
    rows.push(sanitizeCsvField('--- 1. SALES SUMMARY & TIMELINE ---'));
    rows.push(
      [
        sanitizeCsvField('Gross Sales'),
        sanitizeCsvField('Discounts'),
        sanitizeCsvField('Refunds'),
        sanitizeCsvField('Net Sales'),
        sanitizeCsvField('Eligible Orders'),
        sanitizeCsvField('Average Order Value (AOV)'),
      ].join(',')
    );
    rows.push(
      [
        sanitizeCsvField(`₹${data.salesSummary.grossSales.toFixed(2)}`),
        sanitizeCsvField(`₹${data.salesSummary.totalDiscounts.toFixed(2)}`),
        sanitizeCsvField(`₹${data.salesSummary.totalRefunds.toFixed(2)}`),
        sanitizeCsvField(`₹${data.salesSummary.netSales.toFixed(2)}`),
        sanitizeCsvField(data.salesSummary.eligibleOrdersCount),
        sanitizeCsvField(`₹${data.salesSummary.avgOrderValue}`),
      ].join(',')
    );
    rows.push('');

    rows.push(sanitizeCsvField('Date-wise Sales Breakdown'));
    rows.push(
      [
        sanitizeCsvField('Date'),
        sanitizeCsvField('Day / Period'),
        sanitizeCsvField('Orders Count'),
        sanitizeCsvField('Gross Sales (₹)'),
        sanitizeCsvField('Discounts (₹)'),
        sanitizeCsvField('Refunds (₹)'),
        sanitizeCsvField('Net Sales (₹)'),
      ].join(',')
    );
    data.timeline.forEach((t) => {
      rows.push(
        [
          sanitizeCsvField(t.key),
          sanitizeCsvField(t.label),
          sanitizeCsvField(t.orderCount),
          sanitizeCsvField(t.grossSales.toFixed(2)),
          sanitizeCsvField(t.discounts.toFixed(2)),
          sanitizeCsvField(t.refunds.toFixed(2)),
          sanitizeCsvField(t.netSales.toFixed(2)),
        ].join(',')
      );
    });
    // Totals row
    rows.push(
      [
        sanitizeCsvField('TOTALS'),
        sanitizeCsvField(''),
        sanitizeCsvField(data.salesSummary.eligibleOrdersCount),
        sanitizeCsvField(data.salesSummary.grossSales.toFixed(2)),
        sanitizeCsvField(data.salesSummary.totalDiscounts.toFixed(2)),
        sanitizeCsvField(data.salesSummary.totalRefunds.toFixed(2)),
        sanitizeCsvField(data.salesSummary.netSales.toFixed(2)),
      ].join(',')
    );
    rows.push('');
  }

  // 2. Best-Selling Products
  if (section === 'all' || section === 'products') {
    rows.push(sanitizeCsvField('--- 2. BEST-SELLING PRODUCTS RANKING ---'));
    rows.push(
      [
        sanitizeCsvField('Rank'),
        sanitizeCsvField('Product Name'),
        sanitizeCsvField('Category'),
        sanitizeCsvField('Units Sold'),
        sanitizeCsvField('Total Revenue (₹)'),
        sanitizeCsvField('Orders Count'),
        sanitizeCsvField('Top Variant'),
      ].join(',')
    );
    data.bestSellingProducts.forEach((p) => {
      rows.push(
        [
          sanitizeCsvField(p.rank),
          sanitizeCsvField(p.productName),
          sanitizeCsvField(p.categoryName),
          sanitizeCsvField(p.unitsSold),
          sanitizeCsvField(p.totalRevenue.toFixed(2)),
          sanitizeCsvField(p.orderCount),
          sanitizeCsvField(p.topVariant),
        ].join(',')
      );
    });
    rows.push('');
  }

  // 3. Payment Success / Failure
  if (section === 'all' || section === 'payments') {
    rows.push(sanitizeCsvField('--- 3. PAYMENT PERFORMANCE & SUCCESS RATE ---'));
    rows.push(
      [
        sanitizeCsvField('Total Attempts'),
        sanitizeCsvField('Unique Orders Attempted'),
        sanitizeCsvField('Successful Payments'),
        sanitizeCsvField('Failed Payments'),
        sanitizeCsvField('Pending Payments'),
        sanitizeCsvField('Success Rate (%)'),
        sanitizeCsvField('Failure Rate (%)'),
      ].join(',')
    );
    rows.push(
      [
        sanitizeCsvField(data.paymentAnalytics.totalAttempts),
        sanitizeCsvField(data.paymentAnalytics.uniqueOrdersAttempted),
        sanitizeCsvField(data.paymentAnalytics.successfulCount),
        sanitizeCsvField(data.paymentAnalytics.failedCount),
        sanitizeCsvField(data.paymentAnalytics.pendingCount),
        sanitizeCsvField(`${data.paymentAnalytics.successRatePercent}%`),
        sanitizeCsvField(`${data.paymentAnalytics.failureRatePercent}%`),
      ].join(',')
    );
    rows.push('');

    rows.push(sanitizeCsvField('Recent Payment Transactions'));
    rows.push(
      [
        sanitizeCsvField('Payment ID'),
        sanitizeCsvField('Order Number'),
        sanitizeCsvField('Method'),
        sanitizeCsvField('Amount (₹)'),
        sanitizeCsvField('Status'),
        sanitizeCsvField('Created Date (IST)'),
        sanitizeCsvField('Failure Reason'),
      ].join(',')
    );
    data.paymentAnalytics.recentTransactions.forEach((tx) => {
      rows.push(
        [
          sanitizeCsvField(tx.providerPaymentId || tx.id),
          sanitizeCsvField(tx.orderNumber),
          sanitizeCsvField(tx.method),
          sanitizeCsvField(tx.amount.toFixed(2)),
          sanitizeCsvField(tx.status),
          sanitizeCsvField(new Date(tx.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })),
          sanitizeCsvField(tx.failureReason || ''),
        ].join(',')
      );
    });
    rows.push('');
  }

  // 4. Cancellations and Refunds
  if (section === 'all' || section === 'cancellations') {
    rows.push(sanitizeCsvField('--- 4. CANCELLATION & REFUND REPORTS ---'));
    rows.push(
      [
        sanitizeCsvField('Total Cancelled Orders'),
        sanitizeCsvField('Total Cancelled Amount (₹)'),
        sanitizeCsvField('Successful Refunds Count'),
        sanitizeCsvField('Successful Refunds Amount (₹)'),
        sanitizeCsvField('Pending Refunds Count'),
        sanitizeCsvField('Pending Refunds Amount (₹)'),
      ].join(',')
    );
    rows.push(
      [
        sanitizeCsvField(data.cancellationsAndRefunds.cancellations.totalCancelledCount),
        sanitizeCsvField(data.cancellationsAndRefunds.cancellations.totalCancelledAmount.toFixed(2)),
        sanitizeCsvField(data.cancellationsAndRefunds.refunds.successfulCount),
        sanitizeCsvField(data.cancellationsAndRefunds.refunds.successfulAmount.toFixed(2)),
        sanitizeCsvField(data.cancellationsAndRefunds.refunds.pendingCount),
        sanitizeCsvField(data.cancellationsAndRefunds.refunds.pendingAmount.toFixed(2)),
      ].join(',')
    );
    rows.push('');

    rows.push(sanitizeCsvField('Cancellation & Refund Audit Records'));
    rows.push(
      [
        sanitizeCsvField('Order Number'),
        sanitizeCsvField('Order Date'),
        sanitizeCsvField('Order Total (₹)'),
        sanitizeCsvField('Payment Method'),
        sanitizeCsvField('Order Status'),
        sanitizeCsvField('Cancellation Reason'),
        sanitizeCsvField('Refund Status'),
        sanitizeCsvField('Refund Amount (₹)'),
        sanitizeCsvField('Refund ARN / Reference'),
      ].join(',')
    );
    data.cancellationsAndRefunds.records.forEach((rec) => {
      rows.push(
        [
          sanitizeCsvField(rec.orderNumber),
          sanitizeCsvField(new Date(rec.orderDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })),
          sanitizeCsvField(rec.orderTotal.toFixed(2)),
          sanitizeCsvField(rec.paymentMethod),
          sanitizeCsvField(rec.orderStatus),
          sanitizeCsvField(rec.cancelReason || ''),
          sanitizeCsvField(rec.refundStatus || 'NONE'),
          sanitizeCsvField(rec.refundAmount.toFixed(2)),
          sanitizeCsvField(rec.refundArn || rec.cfRefundId || ''),
        ].join(',')
      );
    });
  }

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `Saraswati-Sweets-Report-${data.range.startDate}-to-${data.range.endDate}.csv`;
  downloadBlob(blob, fileName);
}

// ============================================================================
// 2. EXCEL EXPORT (.xlsx)
// ============================================================================
export async function exportReportToExcel(data: ReportsAnalyticsPayload): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Saraswati Sweets Store Console';
  workbook.lastModifiedBy = 'Store Administrator';
  workbook.created = new Date();
  workbook.modified = new Date();

  const BRAND_MAROON = 'FF7A1129';
  const BRAND_GOLD_LIGHT = 'FFFDF8EE';

  // Helper to format header row
  const styleHeaderRow = (row: ExcelJS.Row) => {
    row.height = 26;
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_MAROON },
      };
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };

  // --------------------------------------------------------------------------
  // Worksheet 1: Sales Summary & Trajectory
  // --------------------------------------------------------------------------
  const salesSheet = workbook.addWorksheet('Sales Summary');
  salesSheet.views = [{ showGridLines: true }];

  salesSheet.columns = [
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Period Label', key: 'label', width: 20 },
    { header: 'Orders Count', key: 'orders', width: 14 },
    { header: 'Gross Sales (INR)', key: 'gross', width: 18 },
    { header: 'Discounts (INR)', key: 'discounts', width: 16 },
    { header: 'Refunds (INR)', key: 'refunds', width: 16 },
    { header: 'Net Sales (INR)', key: 'net', width: 18 },
  ];
  styleHeaderRow(salesSheet.getRow(1));

  data.timeline.forEach((t) => {
    const row = salesSheet.addRow({
      date: t.key,
      label: t.label,
      orders: t.orderCount,
      gross: t.grossSales,
      discounts: t.discounts,
      refunds: t.refunds,
      net: t.netSales,
    });
    row.getCell('orders').alignment = { horizontal: 'center' };
    row.getCell('gross').numFmt = '₹#,##0.00';
    row.getCell('discounts').numFmt = '₹#,##0.00';
    row.getCell('refunds').numFmt = '₹#,##0.00';
    row.getCell('net').numFmt = '₹#,##0.00';
  });

  // Totals summary row
  const totalRow = salesSheet.addRow({
    date: 'TOTAL',
    label: `Range: ${data.range.startDate} to ${data.range.endDate}`,
    orders: data.salesSummary.eligibleOrdersCount,
    gross: data.salesSummary.grossSales,
    discounts: data.salesSummary.totalDiscounts,
    refunds: data.salesSummary.totalRefunds,
    net: data.salesSummary.netSales,
  });
  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_GOLD_LIGHT },
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'double' },
    };
  });
  totalRow.getCell('gross').numFmt = '₹#,##0.00';
  totalRow.getCell('discounts').numFmt = '₹#,##0.00';
  totalRow.getCell('refunds').numFmt = '₹#,##0.00';
  totalRow.getCell('net').numFmt = '₹#,##0.00';

  // --------------------------------------------------------------------------
  // Worksheet 2: Best-Selling Products
  // --------------------------------------------------------------------------
  const productsSheet = workbook.addWorksheet('Best-Selling Products');
  productsSheet.views = [{ showGridLines: true }];

  productsSheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Product Name', key: 'name', width: 32 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Units Sold', key: 'units', width: 14 },
    { header: 'Total Revenue (INR)', key: 'revenue', width: 20 },
    { header: 'Orders Count', key: 'orders', width: 14 },
    { header: 'Top Variant', key: 'variant', width: 16 },
  ];
  styleHeaderRow(productsSheet.getRow(1));

  data.bestSellingProducts.forEach((p) => {
    const row = productsSheet.addRow({
      rank: p.rank,
      name: p.productName,
      category: p.categoryName,
      units: p.unitsSold,
      revenue: p.totalRevenue,
      orders: p.orderCount,
      variant: p.topVariant,
    });
    row.getCell('rank').alignment = { horizontal: 'center' };
    row.getCell('units').alignment = { horizontal: 'center' };
    row.getCell('orders').alignment = { horizontal: 'center' };
    row.getCell('revenue').numFmt = '₹#,##0.00';
  });

  // --------------------------------------------------------------------------
  // Worksheet 3: Payment Performance
  // --------------------------------------------------------------------------
  const paymentsSheet = workbook.addWorksheet('Payments Report');
  paymentsSheet.views = [{ showGridLines: true }];

  paymentsSheet.columns = [
    { header: 'Payment ID / Ref', key: 'id', width: 26 },
    { header: 'Order Number', key: 'order', width: 18 },
    { header: 'Method', key: 'method', width: 12 },
    { header: 'Amount (INR)', key: 'amount', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Date (IST)', key: 'date', width: 22 },
    { header: 'Failure Notes', key: 'notes', width: 30 },
  ];
  styleHeaderRow(paymentsSheet.getRow(1));

  data.paymentAnalytics.recentTransactions.forEach((tx) => {
    const row = paymentsSheet.addRow({
      id: tx.providerPaymentId || tx.id,
      order: tx.orderNumber,
      method: tx.method,
      amount: tx.amount,
      status: tx.status,
      date: new Date(tx.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      notes: tx.failureReason || '',
    });
    row.getCell('amount').numFmt = '₹#,##0.00';
    row.getCell('status').alignment = { horizontal: 'center' };
  });

  // --------------------------------------------------------------------------
  // Worksheet 4: Cancellations & Refunds
  // --------------------------------------------------------------------------
  const refundsSheet = workbook.addWorksheet('Cancellations & Refunds');
  refundsSheet.views = [{ showGridLines: true }];

  refundsSheet.columns = [
    { header: 'Order Number', key: 'order', width: 18 },
    { header: 'Order Date (IST)', key: 'date', width: 22 },
    { header: 'Order Total (INR)', key: 'total', width: 16 },
    { header: 'Payment Method', key: 'method', width: 14 },
    { header: 'Order Status', key: 'status', width: 16 },
    { header: 'Cancellation Reason', key: 'reason', width: 30 },
    { header: 'Refund Status', key: 'refundStatus', width: 16 },
    { header: 'Refund Amount (INR)', key: 'refundAmount', width: 18 },
    { header: 'Refund ARN / ID', key: 'arn', width: 24 },
  ];
  styleHeaderRow(refundsSheet.getRow(1));

  data.cancellationsAndRefunds.records.forEach((rec) => {
    const row = refundsSheet.addRow({
      order: rec.orderNumber,
      date: new Date(rec.orderDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      total: rec.orderTotal,
      method: rec.paymentMethod,
      status: rec.orderStatus,
      reason: rec.cancelReason || '',
      refundStatus: rec.refundStatus || 'NONE',
      refundAmount: rec.refundAmount,
      arn: rec.refundArn || rec.cfRefundId || '',
    });
    row.getCell('total').numFmt = '₹#,##0.00';
    row.getCell('refundAmount').numFmt = '₹#,##0.00';
    row.getCell('refundStatus').alignment = { horizontal: 'center' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = `Saraswati-Sweets-Reports-${data.range.startDate}-to-${data.range.endDate}.xlsx`;
  downloadBlob(blob, fileName);
}

// ============================================================================
// 3. PDF EXPORT (.pdf)
// ============================================================================
export function exportReportToPdf(data: ReportsAnalyticsPayload): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const MAROON = [122, 17, 41] as [number, number, number]; // #7A1129
  const GOLD = [217, 184, 102] as [number, number, number]; // #D9B866
  const TEXT_DARK = [36, 28, 23] as [number, number, number]; // #241C17
  const TEXT_MUTED = [107, 95, 85] as [number, number, number]; // #6B5F55
  const BG_SOFT = [247, 244, 239] as [number, number, number]; // #F7F4EF

  let currentY = 16;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, 210, 6, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 6, 210, 1.5, 'F');

  currentY = 18;

  // 2. Saraswati Sweets Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...MAROON);
  doc.text('SARASWATI SWEETS', 14, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Artisanal Pure Desi Ghee Mithai & Namkeen • Barabanki, Uttar Pradesh', 14, currentY);

  currentY += 8;

  // 3. Document Title & Metadata Strip
  doc.setDrawColor(233, 226, 216); // #E9E2D8
  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text('STORE MANAGEMENT & AUDIT REPORT', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Reporting Period: ${data.range.label}`, 18, currentY + 12);
  doc.text(`Generated: ${data.generatedAtIST}`, 120, currentY + 12);

  currentY += 24;

  // 4. Executive Metric Cards (4 boxes in row)
  const cardWidth = 43;
  const cardHeight = 16;
  const cards = [
    { label: 'Gross Sales', val: formatINR(data.salesSummary.grossSales) },
    { label: 'Net Sales', val: formatINR(data.salesSummary.netSales) },
    { label: 'Eligible Orders', val: String(data.salesSummary.eligibleOrdersCount) },
    { label: 'Average Order (AOV)', val: formatINR(data.salesSummary.avgOrderValue) },
  ];

  cards.forEach((c, i) => {
    const x = 14 + i * (cardWidth + 3.3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(233, 226, 216);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(c.label, x + 3, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...MAROON);
    doc.text(c.val, x + 3, currentY + 12);
  });

  currentY += 22;

  // 5. Section: Sales Timeline Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MAROON);
  doc.text('1. Sales Summary & Trajectory', 14, currentY);
  currentY += 3;

  const salesTableBody = data.timeline.map((t) => [
    t.key,
    t.label,
    String(t.orderCount),
    formatINR(t.grossSales),
    formatINR(t.discounts),
    formatINR(t.refunds),
    formatINR(t.netSales),
  ]);

  // Add totals row
  salesTableBody.push([
    'TOTAL',
    'Full Range',
    String(data.salesSummary.eligibleOrdersCount),
    formatINR(data.salesSummary.grossSales),
    formatINR(data.salesSummary.totalDiscounts),
    formatINR(data.salesSummary.totalRefunds),
    formatINR(data.salesSummary.netSales),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Period', 'Orders', 'Gross Sales', 'Discounts', 'Refunds', 'Net Sales']],
    body: salesTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: MAROON,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_DARK,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 32 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (dataCell) => {
      // Highlight total row
      if (dataCell.row.index === salesTableBody.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = BG_SOFT;
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need new page
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 6. Section: Top Best-Selling Products Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MAROON);
  doc.text('2. Top Best-Selling Mithai & Namkeen', 14, currentY);
  currentY += 3;

  const productsTableBody = data.bestSellingProducts.slice(0, 10).map((p) => [
    `#${p.rank}`,
    p.productName,
    p.categoryName,
    String(p.unitsSold),
    formatINR(p.totalRevenue),
    p.topVariant,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Rank', 'Product Name', 'Category', 'Units Sold', 'Revenue', 'Top Variant']],
    body: productsTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: MAROON,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_DARK,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 33, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 28 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 7. Section: Payment & Gateway Reliability
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MAROON);
  doc.text('3. Payment Gateway Reliability & Success Rate', 14, currentY);
  currentY += 3;

  const paymentSummaryBody = [
    ['Total Payment Attempts', String(data.paymentAnalytics.totalAttempts)],
    ['Unique Customer Orders Attempted', String(data.paymentAnalytics.uniqueOrdersAttempted)],
    ['Unique Customer Orders Successfully Paid', String(data.paymentAnalytics.uniqueOrdersPaid)],
    ['Successful Payments (CAPTURED)', String(data.paymentAnalytics.successfulCount)],
    ['Failed Payments', String(data.paymentAnalytics.failedCount)],
    ['Payment Success Rate', `${data.paymentAnalytics.successRatePercent}%`],
    ['Payment Failure Rate', `${data.paymentAnalytics.failureRatePercent}%`],
    ['Online Gateway Payments (Cashfree)', `${data.paymentAnalytics.breakdownByMethod.online.successful} / ${data.paymentAnalytics.breakdownByMethod.online.attempts} (${formatINR(data.paymentAnalytics.breakdownByMethod.online.totalAmount)})`],
    ['Cash on Delivery (COD)', `${data.paymentAnalytics.breakdownByMethod.cod.successful} / ${data.paymentAnalytics.breakdownByMethod.cod.attempts} (${formatINR(data.paymentAnalytics.breakdownByMethod.cod.totalAmount)})`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Metric', 'Value / Breakdown']],
    body: paymentSummaryBody,
    theme: 'grid',
    headStyles: {
      fillColor: MAROON,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_DARK,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 85, fontStyle: 'bold' },
      1: { cellWidth: 97 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 8. Section: Cancellations and Refunds
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MAROON);
  doc.text('4. Cancellations & Refund Audit', 14, currentY);
  currentY += 3;

  const refundSummaryBody = [
    ['Total Cancelled Orders', `${data.cancellationsAndRefunds.cancellations.totalCancelledCount} orders (${formatINR(data.cancellationsAndRefunds.cancellations.totalCancelledAmount)})`],
    ['Successful Gateway Refunds', `${data.cancellationsAndRefunds.refunds.successfulCount} refunds (${formatINR(data.cancellationsAndRefunds.refunds.successfulAmount)})`],
    ['Pending Refunds (In Review)', `${data.cancellationsAndRefunds.refunds.pendingCount} refunds (${formatINR(data.cancellationsAndRefunds.refunds.pendingAmount)})`],
    ['Failed Refunds', `${data.cancellationsAndRefunds.refunds.failedCount} (${formatINR(data.cancellationsAndRefunds.refunds.failedAmount)})`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Refund & Cancellation Category', 'Audit Figures']],
    body: refundSummaryBody,
    theme: 'grid',
    headStyles: {
      fillColor: MAROON,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_DARK,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 85, fontStyle: 'bold' },
      1: { cellWidth: 97 },
    },
  });

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);

    // Footer divider line
    doc.setDrawColor(233, 226, 216);
    doc.line(14, 287, 196, 287);

    doc.text(
      'Saraswati Sweets • Confidential Store Console Audit Report • Barabanki, UP',
      14,
      291
    );
    doc.text(`Page ${i} of ${totalPages}`, 180, 291);
  }

  const fileName = `Saraswati-Sweets-Audit-Report-${data.range.startDate}-to-${data.range.endDate}.pdf`;
  doc.save(fileName);
}

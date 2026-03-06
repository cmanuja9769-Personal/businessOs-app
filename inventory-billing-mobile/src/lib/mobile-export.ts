import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

interface ExportColumn {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportToMobileCSV<T extends Record<string, unknown>>(
  filename: string,
  columns: ExportColumn[],
  data: readonly T[],
  title?: string,
  subtitle?: string,
): Promise<void> {
  const lines: string[] = [];

  if (title) lines.push(escapeCsvCell(title));
  if (subtitle) lines.push(escapeCsvCell(subtitle));
  if (title || subtitle) lines.push('');

  lines.push(columns.map((col) => escapeCsvCell(col.header)).join(','));

  for (const row of data) {
    const cells = columns.map((col) => {
      const raw = row[col.key];
      const formatted = col.format ? col.format(raw) : raw;
      return escapeCsvCell(formatted);
    });
    lines.push(cells.join(','));
  }

  const csvContent = lines.join('\n');
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${FileSystem.cacheDirectory}${safeName}.csv`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: 'text/csv',
    dialogTitle: `Export ${title || filename}`,
    UTI: 'public.comma-separated-values-text',
  });
}

function buildReportHTML(
  title: string,
  columns: ExportColumn[],
  data: readonly Record<string, unknown>[],
  subtitle?: string,
  totals?: Record<string, unknown>,
): string {
  const headerCells = columns
    .map(
      (col) =>
        `<th style="padding:6px 8px;text-align:left;font-size:10px;border-bottom:2px solid #4F46E5;white-space:nowrap;">${col.header}</th>`,
    )
    .join('');

  const bodyRows = data
    .map((row) => {
      const cells = columns
        .map((col) => {
          const raw = row[col.key];
          const formatted = col.format ? col.format(raw) : String(raw ?? '');
          return `<td style="padding:5px 8px;font-size:9px;border-bottom:1px solid #e5e7eb;">${formatted}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  let totalsRow = '';
  if (totals) {
    const totalCells = columns
      .map((col) => {
        const val = totals[col.key];
        let formatted = '';
        if (val !== undefined && val !== '') {
          formatted = col.format ? col.format(val) : String(val);
        }
        return `<td style="padding:5px 8px;font-size:9px;font-weight:700;border-top:2px solid #333;">${formatted}</td>`;
      })
      .join('');
    totalsRow = `<tr style="background:#f3f4f6;">${totalCells}</tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:20px;color:#111827;}
  h1{font-size:16px;margin:0 0 4px 0;color:#4F46E5;}
  .subtitle{font-size:11px;color:#6b7280;margin-bottom:12px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
</style></head>
<body>
  <h1>${title}</h1>
  ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}${totalsRow}</tbody>
  </table>
</body>
</html>`;
}

export async function exportToMobilePDF(
  filename: string,
  title: string,
  columns: ExportColumn[],
  data: readonly Record<string, unknown>[],
  subtitle?: string,
  totals?: Record<string, unknown>,
): Promise<void> {
  const html = buildReportHTML(title, columns, data, subtitle, totals);

  const { uri } = await Print.printToFileAsync({
    html,
    width: columns.length > 6 ? 842 : 595,
    height: columns.length > 6 ? 595 : 842,
  });

  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const destPath = `${FileSystem.cacheDirectory}${safeName}.pdf`;

  await FileSystem.moveAsync({ from: uri, to: destPath });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(destPath, {
    mimeType: 'application/pdf',
    dialogTitle: `Export ${title}`,
    UTI: 'com.adobe.pdf',
  });
}

export async function printReport(
  title: string,
  columns: ExportColumn[],
  data: readonly Record<string, unknown>[],
  subtitle?: string,
  totals?: Record<string, unknown>,
): Promise<void> {
  const html = buildReportHTML(title, columns, data, subtitle, totals);
  await Print.printAsync({ html });
}

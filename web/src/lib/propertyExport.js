import ExcelJS from 'exceljs';

// Builds a normalized structure from the page data so both exporters share it.
export const buildExportModel = ({
  kaek,
  geoData,
  area,
  perimeter,
  coords,
  sdigmap,
  fieldLabels = {},
  selectedCategoryKeys = null,
  mapImageDataUrl = null,
}) => {
  const fmtNum = (n) =>
    typeof n === 'number' ? n.toLocaleString('el-GR', { maximumFractionDigits: 2 }) : '—';

  const coordsText = coords
    ? typeof coords === 'string'
      ? coords
      : `${coords.latitude}, ${coords.longitude}`
    : '—';

  const summary = [
    ['ΚΑΕΚ', kaek || '—'],
    ['Νομός', geoData?.structuredAddress?.regionalUnit || geoData?.county || '—'],
    ['ΟΤΑ / Δήμος', geoData?.structuredAddress?.municipality || geoData?.municipality || '—'],
    ['Εμβαδόν (τ.μ.)', fmtNum(area)],
    ['Περίμετρος (μ.)', fmtNum(perimeter)],
    ['Συντεταγμένες ΚΑΕΚ', coordsText],
  ];

  const label = (f) => fieldLabels[f] || f;

  const allCategories = sdigmap?.categories || [];
  const filteredCategories = selectedCategoryKeys
    ? allCategories.filter((cat) => selectedCategoryKeys.includes(cat.key))
    : allCategories;

  const categories = filteredCategories.map((cat) => ({
    label: cat.label,
    layers: (cat.layers || []).map((lyr) => ({
      label: lyr.label,
      records: (lyr.records || []).map((rows) =>
        rows.map((row) => ({
          label: label(row.field),
          value: row.url ? row.url : row.value != null ? String(row.value) : '—',
        })),
      ),
    })),
  }));

  return { kaek, summary, categories, mapImageDataUrl };
};

export const exportToExcel = async (model) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Αναφορά Ακινήτου');
  ws.columns = [
    { header: 'Πεδίο', key: 'field', width: 40 },
    { header: 'Τιμή', key: 'value', width: 70 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };

  let r = 2;
  const sectionTitle = (text) => {
    const row = ws.getRow(r);
    ws.mergeCells(`A${r}:B${r}`);
    row.getCell(1).value = text;
    row.font = { bold: true, size: 12 };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    r++;
  };
  const kv = (field, value) => {
    const row = ws.getRow(r);
    row.getCell(1).value = field;
    row.getCell(2).value = value;
    row.getCell(2).alignment = { wrapText: true };
    r++;
  };

  sectionTitle('Βασικά Στοιχεία');
  model.summary.forEach(([f, v]) => kv(f, v));
  r++;

  if (model.mapImageDataUrl) {
    sectionTitle('Χάρτης Ακινήτου');
    try {
      const imageId = wb.addImage({ base64: model.mapImageDataUrl, extension: 'png' });
      const imageStartRow = r;
      ws.addImage(imageId, `A${imageStartRow}:D${imageStartRow + 17}`);
      r += 19;
    } catch (err) {
      kv('Χάρτης', 'Μη διαθέσιμος');
    }
    r++;
  }

  model.categories.forEach((cat) => {
    sectionTitle(cat.label);
    cat.layers.forEach((lyr) => {
      if (cat.layers.length > 1) kv('— ' + lyr.label, '');
      lyr.records.forEach((rows, ri) => {
        if (lyr.records.length > 1) kv(`Εγγραφή ${ri + 1}`, '');
        rows.forEach((row) => kv(row.label, row.value));
      });
    });
    r++;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `ReportAKI-${model.kaek || 'akinito'}.xlsx`);
};

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const isUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

export const exportToPdf = (model) => {
  const summaryRows = model.summary
    .map(
      ([f, v]) =>
        `<tr><th>${esc(f)}</th><td>${isUrl(v) ? `<a href="${esc(v)}">${esc(v)}</a>` : esc(v)}</td></tr>`,
    )
    .join('');

  const mapSectionHtml = model.mapImageDataUrl
    ? `<section><h2>Χάρτης Ακινήτου</h2><img src="${model.mapImageDataUrl}" style="width:100%;max-width:700px;display:block;border:1px solid #e5e7eb;border-radius:8px;margin-top:6px;" /></section>`
    : '';

  const categoriesHtml = model.categories
    .map((cat) => {
      const layers = cat.layers
        .map((lyr) => {
          const recs = lyr.records
            .map((rows, ri) => {
              const body = rows
                .map(
                  (row) =>
                    `<tr><th>${esc(row.label)}</th><td>${
                      isUrl(row.value) ? `<a href="${esc(row.value)}">${esc(row.value)}</a>` : esc(row.value)
                    }</td></tr>`,
                )
                .join('');
              const recTitle = lyr.records.length > 1 ? `<div class="rec">Εγγραφή ${ri + 1}</div>` : '';
              return `${recTitle}<table>${body}</table>`;
            })
            .join('');
          const lyrTitle = cat.layers.length > 1 ? `<h3>${esc(lyr.label)}</h3>` : '';
          return `${lyrTitle}${recs}`;
        })
        .join('');
      return `<section><h2>${esc(cat.label)}</h2>${layers}</section>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html lang="el"><head><meta charset="utf-8" />
<title>Αναφορά ${esc(model.kaek || '')} - ReportAKI</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "DM Sans", Arial, sans-serif; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #555; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 15px; background: #1f2937; color: #fff; padding: 8px 12px; border-radius: 6px; margin: 26px 0 10px; }
  h3 { font-size: 13px; color: #374151; margin: 14px 0 6px; }
  .rec { font-size: 12px; font-weight: 700; color: #6b7280; margin: 8px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { text-align: left; font-size: 12px; padding: 6px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
  th { width: 38%; background: #f3f4f6; font-weight: 600; }
  td { word-break: break-word; }
  a { color: #2563eb; }
  @media print { body { padding: 0; } h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <h1>Αναφορά Ακινήτου — ΚΑΕΚ ${esc(model.kaek || '')}</h1>
  <div class="sub">ReportAKI · Πολεοδομικά & Γεωχωρικά Δεδομένα (SDIGMAP / TEE)</div>
  <section><h2>Βασικά Στοιχεία</h2><table>${summaryRows}</table></section>
  ${mapSectionHtml}
  ${categoriesHtml}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };<\/script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
};

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

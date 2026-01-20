export interface Env {
  // Set in Cloudflare Pages -> Settings -> Environment variables / secrets
  PDFSHIFT_API_KEY: string;
}

type Line = {
  description: string;
  units: number;
  priceUnit: number;
  total: number;
};

type Payload = {
  invoiceCode: string;
  clientName: string;
  date: string;
  lines: Line[];
  subtotal: number;
  iva: number;
  total: number;
};

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function eur(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
}

function buildHtml(p: Payload, origin: string) {
  const rows = (p.lines || [])
    .map((l) => {
      const desc = esc(String(l.description || '')).replace(/\n/g, '<br/>');
      return `
        <tr>
          <td class="desc">${desc || '&nbsp;'}</td>
          <td class="uds">${Number(l.units || 0)}</td>
          <td class="unit">${eur(Number(l.priceUnit || 0))}</td>
          <td class="tot">${eur(Number(l.total || 0))}</td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<base href="${esc(origin)}/" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0b1220; }
  .page { position: relative; width: 210mm; height: 297mm; padding: 18mm 14mm 14mm 14mm; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .h-left .name { font-weight: 800; font-size: 15pt; letter-spacing: 0.2px; }
  .h-left .meta { margin-top: 4px; font-size: 10.5pt; line-height: 1.35; color: #1b2536; }
  .logo { width: 64mm; height: auto; }

  .title { margin-top: 10mm; text-align: center; font-size: 38pt; font-weight: 900; letter-spacing: 1px; color: #2f5fa4; }

  .clientRow { margin-top: 8mm; display: flex; justify-content: space-between; font-family: 'Times New Roman', Times, serif; font-weight: 800; font-size: 11pt; letter-spacing: 0.6px; }
  .clientRow .label { text-transform: uppercase; }

  .tableWrap { margin-top: 10mm; border: 2px solid #0b1220; border-radius: 3px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #182334; color: #fff; font-size: 9.5pt; padding: 10px 10px; text-transform: uppercase; letter-spacing: 0.6px; }
  tbody td { border-top: 2px solid #0b1220; font-size: 11pt; padding: 14px 10px; vertical-align: middle; }
  tbody tr td + td { border-left: 2px solid #0b1220; }

  .desc { width: 58%; font-weight: 700; }
  .uds { width: 12%; text-align: center; font-weight: 700; }
  .unit { width: 15%; text-align: right; font-weight: 700; }
  .tot  { width: 15%; text-align: right; font-weight: 900; }

  .totalsBox {
    position: absolute;
    right: 14mm;
    bottom: 40mm;
    width: 70mm;
    border: 2px solid #0b1220;
  }
  .totalsRow { display: flex; border-bottom: 2px solid #0b1220; }
  .totalsRow:last-child { border-bottom: none; }
  .totLabel { flex: 1; padding: 10px 10px; font-size: 9pt; font-weight: 800; background: #fff; }
  .totVal { width: 30mm; padding: 10px 10px; text-align: right; font-size: 9pt; font-weight: 900; background: #fff; }
  .totalFinal .totLabel { background: #182334; color: #fff; font-size: 10pt; }
  .totalFinal .totVal   { background: #182334; color: #fff; font-size: 14pt; }

  .sideCode {
    position: absolute;
    left: -58mm;
    top: 120mm;
    transform: rotate(-90deg);
    transform-origin: left top;
    font-weight: 900;
    letter-spacing: 1px;
    color: #0b1220;
    font-size: 14pt;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="h-left">
        <div class="name">EDUARDO QUILIS LLORENS</div>
        <div class="meta">C/ Cervantes 41 • Onil • 03430<br/>quilislalo@gmail.com<br/>Tel: 620-944-229 • NIF: 21667776-M</div>
      </div>
      <img class="logo" src="assets/logo.png" />
    </div>

    <div class="title">FACTURA</div>

    <div class="clientRow">
      <div class="label">CLIENTE: ${esc((p.clientName || '').toUpperCase() || 'AQUI NOMBRE DE CLIENTE')}</div>
      <div class="label">FECHA: ${esc(p.date || 'AQUI FECHA')}</div>
    </div>

    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th style="text-align:left">CONCEPTO / DESCRIPCIÓN</th>
            <th style="text-align:center">UDS.</th>
            <th style="text-align:right">P. UNIT (€)</th>
            <th style="text-align:right">TOTAL (€)</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td class="desc">&nbsp;</td><td class="uds">&nbsp;</td><td class="unit">&nbsp;</td><td class="tot">&nbsp;</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="totalsBox">
      <div class="totalsRow">
        <div class="totLabel">BASE IMP</div>
        <div class="totVal">${eur(p.subtotal)}</div>
      </div>
      <div class="totalsRow">
        <div class="totLabel">IVA (21%)</div>
        <div class="totVal">${eur(p.iva)}</div>
      </div>
      <div class="totalsRow totalFinal">
        <div class="totLabel">TOTAL</div>
        <div class="totVal">${eur(p.total)}</div>
      </div>
    </div>

    <div class="sideCode">${esc(p.invoiceCode || '')}</div>
  </div>
</body>
</html>`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.PDFSHIFT_API_KEY) {
      return new Response('Missing PDFSHIFT_API_KEY env var', { status: 500 });
    }

    const payload = (await request.json()) as Payload;
    const url = new URL(request.url);

    const html = buildHtml(payload, url.origin);

    const auth = btoa(`${env.PDFSHIFT_API_KEY}:`);

    const resp = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        use_print: true,
        format: 'A4',
        margin: '0mm',
        // This helps remote assets resolve. The HTML already has <base>.
      })
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return new Response(`PDFShift error (${resp.status}): ${t}`, { status: 500 });
    }

    const pdf = await resp.arrayBuffer();
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    return new Response(`PDF error: ${err?.message || String(err)}`, { status: 500 });
  }
};

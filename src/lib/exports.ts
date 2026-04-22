import { Client, OrderItem, Product } from "./types";
import { OrderTotals } from "./calc";
import { formatBRL, formatPct } from "./mock";

interface ExportPayload {
  client: Client;
  items: OrderItem[];
  productMap: Record<string, Product>;
  totals: OrderTotals;
  type: string;
  paymentTerm: string;
  shift?: string;
  validUntil?: string; // for quotes
  signatureDataUrl?: string;
  signedBy?: string;
  salesperson: string;
  isQuote?: boolean;
}

function downloadFile(content: string | Blob, filename: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCSV(p: ExportPayload) {
  const rows: string[][] = [];
  rows.push(["Cliente", p.client.fantasy]);
  rows.push(["CNPJ/Razão", p.client.name]);
  rows.push(["Cidade", p.client.city]);
  rows.push(["Vendedor", p.salesperson]);
  rows.push(["Tipo", p.isQuote ? "Orçamento" : p.type]);
  rows.push(["Pagamento", p.paymentTerm]);
  if (p.validUntil) rows.push(["Validade", new Date(p.validUntil).toLocaleDateString("pt-BR")]);
  rows.push([]);
  rows.push(["Código", "Produto", "Marca", "Unid.", "Qtd", "Preço", "Total"]);
  for (const it of p.items) {
    const prod = p.productMap[it.productId];
    rows.push([
      prod.code,
      prod.name,
      prod.brand,
      prod.unit,
      String(it.qty),
      it.price.toFixed(2).replace(".", ","),
      (it.price * it.qty).toFixed(2).replace(".", ","),
    ]);
  }
  rows.push([]);
  rows.push(["Total bruto", p.totals.gross.toFixed(2).replace(".", ",")]);
  rows.push(["Margem %", p.totals.marginPct.toFixed(2).replace(".", ",")]);
  rows.push(["Comissão %", p.totals.commissionPct.toFixed(2).replace(".", ",")]);
  rows.push(["Comissão R$", p.totals.commissionValue.toFixed(2).replace(".", ",")]);
  if (p.signedBy) rows.push(["Assinado por", p.signedBy]);

  const csv = rows
    .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

  // BOM for Excel
  downloadFile("\ufeff" + csv, `${p.isQuote ? "orcamento" : "pedido"}-${p.client.fantasy.replace(/\s+/g, "_")}.csv`, "text/csv;charset=utf-8");
}

export function buildWhatsAppText(p: ExportPayload): string {
  const lines: string[] = [];
  lines.push(`*${p.isQuote ? "Orçamento" : "Pedido"} — ${p.client.fantasy}*`);
  lines.push(`Vendedor: ${p.salesperson}`);
  lines.push(`Pagamento: ${p.paymentTerm}`);
  if (p.validUntil) lines.push(`Validade: ${new Date(p.validUntil).toLocaleDateString("pt-BR")}`);
  lines.push("");
  lines.push("*Itens:*");
  for (const it of p.items) {
    const prod = p.productMap[it.productId];
    lines.push(`• ${it.qty}x ${prod.name} — ${formatBRL(it.price)} = ${formatBRL(it.price * it.qty)}`);
  }
  lines.push("");
  lines.push(`*Total: ${formatBRL(p.totals.gross)}*`);
  lines.push(`Margem: ${formatPct(p.totals.marginPct)}`);
  return lines.join("\n");
}

export function shareWhatsApp(p: ExportPayload) {
  const text = encodeURIComponent(buildWhatsAppText(p));
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

export function exportPDF(p: ExportPayload) {
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) return;
  const itemsHtml = p.items.map((it) => {
    const prod = p.productMap[it.productId];
    return `<tr>
      <td>${prod.code}</td>
      <td>${prod.name}<br><span class="muted">${prod.brand} · ${prod.unit}</span></td>
      <td class="r">${it.qty}</td>
      <td class="r">${formatBRL(it.price)}</td>
      <td class="r"><strong>${formatBRL(it.price * it.qty)}</strong></td>
    </tr>`;
  }).join("");

  const sigHtml = p.signatureDataUrl
    ? `<div class="sig-block">
        <p class="muted small">Assinatura do cliente${p.signedBy ? ` — ${p.signedBy}` : ""}</p>
        <img src="${p.signatureDataUrl}" alt="Assinatura" />
      </div>`
    : "";

  const validityHtml = p.validUntil
    ? `<p><strong>Validade:</strong> ${new Date(p.validUntil).toLocaleDateString("pt-BR")}</p>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${p.isQuote ? "Orçamento" : "Pedido"} - ${p.client.fantasy}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f1729; padding: 32px; max-width: 760px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .muted { color: #6b7280; }
  .small { font-size: 11px; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #1a3a8a; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { color: #1a3a8a; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; font-size: 13px; }
  .box { background: #f5f7fb; border-radius: 8px; padding: 10px 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
  th { background: #f5f7fb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
  .r { text-align: right; }
  .totals { margin-top: 16px; background: #f5f7fb; border-radius: 8px; padding: 14px 16px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .grand { font-size: 18px; font-weight: 800; border-top: 1px solid #d1d5db; margin-top: 8px; padding-top: 10px; }
  .badge { display: inline-block; background: #1a3a8a; color: white; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .sig-block { margin-top: 32px; border-top: 1px dashed #9ca3af; padding-top: 16px; }
  .sig-block img { max-width: 320px; max-height: 120px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">VENDACOPILOTO</div>
      <h1>${p.isQuote ? "Orçamento" : "Pedido de venda"}</h1>
      <p class="muted small">Emitido em ${new Date().toLocaleString("pt-BR")}</p>
    </div>
    <div style="text-align:right">
      <span class="badge">${p.isQuote ? "ORÇAMENTO" : (p.type || "PEDIDO").toUpperCase()}</span>
      <p class="small muted" style="margin-top:8px">Vendedor: <strong>${p.salesperson}</strong></p>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <p class="small muted" style="margin:0 0 4px">CLIENTE</p>
      <strong>${p.client.fantasy}</strong><br>
      <span class="small">${p.client.name}</span><br>
      <span class="small muted">${p.client.city} · ${p.client.segment}</span>
    </div>
    <div class="box">
      <p class="small muted" style="margin:0 0 4px">CONDIÇÕES</p>
      <p style="margin:2px 0"><strong>Pagamento:</strong> ${p.paymentTerm}</p>
      ${p.shift ? `<p style="margin:2px 0"><strong>Turno:</strong> ${p.shift}</p>` : ""}
      ${validityHtml}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Cód.</th><th>Produto</th><th class="r">Qtd</th><th class="r">Preço</th><th class="r">Total</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Itens</span><span>${p.totals.itemsCount} un.</span></div>
    <div class="row"><span>Margem</span><span>${formatPct(p.totals.marginPct)}</span></div>
    <div class="row"><span>Comissão estimada</span><span>${formatBRL(p.totals.commissionValue)} (${formatPct(p.totals.commissionPct)})</span></div>
    <div class="row grand"><span>TOTAL</span><span>${formatBRL(p.totals.gross)}</span></div>
  </div>

  ${sigHtml}

  <p class="muted small" style="margin-top:32px; text-align:center">
    Documento gerado por VendaCopiloto — ${new Date().toLocaleDateString("pt-BR")}
  </p>

  <script>
    window.onload = () => { setTimeout(() => window.print(), 300); };
  </script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

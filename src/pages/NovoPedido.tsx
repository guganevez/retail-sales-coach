import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Search, X, Plus, Minus, Sparkles, Truck, Package, FileText,
  AlertTriangle, ShieldAlert, CheckCircle2, Repeat, ChevronRight, Tag,
  CalendarClock, Download, FileDown, MessageCircle, PenLine, ArrowRight, Eye, Save,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { ClientStatusBadge } from "@/components/ClientStatusBadge";
import { HealthPill, HealthDot } from "@/components/HealthDot";
import { SignaturePad } from "@/components/SignaturePad";
import { BlockingPanel } from "@/components/BlockingPanel";
import { ClientHistoryPanel } from "@/components/ClientHistoryPanel";
import {
  clients, formatBRL, formatPct, frequentByClient, lastPriceMap,
  logistics, products, recentOrders,
} from "@/lib/mock";
import { OrderItem, OrderType, Shift } from "@/lib/types";
import { computeTotals, marginHealth, priceHealth, itemMarginPct } from "@/lib/calc";
import { cn } from "@/lib/utils";
import { useQuotes } from "@/lib/quotes";
import { useProfile } from "@/lib/profile";
import { useDraft } from "@/lib/draft";
import { exportCSV, exportPDF, shareWhatsApp } from "@/lib/exports";

const productMap = Object.fromEntries(products.map(p => [p.id, p]));

type Step = "edit" | "review" | "confirmed";

const NovoPedido = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addQuote } = useQuotes();
  const { profile } = useProfile();
  const { draft, saveDraft, clearDraft } = useDraft();

  const preselected = params.get("cliente");
  const initialType = (params.get("tipo") as OrderType) || "entrega";
  const preselectedProduct = params.get("produto");
  const resume = params.get("retomar") === "1" && !!draft;

  const [clientId, setClientId] = useState<string | null>(resume ? draft!.clientId : preselected);
  const [pickerOpen, setPickerOpen] = useState(resume ? !draft!.clientId : !preselected);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [items, setItems] = useState<OrderItem[]>(resume ? draft!.items : []);
  const [orderType, setOrderType] = useState<OrderType>(resume ? draft!.orderType : initialType);
  const [shift, setShift] = useState<Shift>(resume ? draft!.shift : "manha");
  const [paymentTerm, setPaymentTerm] = useState(resume ? draft!.paymentTerm : "28 dias");
  const [step, setStep] = useState<Step>("edit");
  const [signature, setSignature] = useState<string | undefined>(resume ? draft!.signature : undefined);
  const [signedBy, setSignedBy] = useState(resume ? draft!.signedBy : "");
  const [validUntil, setValidUntil] = useState(() => {
    if (resume && draft!.validUntil) return draft!.validUntil;
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [showSignatureError, setShowSignatureError] = useState(false);

  const client = clients.find(c => c.id === clientId) || null;
  const prices = client ? (lastPriceMap[client.id] || {}) : {};
  const totals = useMemo(() => computeTotals(items, productMap), [items]);

  // Capacidade logística
  const capacityRemaining = logistics.capacityKg - logistics.scheduledKg;
  const capacityWarning = totals.weightKg > capacityRemaining;

  function addProduct(productId: string, atPrice?: number) {
    setItems(prev => {
      const existing = prev.find(i => i.productId === productId);
      const p = productMap[productId];
      if (existing) {
        return prev.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        productId,
        qty: 1,
        price: atPrice ?? prices[productId] ?? p.psv,
        lastPrice: prices[productId],
      }];
    });
  }

  // Auto-correção de preço pelo painel de bloqueios
  function fixItemPrice(productId: string, newPrice: number) {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, price: newPrice } : i));
    const p = productMap[productId];
    toast.success(`Preço de ${p?.name ?? "item"} ajustado para ${formatBRL(newPrice)}`);
  }

  // Sugere o melhor substituto de maior margem na mesma categoria
  function suggestSubstitute(productId: string) {
    const p = productMap[productId];
    if (!p) return;
    const candidate = products
      .filter(x => x.id !== productId && x.category === p.category)
      .sort((a, b) => itemMarginPct(b.psv, b.cost) - itemMarginPct(a.psv, a.cost))[0];
    if (!candidate) {
      toast.info("Sem substituto disponível na mesma categoria.");
      return;
    }
    addProduct(candidate.id);
    toast.success(`Substituto sugerido: ${candidate.name}`);
  }

  // Auto-add se veio um produto da busca universal
  useEffect(() => {
    if (preselectedProduct && client && !items.find(i => i.productId === preselectedProduct)) {
      addProduct(preselectedProduct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedProduct, client]);

  function updateQty(productId: string, delta: number) {
    setItems(prev => prev
      .map(i => i.productId === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0));
  }

  function updatePrice(productId: string, price: number) {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, price } : i));
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }

  function repeatLastOrder() {
    if (!client) return;
    const last = recentOrders.find(o => o.clientId === client.id);
    if (!last) return;
    setItems(last.items.map(i => ({ ...i, lastPrice: i.price })));
  }

  // Smart suggestions
  const suggestions = useMemo(() => {
    if (!client) return [];
    const inOrder = new Set(items.map(i => i.productId));
    const freq = (frequentByClient[client.id] || [])
      .filter(pid => !inOrder.has(pid))
      .map(pid => ({ product: productMap[pid], reason: "Costuma comprar" as const }));
    const promos = products
      .filter(p => p.promo && !inOrder.has(p.id) && !freq.find(f => f.product.id === p.id))
      .map(p => ({ product: p, reason: "Em promoção" as const }));
    const recover = totals.marginPct < 5 && totals.gross > 0
      ? products
        .filter(p => !inOrder.has(p.id) && itemMarginPct(p.psv, p.cost) > 25)
        .slice(0, 2)
        .map(p => ({ product: p, reason: "Recupera margem" as const }))
      : [];
    return [...freq.slice(0, 3), ...recover, ...promos.slice(0, 2)];
  }, [client, items, totals]);

  // Alerts
  const alerts: { sev: "danger"|"warning"|"info"; msg: string }[] = [];
  if (client?.status === "bloqueado") alerts.push({ sev: "danger", msg: "Cliente bloqueado — pedido não poderá ser faturado." });
  if (client && client.overdueAmount > 0) alerts.push({ sev: "warning", msg: `Cliente possui ${formatBRL(client.overdueAmount)} em duplicatas vencidas.` });
  if (client && client.creditLimit > 0 && (client.creditUsed + totals.gross) > client.creditLimit) {
    alerts.push({ sev: "warning", msg: "Pedido excede o limite de crédito disponível." });
  }
  if (totals.blocked) alerts.push({ sev: "danger", msg: "Margem inferior a -3%: pedido bloqueado pela política comercial." });
  else if (totals.marginPct < 2 && items.length > 0) alerts.push({ sev: "warning", msg: "Margem do pedido está baixa. Considere ajustar preços." });
  if (capacityWarning && orderType === "entrega") alerts.push({ sev: "warning", msg: `Pedido excede a capacidade do dia (${(totals.weightKg).toFixed(0)}kg de ${capacityRemaining}kg disponíveis).` });
  if (items.length > 0 && totals.itemsCount < 6 && totals.marginPct < 6) alerts.push({ sev: "info", msg: "Pedido pequeno e com baixa rentabilidade — sugira combos." });

  const canSubmit = client && items.length > 0 && !totals.blocked && client.status !== "bloqueado";
  const isQuote = orderType === "orcamento";
  const requiresSignature = orderType === "entrega";

  const exportPayload = client ? {
    client, items, productMap, totals,
    type: orderType, paymentTerm, shift,
    validUntil: isQuote ? new Date(validUntil + "T23:59:59").toISOString() : undefined,
    signatureDataUrl: signature, signedBy: signedBy || undefined,
    salesperson: profile.name,
    isQuote,
  } : null;

  function confirmSubmit() {
    if (!client || !exportPayload) return;

    // Validação BLOQUEANTE: assinatura + recebedor obrigatórios para entregas
    if (requiresSignature) {
      const missingSig = !signature;
      const missingName = signedBy.trim().length < 2;
      if (missingSig || missingName) {
        setShowSignatureError(true);
        const what = missingSig && missingName
          ? "assinatura e nome do recebedor"
          : missingSig ? "assinatura do recebedor" : "nome do recebedor";
        toast.error(`Não é possível confirmar: faltando ${what}.`);
        // Rola até a seção de assinatura
        setTimeout(() => {
          document.getElementById("signature-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        return;
      }
    }

    // Sempre persiste para a lista de "orçamentos/pedidos"
    addQuote({
      clientId: client.id,
      items,
      type: orderType,
      shift,
      paymentTerm,
      totalGross: totals.gross,
      marginPct: totals.marginPct,
      commissionValue: totals.commissionValue,
      validUntil: isQuote ? new Date(validUntil + "T23:59:59").toISOString() : new Date().toISOString(),
      status: isQuote ? "enviado" : "aceito",
      signatureDataUrl: signature,
      signedBy: signedBy || undefined,
      isOrder: !isQuote,
    });
    clearDraft();
    setStep("confirmed");
  }

  // ============ AUTO-SAVE EM MEMÓRIA ============
  const firstSaveSkip = useRef(true);
  useEffect(() => {
    // Não salva enquanto está mostrando confirmação
    if (step === "confirmed") return;
    // Pula a primeira passagem (carregamento) para evitar sobrescrever ao retomar
    if (firstSaveSkip.current) {
      firstSaveSkip.current = false;
      return;
    }
    saveDraft({
      clientId, items, orderType, shift, paymentTerm, validUntil, signedBy, signature,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, items, orderType, shift, paymentTerm, validUntil, signedBy, signature, step]);

  // ============ TELA DE CONFIRMAÇÃO ============
  if (step === "confirmed" && client && exportPayload) {
    return (
      <MobileShell hideTopBar>
        <div className="flex min-h-[80vh] flex-col items-center text-center pt-10">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="mt-4 text-xl font-bold">{isQuote ? "Orçamento enviado!" : "Pedido confirmado!"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cliente: {client.fantasy}</p>
          <p className="text-2xl font-bold mt-3 num">{formatBRL(totals.gross)}</p>
          <p className="text-xs text-muted-foreground">
            Comissão prevista <strong className="text-success">{formatBRL(totals.commissionValue)}</strong>
          </p>

          <div className="mt-6 w-full max-w-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compartilhar / Exportar</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => exportPDF(exportPayload)} className="flex flex-col items-center gap-1 rounded-xl bg-card p-3 text-xs font-semibold shadow-soft">
                <FileDown className="h-5 w-5 text-primary" /> PDF
              </button>
              <button onClick={() => exportCSV(exportPayload)} className="flex flex-col items-center gap-1 rounded-xl bg-card p-3 text-xs font-semibold shadow-soft">
                <Download className="h-5 w-5 text-primary" /> CSV
              </button>
              <button onClick={() => shareWhatsApp(exportPayload)} className="flex flex-col items-center gap-1 rounded-xl bg-success p-3 text-xs font-semibold text-success-foreground shadow-soft">
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </button>
            </div>
          </div>

          <div className="mt-8 flex gap-2">
            <Link to="/" className="rounded-xl bg-card px-4 py-2.5 text-sm font-semibold shadow-soft">Início</Link>
            {isQuote && (
              <Link to="/orcamentos" className="rounded-xl bg-card px-4 py-2.5 text-sm font-semibold shadow-soft">Ver orçamentos</Link>
            )}
            <button
              onClick={() => {
                clearDraft();
                setStep("edit"); setItems([]); setClientId(null); setPickerOpen(true);
                setSignature(undefined); setSignedBy(""); setShowSignatureError(false);
              }}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Novo pedido
            </button>
          </div>
        </div>
      </MobileShell>
    );
  }

  // ============ TELA DE REVISÃO ============
  if (step === "review" && client && exportPayload) {
    return (
      <MobileShell hideTopBar>
        <div className="-mx-4 gradient-hero px-4 pb-4 pt-5 text-primary-foreground">
          <button onClick={() => setStep("edit")} className="inline-flex items-center gap-1.5 text-sm opacity-90">
            <ArrowLeft className="h-4 w-4" /> Voltar a editar
          </button>
          <h1 className="mt-2 text-xl font-bold inline-flex items-center gap-2">
            <Eye className="h-5 w-5" /> Revisar {isQuote ? "orçamento" : "pedido"}
          </h1>
          <p className="text-xs opacity-80">Confira tudo antes de enviar.</p>
        </div>

        {/* Resumo do cliente */}
        <section className="mt-4 rounded-2xl bg-card p-3 shadow-soft">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold flex-1 truncate">{client.fantasy}</p>
            <ClientStatusBadge status={client.status} />
          </div>
          <p className="text-[11px] text-muted-foreground">{client.city} · {client.segment}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <Info label="Tipo" value={isQuote ? "Orçamento" : orderType === "entrega" ? "Entrega" : "Retirada"} />
            <Info label="Pagto" value={paymentTerm} />
            {orderType === "entrega" && <Info label="Turno" value={shift === "manha" ? "Manhã" : shift === "tarde" ? "Tarde" : "Noite"} />}
            {isQuote && <Info label="Validade" value={new Date(validUntil).toLocaleDateString("pt-BR")} />}
          </div>
        </section>

        {/* Alertas */}
        {alerts.length > 0 && (
          <section className="mt-4 space-y-1.5">
            {alerts.map((a, i) => {
              const tone =
                a.sev === "danger" ? "bg-danger-soft text-danger" :
                a.sev === "warning" ? "bg-warning-soft text-warning" :
                "bg-accent/10 text-accent";
              const Icon = a.sev === "danger" ? ShieldAlert : AlertTriangle;
              return (
                <div key={i} className={cn("flex items-start gap-2 rounded-xl p-2.5 text-xs", tone)}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-medium">{a.msg}</span>
                </div>
              );
            })}
          </section>
        )}

        {/* Itens */}
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">Itens ({items.length})</h2>
          <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
            {items.map((it, idx) => {
              const p = productMap[it.productId];
              const m = itemMarginPct(it.price, p.cost);
              return (
                <div key={it.productId} className={cn("flex items-center justify-between gap-2 p-3", idx > 0 && "border-t border-border")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {it.qty}x {formatBRL(it.price)} · margem {formatPct(m)}
                    </p>
                  </div>
                  <p className="text-sm font-bold num">{formatBRL(it.price * it.qty)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Totais */}
        <section className="mt-4 rounded-2xl bg-card p-4 shadow-soft">
          <Row label="Subtotal" value={formatBRL(totals.gross)} />
          <Row label="Itens" value={`${totals.itemsCount} un.`} />
          <Row label="Margem" value={formatPct(totals.marginPct)} valueClass={
            totals.marginPct < 0 ? "text-danger" : totals.marginPct < 5 ? "text-warning" : "text-success"
          } />
          <Row label={`Comissão (${formatPct(totals.commissionPct)})`} value={formatBRL(totals.commissionValue)} valueClass="text-success" />
          <div className="mt-2 border-t border-border pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold num">{formatBRL(totals.gross)}</span>
          </div>
        </section>

        {/* Assinatura na entrega — OBRIGATÓRIA */}
        {requiresSignature && (
          <section
            id="signature-section"
            className={cn(
              "mt-4 rounded-2xl p-3 shadow-soft transition",
              showSignatureError && (!signature || signedBy.trim().length < 2)
                ? "bg-danger-soft border-2 border-danger"
                : "bg-card border-2 border-transparent"
            )}
          >
            <h3 className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold">
              <PenLine className="h-4 w-4 text-primary" /> Assinatura do recebedor
              <span className="ml-1 rounded-md bg-danger px-1.5 py-0.5 text-[10px] font-bold text-danger-foreground">
                OBRIGATÓRIO
              </span>
            </h3>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Para entregas é necessário capturar a assinatura e o nome de quem recebeu o pedido.
            </p>
            <SignaturePad value={signature} onChange={setSignature} />
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="Nome de quem recebeu *"
              className={cn(
                "mt-2 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary",
                showSignatureError && signedBy.trim().length < 2 ? "border-danger" : "border-border"
              )}
            />
            {showSignatureError && (!signature || signedBy.trim().length < 2) && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-danger px-2.5 py-2 text-[11px] font-semibold text-danger-foreground">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Não é possível confirmar o pedido sem
                  {!signature && " assinatura"}
                  {!signature && signedBy.trim().length < 2 && " e"}
                  {signedBy.trim().length < 2 && " nome do recebedor"}.
                </span>
              </div>
            )}
          </section>
        )}

        {/* Exports rápidos antes de enviar */}
        <section className="mt-4 rounded-2xl bg-card p-3 shadow-soft">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exportar agora</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => exportPDF(exportPayload)} className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/60 p-2.5 text-xs font-semibold">
              <FileDown className="h-4 w-4" /> PDF
            </button>
            <button onClick={() => exportCSV(exportPayload)} className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/60 p-2.5 text-xs font-semibold">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={() => shareWhatsApp(exportPayload)} className="flex items-center justify-center gap-1.5 rounded-xl bg-success p-2.5 text-xs font-semibold text-success-foreground">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          </div>
        </section>

        {/* Sticky CTA */}
        <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-2">
            <button
              onClick={() => setStep("edit")}
              className="rounded-xl bg-muted/60 px-4 py-3 text-sm font-semibold"
            >
              Corrigir
            </button>
            <button
              disabled={!canSubmit}
              onClick={confirmSubmit}
              className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isQuote ? "Salvar orçamento" : "Confirmar pedido"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </MobileShell>
    );
  }

  // ============ TELA DE EDIÇÃO ============
  return (
    <MobileShell hideTopBar>
      <div className="-mx-4 gradient-hero px-4 pb-4 pt-5 text-primary-foreground">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm opacity-90">
          <ArrowLeft className="h-4 w-4" /> Início
        </button>
        <h1 className="mt-2 text-xl font-bold">{isQuote ? "Novo orçamento" : "Novo pedido"}</h1>

        <button
          onClick={() => setPickerOpen(true)}
          className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white/15 p-3 text-left backdrop-blur transition active:scale-[0.99]"
        >
          {client ? (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{client.fantasy}</p>
                <ClientStatusBadge status={client.status} />
              </div>
              <p className="text-[11px] opacity-80">{client.city} · {client.segment}</p>
            </div>
          ) : (
            <p className="text-sm font-medium">Selecionar cliente</p>
          )}
          <ChevronRight className="h-5 w-5 opacity-80" />
        </button>
      </div>

      {!client ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Selecione um cliente para iniciar.</div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button onClick={repeatLastOrder} className="flex flex-col items-center gap-1 rounded-xl bg-card p-3 text-xs font-semibold shadow-soft">
              <Repeat className="h-4 w-4 text-primary" /> Repetir último
            </button>
            <Link to={`/clientes/${client.id}`} className="flex flex-col items-center gap-1 rounded-xl bg-card p-3 text-xs font-semibold shadow-soft">
              <FileText className="h-4 w-4 text-primary" /> Visão 360
            </Link>
            <button onClick={() => setProductPickerOpen(true)} className="flex flex-col items-center gap-1 rounded-xl bg-primary p-3 text-xs font-semibold text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4" /> Produto
            </button>
          </div>

          {alerts.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {alerts.map((a, i) => {
                const tone =
                  a.sev === "danger" ? "bg-danger-soft text-danger" :
                  a.sev === "warning" ? "bg-warning-soft text-warning" :
                  "bg-accent/10 text-accent";
                const Icon = a.sev === "danger" ? ShieldAlert : AlertTriangle;
                return (
                  <div key={i} className={cn("flex items-start gap-2 rounded-xl p-2.5 text-xs", tone)}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="font-medium">{a.msg}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Items */}
          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Itens do pedido</h2>
              <span className="text-xs text-muted-foreground">{totals.itemsCount} unidades</span>
            </div>

            {items.length === 0 && (
              <button
                onClick={() => setProductPickerOpen(true)}
                className="grid w-full place-items-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground"
              >
                <Plus className="mb-1 h-5 w-5" />
                Toque para adicionar produtos
              </button>
            )}

            <div className="space-y-2">
              {items.map(it => {
                const p = productMap[it.productId];
                const ph = priceHealth(it.price, p);
                const itemMargin = itemMarginPct(it.price, p.cost);
                return (
                  <div key={it.productId} className="rounded-2xl bg-card p-3 shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <HealthDot level={ph} />
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{p.brand} · {p.unit} · cód {p.code}</p>
                      </div>
                      <button onClick={() => removeItem(it.productId)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-lg bg-muted/60 p-1.5 text-center">
                        <p className="text-muted-foreground">PSV</p>
                        <p className="font-semibold num">{formatBRL(p.psv)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-1.5 text-center">
                        <p className="text-muted-foreground">PMV</p>
                        <p className="font-semibold num">{formatBRL(p.pmv)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-1.5 text-center">
                        <p className="text-muted-foreground">Último</p>
                        <p className="font-semibold num">{it.lastPrice ? formatBRL(it.lastPrice) : "—"}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center rounded-xl bg-muted/60">
                        <button onClick={() => updateQty(it.productId, -1)} className="grid h-9 w-9 place-items-center rounded-l-xl active:bg-muted">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold num">{it.qty}</span>
                        <button onClick={() => updateQty(it.productId, +1)} className="grid h-9 w-9 place-items-center rounded-r-xl active:bg-muted">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-1 items-center gap-1 rounded-xl border border-border bg-card px-2">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={it.price}
                          onChange={e => updatePrice(it.productId, parseFloat(e.target.value) || 0)}
                          className="h-9 w-full bg-transparent text-right text-sm font-semibold outline-none num"
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <HealthPill level={marginHealth(itemMargin)} label={`Margem ${formatPct(itemMargin)}`} />
                      <p className="text-sm font-bold num">{formatBRL(it.price * it.qty)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {suggestions.length > 0 && (
            <section className="mt-5 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-primary text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold">Copiloto sugere</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {suggestions.map(s => (
                  <button
                    key={s.product.id}
                    onClick={() => addProduct(s.product.id)}
                    className="w-44 shrink-0 rounded-xl bg-card p-3 text-left shadow-soft transition active:scale-[0.97]"
                  >
                    <span className={cn(
                      "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      s.reason === "Em promoção" && "bg-warning-soft text-warning",
                      s.reason === "Costuma comprar" && "bg-accent/15 text-accent",
                      s.reason === "Recupera margem" && "bg-success-soft text-success",
                    )}>
                      {s.reason}
                    </span>
                    <p className="mt-1.5 line-clamp-2 text-xs font-semibold">{s.product.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{s.product.unit}</p>
                    <p className="mt-1 text-sm font-bold num">{formatBRL(s.product.psv)}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5 space-y-3">
            <div className="rounded-2xl bg-card p-3 shadow-soft">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de pedido</p>
              <div className="grid grid-cols-3 gap-2">
                {(["entrega","retirada","orcamento"] as OrderType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={cn(
                      "rounded-xl px-2 py-2 text-xs font-semibold capitalize transition",
                      orderType === t ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
                    )}
                  >
                    {t === "orcamento" ? "Orçamento" : t}
                  </button>
                ))}
              </div>
            </div>

            {isQuote && (
              <div className="rounded-2xl bg-card p-3 shadow-soft">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" /> Validade do orçamento
                </p>
                <input
                  type="date"
                  value={validUntil}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Status inicial: <strong className="text-foreground">Enviado</strong>. O orçamento não bloqueia faturamento.
                </p>
              </div>
            )}

            {orderType === "entrega" && (
              <div className="rounded-2xl bg-card p-3 shadow-soft">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> Logística
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["manha","tarde","noite"] as Shift[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setShift(s)}
                      className={cn(
                        "rounded-xl px-2 py-2 text-xs font-semibold capitalize transition",
                        shift === s ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
                      )}
                    >
                      {s === "manha" ? "Manhã" : s === "tarde" ? "Tarde" : "Noite"}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Capacidade do dia</span>
                    <span className="num">{(logistics.scheduledKg + totals.weightKg).toFixed(0)}kg / {logistics.capacityKg}kg</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full transition-all", capacityWarning ? "bg-danger" : "bg-success")}
                      style={{ width: `${Math.min(100, ((logistics.scheduledKg + totals.weightKg) / logistics.capacityKg) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <Package className="h-3 w-3" /> Melhor dia sugerido: <strong className="text-foreground">amanhã (qua)</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-card p-3 shadow-soft">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condição de pagamento</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {["À vista","7 dias","14 dias","21 dias","28 dias","30/60","30/60/90"].map(t => (
                  <button
                    key={t}
                    onClick={() => setPaymentTerm(t)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      paymentTerm === t ? "bg-primary text-primary-foreground" : "bg-muted/60"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Sticky bar */}
      {client && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-lg font-bold num">{formatBRL(totals.gross)}</p>
                <div className="flex items-center gap-2 text-[11px]">
                  <HealthPill level={marginHealth(totals.marginPct)} label={`${formatPct(totals.marginPct)}`} />
                  <span className="text-muted-foreground">Comissão <strong className="text-success num">{formatBRL(totals.commissionValue)}</strong></span>
                </div>
              </div>
              <button
                disabled={!canSubmit}
                onClick={() => setStep("review")}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50 inline-flex items-center gap-2"
              >
                Revisar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <BottomSheet onClose={() => setPickerOpen(false)} title="Selecionar cliente">
          <ClientPicker onPick={(id) => { setClientId(id); setItems([]); setPickerOpen(false); }} />
        </BottomSheet>
      )}

      {productPickerOpen && (
        <BottomSheet onClose={() => setProductPickerOpen(false)} title="Adicionar produto">
          <ProductPicker
            inOrder={new Set(items.map(i => i.productId))}
            onPick={(id) => { addProduct(id); }}
          />
        </BottomSheet>
      )}
    </MobileShell>
  );
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-1.5 text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold truncate">{value}</p>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold num", valueClass)}>{value}</span>
    </div>
  );
}

function BottomSheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-t-3xl bg-background shadow-elevated animate-slide-up overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  );
}

function ClientPicker({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = clients.filter(c => (c.fantasy + c.name + c.city).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar cliente..."
          className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        {list.map(c => {
          const hasAlert = c.overdueAmount > 0 || c.status === "bloqueado";
          return (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className="flex w-full items-start justify-between gap-3 rounded-xl bg-card p-3 text-left shadow-soft"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{c.fantasy}</p>
                  <ClientStatusBadge status={c.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">{c.city} · {c.segment}</p>
                {hasAlert && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-danger">
                    <AlertTriangle className="h-3 w-3" /> {c.overdueAmount > 0 ? `${formatBRL(c.overdueAmount)} vencidos` : "Bloqueado"}
                  </p>
                )}
              </div>
              <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </>
  );
}

function ProductPicker({ inOrder, onPick }: { inOrder: Set<string>; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = products.filter(p =>
    (p.name + p.brand + p.code + p.category).toLowerCase().includes(q.toLowerCase())
  );
  return (
    <>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        {list.map(p => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className="flex w-full items-start justify-between gap-3 rounded-xl bg-card p-3 text-left shadow-soft transition active:scale-[0.99]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                {p.promo && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">
                    <Tag className="h-3 w-3" /> PROMO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{p.brand} · {p.unit} · cód {p.code}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">PSV <strong className="text-foreground num">{formatBRL(p.psv)}</strong> · PMV <span className="num">{formatBRL(p.pmv)}</span></p>
            </div>
            <span className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full text-white",
              inOrder.has(p.id) ? "bg-success" : "bg-primary"
            )}>
              {inOrder.has(p.id) ? <CheckCircle2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

export default NovoPedido;

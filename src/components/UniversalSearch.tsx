import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Package, Tag, Sparkles } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { clients, products, formatBRL } from "@/lib/mock";
import { ClientStatusBadge } from "./ClientStatusBadge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UniversalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  // Atalho global: "/" ou Ctrl/Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-xl top-[20%] translate-y-0">
        <Command shouldFilter={false} className="rounded-lg">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              autoFocus
              value={q}
              onValueChange={setQ}
              placeholder="Buscar cliente, produto, código..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground border-0"
            />
            <kbd className="hidden sm:inline-flex pointer-events-none ml-2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nada encontrado para "{q}".
              </div>
            </CommandEmpty>

            {q.trim().length === 0 && (
              <CommandGroup heading="Ações rápidas">
                <CommandItem onSelect={() => go("/pedido/novo")}>
                  <Sparkles className="mr-2 h-4 w-4 text-accent" />
                  Iniciar novo pedido
                </CommandItem>
                <CommandItem onSelect={() => go("/orcamentos")}>
                  <Tag className="mr-2 h-4 w-4 text-primary" />
                  Ver orçamentos
                </CommandItem>
                <CommandItem onSelect={() => go("/clientes")}>
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  Carteira de clientes
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading={`Clientes (${filterClients(q).length})`}>
              {filterClients(q).slice(0, 6).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`cli-${c.id}`}
                  onSelect={() => go(`/clientes/${c.id}`)}
                  className="flex items-start gap-2"
                >
                  <Users className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.fantasy}</span>
                      <ClientStatusBadge status={c.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.city} · {c.segment}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      go(`/pedido/novo?cliente=${c.id}`);
                    }}
                    className="ml-2 shrink-0 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                  >
                    Pedido
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading={`Produtos (${filterProducts(q).length})`}>
              {filterProducts(q).slice(0, 6).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`prod-${p.id}`}
                  onSelect={() => go(`/pedido/novo?produto=${p.id}`)}
                  className="flex items-start gap-2"
                >
                  <Package className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.promo && (
                        <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">
                          PROMO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.brand} · {p.unit} · cód {p.code}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 text-xs font-bold num">{formatBRL(p.psv)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function filterClients(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return clients;
  return clients.filter((c) =>
    (c.fantasy + " " + c.name + " " + c.city + " " + c.segment).toLowerCase().includes(s)
  );
}

function filterProducts(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return products;
  return products.filter((p) =>
    (p.name + " " + p.brand + " " + p.code + " " + p.category).toLowerCase().includes(s)
  );
}

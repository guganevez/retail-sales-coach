import { useState } from "react";
import { MapPin, Clock, Check, X, Loader2, LogIn, LogOut } from "lucide-react";
import { Visit, useAgenda } from "@/lib/agenda";
import { formatBRL } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CheckInOutProps {
  visit: Visit;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function CheckInOut({ visit }: CheckInOutProps) {
  const { update } = useAgenda();
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [realizedInput, setRealizedInput] = useState(String(visit.projected));

  const captureGeo = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 },
      );
    });

  const doCheckIn = async () => {
    setLoadingGeo(true);
    const geo = await captureGeo();
    setLoadingGeo(false);
    update(visit.id, {
      status: "em_visita",
      checkIn: {
        at: new Date().toISOString(),
        geo,
        geoError: geo ? undefined : "Localização indisponível",
      },
    });
  };

  const doCheckOut = async () => {
    const realized = Number(realizedInput.replace(/\./g, "").replace(",", ".")) || 0;
    setLoadingGeo(true);
    const geo = await captureGeo();
    setLoadingGeo(false);
    update(visit.id, {
      status: "concluida",
      realized,
      checkOut: {
        at: new Date().toISOString(),
        geo,
        geoError: geo ? undefined : "Localização indisponível",
      },
    });
    setCheckoutOpen(false);
  };

  const cancelCheckIn = () => {
    update(visit.id, { status: "pendente", checkIn: undefined });
  };

  if (visit.status === "concluida") {
    return (
      <div className="mt-2 rounded-xl bg-success-soft p-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-success">
          <Check className="h-3 w-3" /> Concluída
          {visit.realized != null && (
            <span className="num">· {formatBRL(visit.realized)}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-success/80">
          {visit.checkIn?.at && (
            <span><LogIn className="mr-0.5 inline h-3 w-3" />{fmtTime(visit.checkIn.at)}</span>
          )}
          {visit.checkOut?.at && (
            <span><LogOut className="mr-0.5 inline h-3 w-3" />{fmtTime(visit.checkOut.at)}</span>
          )}
          {visit.checkIn?.geo && (
            <span><MapPin className="mr-0.5 inline h-3 w-3" />
              {visit.checkIn.geo.lat.toFixed(4)}, {visit.checkIn.geo.lng.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (visit.status === "em_visita") {
    return (
      <>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-primary/10 p-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <Clock className="h-3 w-3 animate-pulse" /> Em visita
              {visit.checkIn?.at && (
                <span>· check-in {fmtTime(visit.checkIn.at)}</span>
              )}
            </div>
            {visit.checkIn?.geo && (
              <p className="mt-0.5 text-primary/80">
                <MapPin className="mr-0.5 inline h-3 w-3" />
                {visit.checkIn.geo.lat.toFixed(4)}, {visit.checkIn.geo.lng.toFixed(4)}
              </p>
            )}
            {visit.checkIn?.geoError && (
              <p className="mt-0.5 text-warning">{visit.checkIn.geoError}</p>
            )}
          </div>
          <button
            onClick={cancelCheckIn}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition active:scale-95 hover:bg-muted"
            aria-label="Cancelar check-in"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setRealizedInput(String(visit.projected)); setCheckoutOpen(true); }}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-success px-3 text-xs font-bold text-success-foreground transition active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" /> Check-out
          </button>
        </div>

        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Concluir visita</DialogTitle>
              <DialogDescription>
                Registre o valor realizado na visita.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Valor realizado (R$)
              </label>
              <Input
                inputMode="decimal"
                value={realizedInput}
                onChange={(e) => setRealizedInput(e.target.value)}
                placeholder="0,00"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Projetado: {formatBRL(visit.projected)}
              </p>
            </div>
            <DialogFooter>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="rounded-xl border border-border px-3 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={doCheckOut}
                disabled={loadingGeo}
                className={cn(
                  "rounded-xl bg-success px-3 py-2 text-sm font-bold text-success-foreground inline-flex items-center gap-1.5",
                  loadingGeo && "opacity-50"
                )}
              >
                {loadingGeo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Confirmar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // pendente / remarcada
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={doCheckIn}
        disabled={loadingGeo}
        className={cn(
          "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition active:scale-95",
          loadingGeo && "opacity-50"
        )}
      >
        {loadingGeo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
        Check-in
      </button>
    </div>
  );
}

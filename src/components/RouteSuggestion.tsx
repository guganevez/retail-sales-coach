import { useMemo } from "react";
import { Route, MapPin, Clock, Navigation } from "lucide-react";
import { Visit } from "@/lib/agenda";
import { clients } from "@/lib/mock";
import { clientGeo } from "@/lib/geo";
import { optimizeRoute, formatKm, formatMinutes } from "@/lib/route";
import { COMPANY } from "@/lib/tracking";

interface RouteSuggestionProps {
  visits: Visit[];
}

const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

export function RouteSuggestion({ visits }: RouteSuggestionProps) {
  const eligible = visits.filter(v => v.status === "pendente" || v.status === "em_visita");

  const stops = useMemo(
    () => optimizeRoute(eligible, (v) => clientGeo(v.clientId)),
    [eligible],
  );

  if (stops.length < 2) return null;

  const last = stops[stops.length - 1];

  return (
    <section className="rounded-2xl bg-card p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Route className="h-4 w-4 text-primary" />
          Roteiro sugerido
        </h3>
        <span className="text-[10px] font-bold uppercase text-muted-foreground">
          nearest-neighbor
        </span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/50 p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Paradas</p>
          <p className="text-base font-bold num">{stops.length}</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Distância</p>
          <p className="text-base font-bold num">{formatKm(last.cumulativeKm)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Tempo est.</p>
          <p className="text-base font-bold num">{formatMinutes(last.cumulativeMinutes)}</p>
        </div>
      </div>

      <ol className="space-y-1.5">
        <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            CD
          </span>
          <span className="flex-1 truncate">{COMPANY.name} (saída)</span>
        </li>
        {stops.map((s, i) => {
          const c = clientMap[s.item.clientId];
          if (!c) return null;
          return (
            <li key={s.item.id} className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-accent text-[10px] font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold">{c.fantasy}</p>
                <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />{c.city}
                  <span className="mx-0.5">·</span>
                  <Navigation className="h-2.5 w-2.5" />{formatKm(s.legKm)}
                  <span className="mx-0.5">·</span>
                  <Clock className="h-2.5 w-2.5" />{formatMinutes(s.cumulativeMinutes)} acum.
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground capitalize">
                {s.item.shift}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Estimativa: 4 min/km de trajeto + 25 min por visita.
      </p>
    </section>
  );
}

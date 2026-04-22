import { Link } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { smartAlerts } from "@/lib/mock";
import { AlertCircle, AlertTriangle, ArrowRight, Info } from "lucide-react";

const iconFor = (sev: string) => sev === "danger" ? AlertCircle : sev === "warning" ? AlertTriangle : Info;
const toneFor = (sev: string) =>
  sev === "danger" ? "bg-danger-soft text-danger" :
  sev === "warning" ? "bg-warning-soft text-warning" :
  "bg-accent/10 text-accent";

const Alertas = () => {
  return (
    <MobileShell title="Alertas" subtitle="Inteligentes em tempo real">
      <div className="space-y-2">
        {smartAlerts.map(a => {
          const Icon = iconFor(a.severity);
          const card = (
            <div className="flex items-start gap-3 rounded-2xl bg-card p-3 shadow-soft transition active:scale-[0.99]">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneFor(a.severity)}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
                {a.cta && <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">{a.cta} <ArrowRight className="h-3 w-3" /></p>}
              </div>
            </div>
          );
          return a.clientId ? (
            <Link key={a.id} to={`/clientes/${a.clientId}`}>{card}</Link>
          ) : (
            <div key={a.id}>{card}</div>
          );
        })}
      </div>
    </MobileShell>
  );
};

export default Alertas;

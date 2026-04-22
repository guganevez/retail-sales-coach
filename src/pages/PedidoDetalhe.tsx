import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { OrderTracking } from "@/components/OrderTracking";
import { trackedOrders } from "@/lib/tracking";

const PedidoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = trackedOrders.find(o => o.id === id);

  if (!order) {
    return (
      <MobileShell title="Pedido" subtitle="Não encontrado">
        <Link to="/pedidos" className="text-sm text-primary">Voltar para pedidos</Link>
      </MobileShell>
    );
  }

  return (
    <MobileShell title={order.id} subtitle="Rastreio do pedido">
      <button
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <OrderTracking order={order} />
    </MobileShell>
  );
};

export default PedidoDetalhe;

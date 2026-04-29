import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Clientes from "./pages/Clientes.tsx";
import ClienteDetalhe from "./pages/ClienteDetalhe.tsx";
import NovoPedido from "./pages/NovoPedido.tsx";
import Painel from "./pages/Painel.tsx";
import Alertas from "./pages/Alertas.tsx";
import Orcamentos from "./pages/Orcamentos.tsx";
import Pedidos from "./pages/Pedidos.tsx";
import PedidoDetalhe from "./pages/PedidoDetalhe.tsx";
import NotFound from "./pages/NotFound.tsx";
import Agenda from "./pages/Agenda.tsx";
import { ProfileProvider } from "./lib/profile";
import { QuotesProvider } from "./lib/quotes";
import { DraftProvider } from "./lib/draft";
import { HolidaysProvider } from "./lib/holidays";
import { AgendaProvider } from "./lib/agenda";
import { CycleProvider } from "./lib/cycleConfig";
import { DailyGoalViewProvider } from "./lib/dailyGoalView";
import { ActionPlansProvider } from "./lib/actionPlans";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProfileProvider>
        <HolidaysProvider>
          <CycleProvider>
            <AgendaProvider>
              <QuotesProvider>
                <DraftProvider>
                  <DailyGoalViewProvider>
                    <ActionPlansProvider>
                    <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/clientes/:id" element={<ClienteDetalhe />} />
                      <Route path="/pedido/novo" element={<NovoPedido />} />
                      <Route path="/pedidos" element={<Pedidos />} />
                      <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
                      <Route path="/orcamentos" element={<Orcamentos />} />
                      <Route path="/painel" element={<Painel />} />
                      <Route path="/agenda" element={<Agenda />} />
                      <Route path="/alertas" element={<Alertas />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                    </ActionPlansProvider>
                  </DailyGoalViewProvider>
                </DraftProvider>
              </QuotesProvider>
            </AgendaProvider>
          </CycleProvider>
        </HolidaysProvider>
      </ProfileProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

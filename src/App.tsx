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
import NotFound from "./pages/NotFound.tsx";
import { ProfileProvider } from "./lib/profile";
import { QuotesProvider } from "./lib/quotes";
import { DraftProvider } from "./lib/draft";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProfileProvider>
        <QuotesProvider>
          <DraftProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<ClienteDetalhe />} />
                <Route path="/pedido/novo" element={<NovoPedido />} />
                <Route path="/orcamentos" element={<Orcamentos />} />
                <Route path="/painel" element={<Painel />} />
                <Route path="/alertas" element={<Alertas />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DraftProvider>
        </QuotesProvider>
      </ProfileProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

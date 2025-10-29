import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArkivClientProvider } from "./features/arkiv-client/components/ArkivClientProvider";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ArkivClientProvider>
        <App />
      </ArkivClientProvider>
    </QueryClientProvider>
  </StrictMode>
);

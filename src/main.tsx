import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHashRouter, RouterProvider } from "react-router-dom";

import "./index.css";

import App from "./App";
import DashboardPage from "./pages/DashboardPage";
import PlanetsPage from "./pages/PlanetsPage";
import VisualizationPage from "./pages/VisualizationPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import AdminDeletedPage from "./pages/AdminDeletedPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 1000 * 60 * 60,
    },
  },
});

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "planets", element: <PlanetsPage /> },
      { path: "visualization", element: <VisualizationPage /> },
      { path: "diagnostics", element: <DiagnosticsPage /> },
      { path: "admin/deleted", element: <AdminDeletedPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);

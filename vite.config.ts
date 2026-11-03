import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
// Vars VITE_* vêm do ambiente (Vercel/.env) e o Vite as injeta nativamente em
// import.meta.env. Sem fallback hardcoded: se a env faltar, o app falha alto em
// vez de apontar silenciosamente para um projeto Supabase morto.
export default defineConfig(() => {
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: false },
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    build: {
      target: "esnext",
      cssMinify: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              // Radix sai em chunk próprio: o Rollup emite `import` de vendor-ui
              // para vendor-react, e o carregamento ESM garante que React já
              // esteja avaliado quando os createContext do Radix rodarem.
              // cmdk embrulha primitivas do Radix: se ficasse no vendor-react
              // criaria um ciclo vendor-react <-> vendor-ui, e em ciclo a ordem
              // de avaliação ESM deixa de ser garantida (TDZ).
              if (
                id.includes("@radix-ui") ||
                id.includes("cmdk")
              ) return "vendor-ui";
              // React e tudo que depende diretamente de React vai junto para evitar
              // que createContext seja chamado antes do React estar disponível.
              if (
                id.includes("react-dom") ||
                id.includes("react-router-dom") ||
                id.includes("react/") ||
                /[/\\]react[/\\]/.test(id) ||
                id.includes("react-dropzone") ||
                id.includes("next-themes") ||
                id.includes("sonner") ||
                id.includes("framer-motion")
              ) return "vendor-react";
              if (id.includes("@tanstack")) return "vendor-query";
              if (id.includes("@supabase")) return "vendor-supabase";
              // recharts/d3 têm deps circulares — deixar o Rollup resolver naturalmente evita TDZ
              // if (id.includes("recharts") || ...) — removido intencionalmente
              if (id.includes("lucide")) return "vendor-icons";
              if (id.includes("exceljs")) return "vendor-exceljs";
              if (id.includes("date-fns") || id.includes("react-day-picker")) return "vendor-date";
            }
          },
        },
      },
    },
  };
});

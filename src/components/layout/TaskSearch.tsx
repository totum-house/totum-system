import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTaskSearch } from "@/hooks/useTaskSearch";

export function TaskSearch() {
  const [open, setOpen] = useState(false);
  const { results, search } = useTaskSearch();
  const navigate = useNavigate();

  // Debounce: a busca vai ao Supabase (ilike); sem isso cada tecla dispara uma query.
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const debouncedSearch = useCallback((term: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(term), 300);
  }, [search]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Buscar tarefas"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors text-sm"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Buscar tarefas...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar tarefas..." onValueChange={debouncedSearch} />
        <CommandList>
          <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
          <CommandGroup heading="Tarefas">
            {results.map(t => (
              <CommandItem
                key={t.id}
                onSelect={() => { setOpen(false); navigate("/tarefas"); }}
                className="flex items-center justify-between"
              >
                <div>
                  <span className="font-medium">{t.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {(t.clients as any)?.name}
                    {(t.projects as any)?.name && ` · ${(t.projects as any).name}`}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{t.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
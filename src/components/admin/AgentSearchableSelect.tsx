import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  serial_number?: string | null;
  phone?: string | null;
}

interface Props {
  agents: Agent[];
  value: string;
  onChange: (id: string) => void;
}

export default function AgentSearchableSelect({ agents, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = agents.find((a) => a.id === value);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return agents;
    return agents.filter((a) =>
      [a.name, a.serial_number, a.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [agents, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-64 justify-between" role="combobox">
          <span className="truncate">
            {selected ? `${selected.name} - ${selected.serial_number || ""}` : "اختر مندوب"}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 mr-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="ابحث بالاسم، الكود، أو رقم الهاتف"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 border-0 focus-visible:ring-0 px-1"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
          ) : (
            filtered.map((a) => (
              <button
                type="button"
                key={a.id}
                className={`w-full text-right px-3 py-2 hover:bg-accent flex items-center justify-between text-sm ${
                  a.id === value ? "bg-accent" : ""
                }`}
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="truncate">
                  {a.name}
                  {a.serial_number ? ` - ${a.serial_number}` : ""}
                  {a.phone ? ` (${a.phone})` : ""}
                </span>
                {a.id === value && <Check className="h-4 w-4" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import type { SearchHit } from "../lib/types";
import { CodeDisplay, EmptyState, Input, SectionTitle, Skeleton, StatusChip, Card, Tabs } from "../components/ui/Primitives";
import { DataTable } from "../components/ui/Data";
import type { Column } from "../components/ui/Data";

export default function Golden() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [items, setItems] = useState<SearchHit[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUPERSEDED">("ALL");

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    api.search(q).then((r) => alive && setItems(r.items));
    return () => {
      alive = false;
    };
  }, [q]);

  const rows = (items ?? []).filter((r) => statusFilter === "ALL" || r.status === statusFilter);

  const columns: Column<SearchHit>[] = [
    { key: "cmc", label: "CMC", width: "300px", render: (r) => <CodeDisplay code={r.cmc} size="sm" /> },
    {
      key: "desc",
      label: "Standardized description",
      render: (r) => <span className="text-ink-2 text-[12.5px]">{r.description}</span>,
    },
    {
      key: "class",
      label: "Class",
      render: (r) => (
        <StatusChip tone="ink" dot={false}>
          {r.class}
        </StatusChip>
      ),
    },
    {
      key: "links",
      label: "CPSE links",
      align: "right",
      render: (r) => <span className="num text-ink-2">{r.cpse_count}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) =>
        r.status === "SUPERSEDED" ? (
          <StatusChip tone="unknown">SUPERSEDED</StatusChip>
        ) : (
          <StatusChip tone="match">ACTIVE</StatusChip>
        ),
    },
  ];

  return (
    <Card>
      <SectionTitle
        right={
          <Tabs
            tabs={[
              { id: "ALL", label: "All" },
              { id: "ACTIVE", label: "Active" },
              { id: "SUPERSEDED", label: "Superseded" },
            ]}
            active={statusFilter}
            onChange={(id) => setStatusFilter(id as typeof statusFilter)}
          />
        }
      >
        Golden master
      </SectionTitle>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by CMC code, description or CPSE code…"
          className="!pl-10"
        />
      </div>

      {items === null ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.cmc}
          onRowClick={(r) => navigate(`/golden/${r.cmc}`)}
          emptyTitle="No golden records match"
          emptyBody="Try a shorter query — search runs on codes, standardized descriptions and linked CPSE codes."
        />
      )}
    </Card>
  );
}

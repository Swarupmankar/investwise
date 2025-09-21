// src/pages/Transactions.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  TrendingUp,
  Users,
  Search,
  Filter,
  Download,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetTransactionsQuery } from "@/API/transactions.api";
import { Skeleton } from "@/components/ui/skeleton";

/** UI helpers */
const getTypeIcon = (type: string) => {
  switch (type) {
    case "deposit":
      return <ArrowDownToLine className="h-4 w-4 text-primary" />;
    case "withdrawal":
      return <ArrowUpFromLine className="h-4 w-4 text-warning" />;
    case "return":
      return <TrendingUp className="h-4 w-4 text-success" />;
    case "referral":
      return <Users className="h-4 w-4 text-purple-600" />;
    default:
      return null;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "deposit":
      return "bg-primary/10 text-primary border-primary/20";
    case "withdrawal":
      return "bg-warning/10 text-warning border-warning/20";
    case "return":
      return "bg-success/10 text-success border-success/20";
    case "referral":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const getStatusColor = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "approved":
    case "success":
      return "bg-success/10 text-success border-success/20";
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
    case "rejected":
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Empty / error card */
function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-8 sm:p-10 md:p-12 text-center">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

type ServerDeposit = {
  id: number;
  userId: number;
  amount: string;
  txId: string | null;
  proofUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

type ServerWithdraw = {
  id: number;
  userId: number;
  amount: string;
  userProofUrl?: string | null;
  adminProofUrl?: string | null;
  status: string;
  withdrawFrom?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type UnifiedTx = {
  id: string;
  kind: "deposit" | "withdrawal";
  amount: number;
  txRef: string; // txId or proof url or id fallback
  proofUrl?: string | null;
  status: string;
  createdAt: string | null;
  source: string; // explicit source field for UI
};

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "deposit" | "withdrawal"
  >("all");
  const [dateFilter, setDateFilter] = useState("all");

  const {
    data: resp,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetTransactionsQuery();

  // Normalize deposits + withdrawals into a single list, include source field
  const unified = useMemo<UnifiedTx[]>(() => {
    const deposits: ServerDeposit[] = Array.isArray(resp?.deposits)
      ? resp!.deposits
      : [];
    const withdrawls: ServerWithdraw[] = Array.isArray(resp?.withdrawls)
      ? resp!.withdrawls
      : [];

    // helper to map withdrawFrom -> human label
    const mapWithdrawFromToLabel = (raw?: string | null) => {
      if (!raw) return "—";
      const key = String(raw).trim();
      const lower = key.toLowerCase();
      if (lower === "funds_available") return "Principal";
      if (lower === "investment_returns" || lower === "investment_returns")
        return "Returns";
      if (lower === "investment_returns" || lower === "investment_returns")
        return "Returns"; // defensive
      if (lower === "investments_returns") return "Returns"; // defensive typo
      if (lower === "investment_returns" || lower === "investments_returns")
        return "Returns";
      if (lower === "investment_returns" || lower === "investment_returns")
        return "Returns";
      if (lower === "investment_returns") return "Returns";
      if (
        lower === "referral_earning" ||
        lower === "referral_earnings" ||
        lower === "referral_earning"
      )
        return "Referral";
      if (lower === "referral_earning" || lower === "referral_earnings")
        return "Referral";
      if (lower === "referral_earning") return "Referral";
      if (lower === "referral_earning") return "Referral";
      if (lower === "referral_earning") return "Referral";
      // handle some likely variants:
      if (lower.includes("return")) return "Returns";
      if (lower.includes("referral")) return "Referral";
      if (lower === "wallet") return "Wallet";
      // fallback: capitalize and replace underscores
      return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const mappedDeposits: UnifiedTx[] = deposits.map((d) => ({
      id: `deposit-${d.id}`,
      kind: "deposit",
      amount: Number(String(d.amount ?? "0").replace(/,/g, "")) || 0,
      txRef: d.txId ?? "",
      proofUrl: d.proofUrl ?? null,
      status: String(d.status ?? "").toUpperCase(),
      createdAt: d.createdAt ?? d.updatedAt ?? null,
      source: "Principal", // per requirement: deposits show Principal
    }));

    const mappedWithdraws: UnifiedTx[] = withdrawls.map((w) => {
      const rawFrom = w.withdrawFrom ?? "";
      const sourceLabel = mapWithdrawFromToLabel(rawFrom);
      return {
        id: `withdraw-${w.id}`,
        kind: "withdrawal",
        amount: Number(String(w.amount ?? "0").replace(/,/g, "")) || 0,
        txRef: w.userProofUrl ?? w.adminProofUrl ?? String(w.id),
        proofUrl: w.userProofUrl ?? w.adminProofUrl ?? null,
        status: String(w.status ?? "").toUpperCase(),
        createdAt: w.createdAt ?? w.updatedAt ?? null,
        source: sourceLabel,
      };
    });

    const combined = [...mappedDeposits, ...mappedWithdraws];
    combined.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return combined;
  }, [resp]);

  // Filter & search
  const filtered = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    return unified.filter((tx) => {
      if (typeFilter !== "all" && tx.kind !== typeFilter) return false;

      // date filtering
      if (dateFilter !== "all" && tx.createdAt) {
        const created = new Date(tx.createdAt);
        const now = new Date();
        if (dateFilter === "today") {
          if (created.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "week") {
          const diffDays =
            (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) return false;
        } else if (dateFilter === "month") {
          if (
            created.getMonth() !== now.getMonth() ||
            created.getFullYear() !== now.getFullYear()
          )
            return false;
        } else if (dateFilter === "year") {
          if (created.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (!lower) return true;
      if (String(tx.amount).toLowerCase().includes(lower)) return true;
      if ((tx.txRef ?? "").toLowerCase().includes(lower)) return true;
      if ((tx.source ?? "").toLowerCase().includes(lower)) return true;
      return false;
    });
  }, [unified, searchTerm, typeFilter, dateFilter]);

  // skeleton count
  const skeletonCount = 6;

  // export visible rows
  const handleExport = () => {
    if (!filtered || filtered.length === 0) return;
    const rows = [["id", "kind", "amount", "source", "status", "createdAt"]];
    filtered.forEach((r) =>
      rows.push([
        r.id,
        r.kind,
        String(r.amount),
        r.source,
        r.status,
        String(r.createdAt),
      ])
    );
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Transaction History
          </h1>
          <p className="text-muted-foreground text-lg">
            Deposits & Withdrawals — complete chronological history
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 text-base font-medium rounded-xl"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            <Download className="h-5 w-5 mr-2" />
            Export History
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-premium">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by amount, source or tx id / proof..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as any)}
            >
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table / content */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-foreground">Transactions</CardTitle>
          <p className="text-muted-foreground">
            Showing {filtered.length} item(s)
          </p>
        </CardHeader>

        <CardContent>
          {/* Loading skeleton */}
          {(isLoading || isFetching) && (
            <div className="space-y-3">
              {Array.from({ length: skeletonCount }).map((_, idx) => (
                <div key={idx} className="p-3 bg-muted/10 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!isLoading && isError && (
            <div className="space-y-4 text-center">
              <EmptyCard
                title="Unable to load transactions"
                message="There was a problem loading transactions. Try refreshing."
              />
              <Button variant="default" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          )}

          {/* Empty (no transactions) */}
          {!isLoading && !isError && unified.length === 0 && (
            <EmptyCard
              title="No transactions"
              message="You don't have any transactions yet."
            />
          )}

          {/* Table */}
          {!isLoading && !isError && unified.length > 0 && (
            <>
              {filtered.length === 0 ? (
                <EmptyCard
                  title="No matching transactions"
                  message="Try a different search or date filter."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getTypeIcon(t.kind)}
                            <div>
                              <Badge
                                className={cn("border", getTypeColor(t.kind))}
                              >
                                {t.kind === "deposit"
                                  ? "Deposit"
                                  : "Withdrawal"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p
                            className={cn(
                              "font-bold",
                              t.kind === "deposit"
                                ? "text-success"
                                : "text-warning"
                            )}
                          >
                            {t.kind === "deposit" ? "+" : "-"}$
                            {t.amount.toLocaleString()}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-muted-foreground text-sm truncate max-w-[220px]">
                            {t.source || "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-foreground">
                            {t.createdAt ? formatDate(t.createdAt) : "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn("border", getStatusColor(t.status))}
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBanner from "@/components/NotificationBanner";
import { useNavigate } from "react-router-dom";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import QuestionnaireModal from "@/components/QuestionnaireModal";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  useGetAllInvestmentsQuery,
  useGetInvestmentPortfolioQuery,
} from "@/API/investmentApi";
import { useIsAnsweredQuery } from "@/API/onbording.api";

const normalizeStatus = (raw?: string) => {
  const s = String(raw || "").toLowerCase();
  if (s === "archived" || s === "archive") return "closed"; // show as CLOSED
  return s;
};

// helper functions (unchanged)
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const firstOfNextMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 1);
const lastOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const computeMonthlyCycle = (referenceDate?: string | Date) => {
  const now = new Date();

  // default calendar-window: first of this month -> first of next month
  const startOfThisMonth = firstOfMonth(now);
  const firstOfNext = firstOfNextMonth(now);

  // If referenceDate provided and valid, normalize to its calendar date
  let parsedStart: Date | null = null;
  if (referenceDate) {
    const parsed = new Date(referenceDate);
    if (!Number.isNaN(parsed.getTime())) {
      parsedStart = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    }
  }

  // If parsedStart is in the current month (same year & month as now), use parsedStart -> first of next month after parsedStart
  // Else (parsedStart is in the past month or missing/invalid), use firstOfThisMonth -> firstOfNextMonth(now)
  let startOfCycle: Date;
  let maturityDate: Date;

  if (
    parsedStart &&
    parsedStart.getFullYear() === now.getFullYear() &&
    parsedStart.getMonth() === now.getMonth()
  ) {
    // created in current month: start from actual creation date, mature on 1st of next month after creation month
    startOfCycle = parsedStart;
    maturityDate = firstOfNextMonth(startOfCycle);
  } else {
    // created in past month (or invalid/missing): use 1st of current month -> 1st of next month
    startOfCycle = startOfThisMonth;
    maturityDate = firstOfNext;
  }

  // compute calendar-day differences (robust against timezone/partial-day issues)
  let daysInThisMonth = lastOfMonth(now).getDate();

  // total days in the counted cycle (calendar days)
  let totalDays = differenceInCalendarDays(maturityDate, startOfCycle);
  if (totalDays <= 0) totalDays = 1;

  // days completed from startOfCycle up to today (clamped)
  let daysCompleted = differenceInCalendarDays(
    now < maturityDate ? now : maturityDate,
    startOfCycle
  );
  if (daysCompleted < 0) daysCompleted = 0;
  if (daysCompleted > totalDays) daysCompleted = totalDays;

  // days remaining until maturity (clamped)
  let daysRemaining = differenceInCalendarDays(maturityDate, now);
  if (daysRemaining < 0) daysRemaining = 0;

  const progressPct = (daysCompleted / totalDays) * 100;

  return {
    startDate: startOfCycle,
    maturityDate,
    daysInThisMonth,
    daysCompleted,
    daysRemaining,
    totalDays,
    progress: Math.round(Math.max(0, Math.min(100, progressPct))),
    isFirstOfMonthToday: now.getDate() === 1,
  };
};

/** Utilities: safe parsing (unchanged + small fallback) **/
const parseNumber = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : undefined;
  }
  if (typeof v === "string") {
    // remove commas, currency symbols, whitespace
    const cleaned = v.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

// small helper for robust amount parsing (extra fallback)
const parseAmountRobust = (v: unknown): number => {
  const p = parseNumber(v);
  if (typeof p === "number") return p;
  try {
    // extra fallback: stringify, remove non-digits, parse
    const s = String(v ?? "");
    const cleaned = s.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

export default function Dashboard() {
  const navigate = useNavigate();

  // NO-BLINK QUESTIONNAIRE:
  // - Show immediately only if we *already know* from localStorage that it's incomplete ("false")
  // - If we have no prior knowledge (null), wait for server before deciding (prevents flash)
  const stored = localStorage.getItem("questionnaireCompleted"); // "true" | "false" | null
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState<boolean>(
    stored === "false"
  );
  const [needsServerDecision, setNeedsServerDecision] = useState<boolean>(
    stored === null
  );

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [investmentsPerPage, setInvestmentsPerPage] = useState(6);

  // API hooks (unchanged)
  const { data: isAnsweredData, isLoading: isAnsweredLoading } =
    useIsAnsweredQuery();

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    isFetching: portfolioFetching,
    isError: portfolioError,
  } = useGetInvestmentPortfolioQuery();

  const {
    data: apiInvestments,
    isLoading: investmentsLoading,
    isFetching: investmentsFetching,
    isError: investmentsError,
    refetch: refetchInvestments,
  } = useGetAllInvestmentsQuery();

  // local state for displayed user (unchanged)
  const [displayedUser, setDisplayedUser] = useState(() => ({
    walletBalance: 0,
    investmentWallet: 0,
    investmentReturnBalance: 0,
    referralEarnings: 0,
  }));

  useEffect(() => {
    if (portfolio) {
      setDisplayedUser((prev) => ({
        walletBalance:
          portfolio.walletBalance !== undefined
            ? portfolio.walletBalance
            : prev.walletBalance,
        investmentWallet:
          portfolio.investmentWallet !== undefined
            ? portfolio.investmentWallet
            : prev.investmentWallet,
        investmentReturnBalance:
          portfolio.investmentReturns !== undefined
            ? portfolio.investmentReturns
            : prev.investmentReturnBalance,
        referralEarnings:
          portfolio.referralEarnings !== undefined
            ? portfolio.referralEarnings
            : prev.referralEarnings,
      }));
    }
  }, [portfolio]);

  // Decide questionnaire visibility without blink
  useEffect(() => {
    if (!needsServerDecision) return; // We already decided from localStorage
    if (isAnsweredLoading) return; // Wait for server so there's no flash

    if (isAnsweredData?.allAnswered === true) {
      localStorage.setItem("questionnaireCompleted", "true");
      setShowQuestionnaireModal(false);
      setNeedsServerDecision(false);
      return;
    }
    if (isAnsweredData?.allAnswered === false) {
      localStorage.setItem("questionnaireCompleted", "false");
      setShowQuestionnaireModal(true);
      setNeedsServerDecision(false);
      return;
    }

    // If API didn't provide a usable answer, don't change UI; avoid showing unexpectedly.
    setNeedsServerDecision(false);
  }, [needsServerDecision, isAnsweredLoading, isAnsweredData]);

  const handleQuestionnaireComplete = () => {
    localStorage.setItem("questionnaireCompleted", "true");
    setShowQuestionnaireModal(false);
  };

  const [investments, setInvestments] = useState<any[]>([]);

  useEffect(() => {
    if (Array.isArray(apiInvestments) && apiInvestments.length > 0) {
      const sorted = [...apiInvestments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setInvestments(sorted);
    } else if (Array.isArray(apiInvestments) && apiInvestments.length === 0) {
      setInvestments([]);
    }
  }, [apiInvestments]);

  const totalInvestments = investments.length;
  const totalPages = Math.ceil(totalInvestments / investmentsPerPage) || 1;
  const startIndex = (currentPage - 1) * investmentsPerPage;
  const endIndex = Math.min(startIndex + investmentsPerPage, totalInvestments);
  const paginatedInvestments = investments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (value: string) => {
    setInvestmentsPerPage(Number(value));
    setCurrentPage(1);
  };

  const formatCurrency = (n?: number) =>
    Number.isFinite(n ?? NaN) ? (n as number).toLocaleString() : "0";

  // Status badge — includes PAUSED and ARCHIVE with readable colors
  const getStatusBadge = (status?: string) => {
    const s = normalizeStatus(status);
    const variants: Record<string, string> = {
      active: "bg-success/10 text-success border-success/20",
      closed: "bg-red-100 text-red-700 border-red-300", // RED for archived → closed
      paused: "bg-yellow-100 text-yellow-700 border-yellow-300", // YELLOW for paused
      mature: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      completed: "bg-muted text-muted-foreground border-border",
      pending: "bg-warning/10 text-warning border-warning/20",
    };
    return variants[s] ?? "bg-muted text-muted-foreground border-border";
  };

  const getStatusLabel = (status?: string) => {
    const s = normalizeStatus(status);
    return s.toUpperCase(); // CLOSED / PAUSED / ACTIVE...
  };

  const dashboardStats = useMemo(
    () => [
      {
        title: "Wallet Balance",
        value: `$${formatCurrency(displayedUser.walletBalance)}`,
        icon: DollarSign,
        description: "USDT Available",
        gradient: "from-primary/10 to-primary/5",
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
      },
      {
        title: "Investment Wallet",
        value: `$${formatCurrency(displayedUser.investmentWallet)}`,
        icon: Target,
        description: "Total Invested",
        gradient: "from-blue-500/10 to-blue-600/5",
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-600",
      },
      {
        title: "Investment Returns Available",
        value: `$${formatCurrency(displayedUser.investmentReturnBalance)}`,
        icon: TrendingUp,
        description: "Ready to Withdraw",
        gradient: "from-success/10 to-success/5",
        iconBg: "bg-success/10",
        iconColor: "text-success",
      },
      {
        title: "Referral Earnings Available",
        value: `$${formatCurrency(displayedUser.referralEarnings)}`,
        icon: Activity,
        description: "Commission Earned",
        gradient: "from-purple-500/10 to-purple-600/5",
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-600",
      },
    ],
    [displayedUser]
  );

  return (
    <div className="space-y-8">
      {/* Questionnaire Modal */}
      <QuestionnaireModal
        isOpen={showQuestionnaireModal}
        onComplete={handleQuestionnaireComplete}
      />

      {/* Alert Banner */}
      <NotificationBanner />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6 mb-8">
        <div className="space-y-1">
          <h1 className="text-desktop-3xl font-bold text-foreground tracking-tight">
            Portfolio Overview
          </h1>
          <p className="text-muted-foreground text-desktop-lg">
            Track your investment performance and growth
          </p>
        </div>
        <Button
          onClick={() => navigate("/create-investment")}
          variant="default"
          size="lg"
          className="w-full lg:w-auto"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Investment
        </Button>
      </div>

      {/* Modern Dashboard Summary Cards (kept from old UI) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => (
          <div
            key={stat.title}
            className={cn(
              "card-premium p-6 relative overflow-hidden group",
              "hover:shadow-xl transition-all duration-300 cursor-pointer"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-50",
                stat.gradient
              )}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {stat.description}
                  </p>
                </div>
                <div
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center border",
                    stat.iconBg,
                    "group-hover:scale-110 transition-transform duration-200"
                  )}
                >
                  <stat.icon className={cn("h-6 w-6", stat.iconColor)} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Investment Plans Section */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-desktop-2xl font-bold text-foreground">
              Investment Portfolio
            </h2>
            <p className="text-muted-foreground text-desktop-sm">
              Showing {totalInvestments === 0 ? 0 : startIndex + 1}-{endIndex}{" "}
              of {totalInvestments} investments
            </p>
          </div>

          <div className="mobile-stack">
            <div className="flex items-center gap-2">
              <span className="text-desktop-sm text-muted-foreground whitespace-nowrap">
                Show:
              </span>
              <Select
                value={investmentsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-20 touch-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="9">9</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {investmentsLoading && investments.length === 0 ? (
            // loading skeleton cards
            Array.from({ length: Math.min(3, investmentsPerPage) }).map(
              (_, i) => (
                <div
                  key={i}
                  className="card-premium p-6 animate-pulse"
                  aria-hidden
                >
                  <div className="h-6 bg-muted/30 rounded w-1/3 mb-4" />
                  <div className="h-40 bg-muted/20 rounded mb-4" />
                  <div className="h-10 bg-muted/15 rounded w-full" />
                </div>
              )
            )
          ) : investments.length === 0 ? (
            <div className="col-span-full p-6 text-center text-muted-foreground">
              No investments found.
            </div>
          ) : (
            paginatedInvestments.map((investment: any) => {
              const cycle = computeMonthlyCycle(investment.startDate);

              // ---------------------------
              // IMPORTANT: ROI stays hardcoded at 5% per your request
              const roiResolved = 5;

              // parse amount robustly
              const amountParsed = parseAmountRobust(investment.amount);

              // monthly return = amount * 5%
              const monthlyReturn = (amountParsed * roiResolved) / 100;

              // days in current calendar month (from cycle)
              const daysInThisMonth = cycle.daysInThisMonth || 30;

              // daily return = monthlyReturn / daysInThisMonth
              const dailyReturn =
                daysInThisMonth > 0 ? monthlyReturn / daysInThisMonth : 0;

              // format to two decimals (and use locale formatting)
              const monthlyReturnFormatted = Number(
                monthlyReturn
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const dailyReturnFormatted = Number(dailyReturn).toLocaleString(
                undefined,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              );
              // ---------------------------

              return (
                <div
                  key={investment.id}
                  className={cn(
                    "card-premium group relative overflow-hidden",
                    "hover:shadow-xl transition-all duration-300 cursor-pointer"
                  )}
                >
                  <div className="absolute top-4 right-4 z-20">
                    <Badge
                      className={cn(
                        "border text-xs font-medium",
                        getStatusBadge(investment.status)
                      )}
                    >
                      {getStatusLabel(investment.status)}
                    </Badge>
                  </div>

                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-16 translate-x-16" />

                  <div className="relative z-10 p-6 space-y-6">
                    <div className="text-center space-y-2 pt-2">
                      <h3 className="text-xl font-bold text-foreground leading-tight">
                        {investment.name}
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center space-y-2 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          ROI
                        </p>
                        {/* KEEP +5% hardcoded */}
                        <p className="text-xl font-bold text-success">+5%</p>
                        <p className="text-xs text-muted-foreground">Monthly</p>
                      </div>
                      <div className="text-center space-y-2 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Invested
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          ${formatCurrency(amountParsed)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Principal
                        </p>
                      </div>
                      <div className="text-center space-y-2 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Days Left
                        </p>
                        <p className="text-xl font-bold text-warning">
                          {cycle.daysRemaining}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Till Maturity
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-success/5 via-success/10 to-success/5 rounded-xl border border-success/20">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-success" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Next Return
                            </p>
                          </div>

                          <p className="text-lg font-bold text-success">
                            ${dailyReturnFormatted}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {`~ $${monthlyReturnFormatted} / month`}
                          </p>
                        </div>

                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Maturity Date
                            </p>
                          </div>
                          <p className="text-lg font-bold text-foreground">
                            {format(cycle.maturityDate, "MMM dd, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Principal available
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">
                            Investment Progress
                          </p>
                        </div>
                        <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">
                          {cycle.progress}% Complete
                        </span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={cycle.progress}
                          className="h-3 bg-muted/50"
                        />
                        <div className="absolute top-0 left-1/4 h-3 w-px bg-border" />
                        <div className="absolute top-0 left-2/4 h-3 w-px bg-border" />
                        <div className="absolute top-0 left-3/4 h-3 w-px bg-border" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                        <span>
                          Started:{" "}
                          {format(
                            new Date(investment.createdAt),
                            "MMM dd, yyyy"
                          )}
                        </span>
                        <span>
                          Ends: {format(cycle.maturityDate, "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/investment/${investment.id}`)}
                      className="w-full gradient-primary text-white shadow-md hover:shadow-lg transition-all duration-200 py-3 rounded-xl font-medium group-hover:scale-[1.02]"
                    >
                      Manage Investment
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls (unchanged) */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages)
                        handlePageChange(currentPage + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Monthly Returns Section */}
      {/* <MonthlyReturns /> */}
    </div>
  );
}

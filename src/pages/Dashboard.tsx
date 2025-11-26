// dashboard.tsx
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
import { format, differenceInCalendarDays } from "date-fns";
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
import {
  useIsAnsweredQuery,
  useSaveAnswersMutation,
} from "@/API/onbording.api";

const normalizeStatus = (raw?: string) => {
  const s = String(raw || "").toLowerCase();
  if (s === "archived" || s === "archive") return "closed";
  return s;
};

// helper functions (unchanged)
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const firstOfNextMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 1);
const lastOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const computeMonthlyCycle = (referenceDate?: string | Date) => {
  const now = new Date();

  // Normalize to midnight to avoid time-of-day drift
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

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

  let daysInThisMonth = lastOfMonth(now).getDate();

  // total days in the counted cycle (calendar days)
  let totalDays = differenceInCalendarDays(maturityDate, startOfCycle);
  if (totalDays <= 0) totalDays = 1;

  // days completed: full days finished up to today (exclude today)
  let daysCompleted = differenceInCalendarDays(
    startOfToday < maturityDate ? startOfToday : maturityDate,
    startOfCycle
  );
  if (daysCompleted < 0) daysCompleted = 0;
  if (daysCompleted > totalDays) daysCompleted = totalDays;

  // days remaining: INCLUDE today (count from today up to maturity)
  let daysRemaining = differenceInCalendarDays(maturityDate, startOfToday);
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

// 3-month referral cycle
const computeReferralThreeMonthCycle = (referenceDate?: string | Date) => {
  const now = new Date();

  // Normalize to midnight to avoid time-of-day drift
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  let startOfCycle: Date;
  if (referenceDate) {
    const parsed = new Date(referenceDate);
    if (!Number.isNaN(parsed.getTime())) {
      startOfCycle = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    } else {
      startOfCycle = now;
    }
  } else {
    startOfCycle = now;
  }

  const maturityDate = new Date(
    startOfCycle.getFullYear(),
    startOfCycle.getMonth() + 3,
    1
  );

  const daysInThisMonth = lastOfMonth(now).getDate();

  let totalDays = differenceInCalendarDays(maturityDate, startOfCycle);
  if (totalDays <= 0) totalDays = 1;

  // days completed: full days finished up to today (exclude today)
  let daysCompleted = differenceInCalendarDays(
    startOfToday < maturityDate ? startOfToday : maturityDate,
    startOfCycle
  );
  if (daysCompleted < 0) daysCompleted = 0;
  if (daysCompleted > totalDays) daysCompleted = totalDays;

  // days remaining: INCLUDE today (count from today up to maturity)
  let daysRemaining = differenceInCalendarDays(maturityDate, startOfToday);
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
    const cleaned = v.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const parseAmountRobust = (v: unknown): number => {
  const p = parseNumber(v);
  if (typeof p === "number") return p;
  try {
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

  // ---------- Questionnaire / No-blink logic (robust) ----------------------
  const LOCAL_KEY_BASE = "questionnaireCompleted";
  const buildLocalKey = (userId?: string | number) =>
    userId ? `${LOCAL_KEY_BASE}:user_${userId}` : LOCAL_KEY_BASE;
  const userSpecificLocalKey = buildLocalKey(undefined);

  const [localStored, setLocalStored] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined"
        ? localStorage.getItem(userSpecificLocalKey)
        : null;
    } catch {
      return null;
    }
  });

  const [showQuestionnaireModal, setShowQuestionnaireModal] =
    useState<boolean>(false);
  const [isDeciding, setIsDeciding] = useState<boolean>(
    () => localStored === null
  );

  const {
    data: isAnsweredData,
    isLoading: isAnsweredLoading,
    refetch: refetchIsAnswered,
    isFetching: isAnsweredFetching,
  } = useIsAnsweredQuery(undefined, { refetchOnMountOrArgChange: true });

  const [saveAnswersMutation] = useSaveAnswersMutation();
  const SAFE_TIMEOUT_MS = 4000;

  useEffect(() => {
    if (!isDeciding) return;

    if (localStored === "false") {
      setShowQuestionnaireModal(true);
      setIsDeciding(false);
      return;
    }
    if (localStored === "true") {
      setShowQuestionnaireModal(false);
      setIsDeciding(false);
      return;
    }

    let didFallback = false;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(userSpecificLocalKey, "true");
      } catch {
        // ignore
      }
      setLocalStored("true");
      setShowQuestionnaireModal(false);
      setIsDeciding(false);
      didFallback = true;
    }, SAFE_TIMEOUT_MS);

    if (!isAnsweredLoading && isAnsweredData !== undefined && !didFallback) {
      const allAnswered = Boolean(isAnsweredData?.allAnswered);
      try {
        localStorage.setItem(
          userSpecificLocalKey,
          allAnswered ? "true" : "false"
        );
      } catch {
        // ignore
      }
      setLocalStored(allAnswered ? "true" : "false");
      setShowQuestionnaireModal(allAnswered === false);
      setIsDeciding(false);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeciding, localStored, isAnsweredLoading, isAnsweredData]);

  useEffect(() => {
    if (isAnsweredLoading) return;
    if (isAnsweredData === undefined) return;

    const allAnswered = Boolean(isAnsweredData?.allAnswered);
    try {
      localStorage.setItem(
        userSpecificLocalKey,
        allAnswered ? "true" : "false"
      );
    } catch {
      // ignore
    }
    setLocalStored(allAnswered ? "true" : "false");
    setShowQuestionnaireModal(allAnswered === false);
    setIsDeciding(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnsweredLoading, isAnsweredData]);

  const handleQuestionnaireComplete = async (answers?: any) => {
    try {
      localStorage.setItem(userSpecificLocalKey, "true");
    } catch {
      // ignore
    }
    setLocalStored("true");
    setShowQuestionnaireModal(false);

    try {
      if (answers) {
        await saveAnswersMutation(answers).unwrap();
      }
      await refetchIsAnswered();
    } catch {
      try {
        localStorage.setItem(userSpecificLocalKey, "false");
      } catch {
        // ignore
      }
      setLocalStored("false");
      setShowQuestionnaireModal(true);
    }
  };

  // -------------------- rest of Dashboard state & data ---------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [investmentsPerPage, setInvestmentsPerPage] = useState(6);

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

  const getStatusBadge = (status?: string) => {
    const s = normalizeStatus(status);
    const variants: Record<string, string> = {
      active: "bg-success/10 text-success border-success/20",
      closed: "bg-red-100 text-red-700 border-red-300",
      paused: "bg-yellow-100 text-yellow-700 border-yellow-300",
      mature: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      completed: "bg-muted text-muted-foreground border-border",
      pending: "bg-warning/10 text-warning border-warning/20",
    };
    return variants[s] ?? "bg-muted text-muted-foreground border-border";
  };

  const getStatusLabel = (status?: string) => {
    const s = normalizeStatus(status);
    return s.toUpperCase();
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
      {/* Loader overlay while deciding — prevents flash/flicker */}
      {isDeciding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <div className="rounded-lg p-4 bg-card/90 shadow-lg flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              Checking onboarding…
            </span>
          </div>
        </div>
      )}

      {/* Questionnaire Modal — render only after a decision is made and it's needed */}
      {!isDeciding && (
        <QuestionnaireModal
          isOpen={showQuestionnaireModal}
          onComplete={(answers?: any) => handleQuestionnaireComplete(answers)}
        />
      )}

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

      {/* Summary Cards */}
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

      {/* Investments */}
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
              const isReferralThreeMonths =
                String(investment?.referralInvestmentType) ===
                "ReferralThreeMonths";

              const cycle = isReferralThreeMonths
                ? computeReferralThreeMonthCycle(
                    investment.createdAt || investment.startDate
                  )
                : computeMonthlyCycle(investment.startDate);

              // ROI hardcoded to 5%
              const roiResolved = 5;

              const amountParsed = parseAmountRobust(investment.amount);
              const fullMonthlyReturn = (amountParsed * roiResolved) / 100; // full month return

              // days in current calendar month
              const daysInThisMonth = cycle.daysInThisMonth || 30;

              // daily return (for showing "Next Return" as daily figure)
              const dailyReturn =
                daysInThisMonth > 0 ? fullMonthlyReturn / daysInThisMonth : 0;

              const fullMonthlyReturnFormatted = Number(
                fullMonthlyReturn
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const dailyReturnFormatted = Number(dailyReturn).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              );

              let monthlyEstimateAmount = fullMonthlyReturn; // default: full month

              try {
                const created = new Date(
                  investment.createdAt || investment.startDate || null
                );
                const now = new Date();

                // only prorate if created date is valid and is in the current calendar month/year
                if (
                  !Number.isNaN(created.getTime()) &&
                  created.getFullYear() === now.getFullYear() &&
                  created.getMonth() === now.getMonth()
                ) {
                  // days remaining in the calendar month FROM TODAY (include today)
                  const firstOfNext = firstOfNextMonth(created);
                  const startOfToday = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );
                  let daysRemainingFromToday = differenceInCalendarDays(
                    firstOfNext,
                    startOfToday
                  );
                  if (daysRemainingFromToday < 0) daysRemainingFromToday = 0;

                  // prorate by daysRemainingFromToday / daysInThisMonth
                  monthlyEstimateAmount =
                    (fullMonthlyReturn * daysRemainingFromToday) /
                    daysInThisMonth;
                } else {
                }
              } catch {
                monthlyEstimateAmount = fullMonthlyReturn;
              }

              const monthlyEstimateFormatted = Number(
                monthlyEstimateAmount
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });

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

                          {/* show prorated monthly earning for creation month, otherwise full month */}
                          <p className="text-xs text-muted-foreground">{`Approx - $${monthlyEstimateFormatted} / month`}</p>
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

        {/* Pagination Controls */}
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
    </div>
  );
}

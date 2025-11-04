// InvestmentManagement.tsx
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Wallet,
  CalendarDays,
  Info,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";
import {
  useGetInvestmentQuery,
  useCloseInvestmentMutation,
} from "@/API/investmentApi";
import EmptyCard from "@/components/ui/EmptyCard";
import { toast } from "@/hooks/use-toast";

/** Helpers **/

const normalizeStatus = (raw?: string) => {
  const s = String(raw || "").toLowerCase();
  if (s === "archived" || s === "archive") return "closed";
  return s;
};

const normalizeId = (id: unknown): number | undefined => {
  if (id === undefined || id === null) return undefined;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && id.trim() !== "") {
    const n = Number(id);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const normalizeForUI = (raw: any) => {
  if (!raw) return undefined;
  const id = normalizeId(raw.id) ?? 0;
  const amount = Number(raw.amount ?? 0) || 0;
  const thisMonthsReturns =
    Number(
      String(raw.thisMonthsReturns ?? raw.returns ?? "0").replace(/,/g, "")
    ) || 0;
  const name = raw.name ?? raw.planName ?? `Investment #${id}`;
  const status = (raw.status ?? raw.investmentStatus ?? "")
    .toString()
    .toLowerCase();
  const createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();
  const updatedAt = raw.updatedAt ? new Date(raw.updatedAt) : createdAt;
  const startDate = raw.startDate ? new Date(raw.startDate) : createdAt;

  return {
    id,
    name,
    amount,
    status,
    createdAt,
    thisMonthsReturns,
    updatedAt,
    startDate,
    userId: normalizeId(raw.userId) ?? 0,

    // IMPORTANT: read the normalized field (added in api.ts)
    referralInvestmentType: raw.referralInvestmentType as
      | "ReferralOnePercent"
      | "ReferralThreeMonths"
      | undefined,
  } as const;
};

// date helpers for cycles
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const firstOfNextMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 1);
const lastOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

/** 1-month rolling cycle (existing behavior) */
const computeMonthlyCycle = (startDateCandidate?: Date) => {
  const now = new Date();

  const startOfThisMonth = firstOfMonth(now);
  const firstOfNext = firstOfNextMonth(now);

  let parsedStart: Date | null = null;
  if (
    startDateCandidate instanceof Date &&
    !Number.isNaN(startDateCandidate.getTime())
  ) {
    parsedStart = new Date(
      startDateCandidate.getFullYear(),
      startDateCandidate.getMonth(),
      startDateCandidate.getDate()
    );
  }

  let startOfCycle: Date;
  let maturityDate: Date;

  if (
    parsedStart &&
    parsedStart.getFullYear() === now.getFullYear() &&
    parsedStart.getMonth() === now.getMonth()
  ) {
    // created in current month: start from creation date, mature on 1st of next month after creation month
    startOfCycle = parsedStart;
    maturityDate = firstOfNextMonth(startOfCycle);
  } else {
    // fallback: first of current month -> first of next month
    startOfCycle = startOfThisMonth;
    maturityDate = firstOfNext;
  }

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

  // days in calendar month for display (use the current month length)
  const daysInThisMonth = lastOfMonth(now).getDate();

  const progressPct = (daysCompleted / totalDays) * 100;

  return {
    startOfCycle,
    maturityDate,
    daysInThisMonth,
    daysCompleted,
    daysRemaining,
    totalDays,
    progressPct: Math.max(0, Math.min(100, progressPct)),
    progressRounded: Math.round(Math.max(0, Math.min(100, progressPct))),
    isFirstOfMonthToday: now.getDate() === 1,
  };
};

/** 3-month referral cycle:
 *  - start = creation date
 *  - maturity = 1st of the month three months after creation month
 *    (e.g., created Nov 4 ⇒ Feb 1; created Nov 29 ⇒ Feb 1)
 */
const computeReferralThreeMonthCycle = (startDateCandidate?: Date) => {
  const now = new Date();

  let startOfCycle: Date;
  if (
    startDateCandidate instanceof Date &&
    !Number.isNaN(startDateCandidate.getTime())
  ) {
    startOfCycle = new Date(
      startDateCandidate.getFullYear(),
      startDateCandidate.getMonth(),
      startDateCandidate.getDate()
    );
  } else {
    startOfCycle = now;
  }

  // Maturity: 1st of the month three months after creation month
  const maturityDate = new Date(
    startOfCycle.getFullYear(),
    startOfCycle.getMonth() + 3,
    1
  );

  let totalDays = differenceInCalendarDays(maturityDate, startOfCycle);
  if (totalDays <= 0) totalDays = 1;

  let daysCompleted = differenceInCalendarDays(
    now < maturityDate ? now : maturityDate,
    startOfCycle
  );
  if (daysCompleted < 0) daysCompleted = 0;
  if (daysCompleted > totalDays) daysCompleted = totalDays;

  let daysRemaining = differenceInCalendarDays(maturityDate, now);
  if (daysRemaining < 0) daysRemaining = 0;

  const progressPct = (daysCompleted / totalDays) * 100;

  return {
    startOfCycle,
    maturityDate,
    daysInThisMonth: lastOfMonth(now).getDate(),
    daysCompleted,
    daysRemaining,
    totalDays,
    progressPct: Math.max(0, Math.min(100, progressPct)),
    progressRounded: Math.round(Math.max(0, Math.min(100, progressPct))),
    isFirstOfMonthToday: now.getDate() === 1,
  };
};
/** Component **/
export default function InvestmentManagement(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();

  const idNumber = normalizeId(id);
  const isIdProvided = id !== undefined;
  const isIdValid = idNumber !== undefined && idNumber > 0;

  // include isError and refetch from RTK Query
  const {
    data: remoteInvestmentRaw,
    isLoading: isLoadingInvestment,
    isError,
    refetch,
  } = useGetInvestmentQuery(idNumber, { skip: !isIdValid });

  // mutation hook for server-side close
  const [closeInvestmentApi, { isLoading: isClosingApi }] =
    useCloseInvestmentMutation();

  const remoteNormalized = remoteInvestmentRaw
    ? normalizeForUI(remoteInvestmentRaw)
    : undefined;

  const uiInvestment = isIdProvided ? remoteNormalized : undefined;

  /** Loading skeleton */
  if (isIdProvided && isIdValid && isLoadingInvestment) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-muted/40 animate-pulse" />
            <div className="w-56 h-6 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="rounded-lg shadow-lg p-6 bg-card/80 animate-pulse">
            <div className="h-6 w-1/3 bg-muted/40 rounded mb-4" />
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="h-20 rounded-lg bg-muted/40" />
              <div className="h-20 rounded-lg bg-muted/40" />
              <div className="h-20 rounded-lg bg-muted/40" />
            </div>
            <div className="h-36 rounded-lg bg-muted/40 mb-6" />
            <div className="h-48 rounded-lg bg-muted/40" />
          </div>
        </div>
      </div>
    );
  }

  /** Error with refresh */
  if (!isLoadingInvestment && isError) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="space-y-4 text-center">
            <EmptyCard
              title="Unable to load transactions"
              message="There was a problem loading transactions. Try refreshing."
            />
            <Button variant="default" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /** Invalid / not found / no ID */
  if (isIdProvided && !isIdValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">
              Invalid Investment ID
            </h2>
            <p className="text-muted-foreground mb-6">
              The provided investment id is invalid.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isIdProvided && !uiInvestment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Investment Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The requested investment could not be found.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isIdProvided) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">
              No Investment Selected
            </h2>
            <p className="text-muted-foreground mb-6">
              Please select an investment from the dashboard.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // uiInvestment is defined
  const investment = uiInvestment as ReturnType<typeof normalizeForUI>;

  // Choose cycle logic based on referralInvestmentType
  const isReferralThreeMonths =
    String((uiInvestment as any)?.referralInvestmentType) ===
    "ReferralThreeMonths";

  const cycle = isReferralThreeMonths
    ? computeReferralThreeMonthCycle(investment.startDate)
    : computeMonthlyCycle(investment.startDate);

  const daysCompleted = cycle.daysCompleted;
  const daysRemaining = cycle.daysRemaining;
  const progressPct = cycle.progressPct;
  const progressRounded = cycle.progressRounded;
  const maturityDate = cycle.maturityDate;
  const isFirstOfMonthToday = cycle.isFirstOfMonthToday;

  const getStatusBadge = (status?: string) => {
    const s = normalizeStatus(status);
    const variants: Record<string, string> = {
      active: "bg-success/10 text-success border-success/20",
      closed: "bg-red-100 text-red-700 border-red-300", // RED
      paused: "bg-yellow-100 text-yellow-700 border-yellow-300", // YELLOW
      mature: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      completed: "bg-muted text-muted-foreground border-border",
      pending: "bg-warning/10 text-warning border-warning/20",
    };
    return variants[s] ?? "bg-muted text-muted-foreground border-border";
  };

  const getStatusLabel = (status?: string) =>
    normalizeStatus(status).toUpperCase();

  const isClosed = normalizeStatus(investment.status) === "closed";

  // Close investment (single-toast, backend message first)
  const handleClose = async () => {
    if (isClosed) {
      toast({ title: "This investment is already closed." });
      return;
    }

    if (!isFirstOfMonthToday) {
      toast({
        title: "You can close an investment only on the 1st of each month.",
        variant: "destructive",
      });
      return;
    }

    const invIdNum = normalizeId(investment.id);
    if (!invIdNum) {
      toast({
        title: "Invalid investment,Please Contact Support",
        variant: "destructive",
      });
      return;
    }

    const t = toast({
      title: "Closing investment...",
      description: "Please wait",
      duration: 600000,
    });

    try {
      const res: any = await closeInvestmentApi(invIdNum).unwrap();

      const serverMsg =
        res?.message ??
        res?.data?.message ??
        res?.msg ??
        res?.statusMessage ??
        "";

      const processDateRaw = res?.processDate ?? res?.data?.processDate;
      const etaDays = Number(res?.etaDays ?? res?.data?.etaDays ?? 15) || 15;

      let extraDatePart = "";
      try {
        if (processDateRaw) {
          const d = new Date(processDateRaw);
          if (!Number.isNaN(d.getTime())) {
            extraDatePart = ` (by ${format(d, "MMM dd, yyyy")})`;
          }
        }
      } catch {}

      const fallbackMsg = `Investment closed successfully. Principal will be available in ${etaDays} days${extraDatePart}.`;

      t.update({
        title: serverMsg || fallbackMsg,
        description: undefined,
        duration: 3000,
        id: "",
      });

      navigate("/");
    } catch (err: any) {
      const msg =
        err?.data?.message ?? err?.message ?? "Failed to close investment";
      t.update({
        title: String(msg),
        variant: "destructive",
        duration: 5000,
        id: "",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Investment Details
            </h1>
            <p className="text-muted-foreground">
              Manage your investment portfolio
            </p>
          </div>
        </div>

        {/* Investment Overview */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
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

          <div className="relative z-10 p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-bold text-foreground leading-tight">
                    {investment.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Investment ID: {investment.id}
                </p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center space-y-2 p-3 rounded-lg border border-border/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  ROI
                </p>
                <p className="text-xl font-bold text-success">+5%</p>
                <p className="text-xs text-muted-foreground">Monthly</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-lg border border-border/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Invested
                </p>
                <p className="text-xl font-bold text-foreground">
                  ${investment.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Principal</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-lg border border-border/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Days Left
                </p>
                <p className="text-xl font-bold text-warning">
                  {daysRemaining}
                </p>
                <p className="text-xs text-muted-foreground">
                  Till Next Maturity
                </p>
              </div>
            </div>

            {/* Returns & Maturity */}
            <div className="p-4 bg-gradient-to-r from-success/5 via-success/10 to-success/5 rounded-xl border border-success/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Returns Earned
                    </p>
                  </div>
                  <p className="text-lg font-bold text-success">
                    ${investment.thisMonthsReturns.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Till now in a month
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      MATURITY DATE
                    </p>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {format(maturityDate, "MMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Return available
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Progress & Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Investment Progress</h3>
                <div className="text-sm text-muted-foreground">
                  {daysRemaining} day{daysRemaining === 1 ? "" : "s"} until next
                  maturity & return
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 uppercase tracking-wide">
                      Days Completed
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {daysCompleted}
                  </p>
                  <p className="text-xs text-blue-600/80">this cycle</p>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700 uppercase tracking-wide">
                      Days Left
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {daysRemaining}
                  </p>
                  <p className="text-xs text-orange-600/80">
                    until next maturity
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Progress value={Math.round(progressPct)} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Days completed:
                    </span>
                    <span className="font-medium text-foreground">
                      {daysCompleted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Days remaining:
                    </span>
                    <span className="font-medium text-warning">
                      {daysRemaining}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    <span className="text-xs text-muted-foreground">
                      Completed: {progressRounded}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-muted/50 rounded-full border border-border" />
                    <span className="text-xs text-muted-foreground">
                      Remaining: {100 - progressRounded}%
                    </span>
                  </div>
                </div>

                {isFirstOfMonthToday && !isClosed && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Investment matured today! Monthly return processed.
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Investment Date
                  </div>
                  <p className="font-medium">
                    {new Date(investment.startDate).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Next Maturity Date
                  </div>
                  <p className="font-medium">
                    {maturityDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Investment Actions</h3>

                {isClosed ? (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 border border-border/40">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-foreground" />
                      <h4 className="font-semibold">
                        Investment Already Closed
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This investment has already been closed
                      {investment.updatedAt
                        ? ` (on ${format(
                            new Date(investment.updatedAt),
                            "MMM dd, yyyy"
                          )}).`
                        : "."}{" "}
                    </p>
                  </div>
                ) : isFirstOfMonthToday ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Withdrawal window is open today (1st of the month)
                      </span>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h4 className="font-semibold">Close Investment</h4>
                      <p className="text-sm text-muted-foreground">
                        Your principal amount of{" "}
                        <strong>${investment.amount.toLocaleString()}</strong>{" "}
                        will be processed and transferred to your main wallet
                        within 15 business days.
                      </p>
                      <Button
                        onClick={handleClose}
                        className="w-full"
                        disabled={isClosingApi}
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        {isClosingApi
                          ? "Processing..."
                          : "Close Investment & Request Principal"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <h4 className="font-semibold text-orange-700">
                        Withdrawal Window Closed
                      </h4>
                    </div>
                    <p className="text-sm text-orange-600">
                      Investments can only be closed on the 1st of each month.
                    </p>
                    <p className="text-sm font-medium text-orange-700">
                      Next withdrawal date:{" "}
                      {maturityDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Copy,
  Users,
  DollarSign,
  TrendingUp,
  Share2,
  ExternalLink,
  Handshake,
  BarChart3,
  CalendarIcon,
  Filter,
  X,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  format,
  isAfter,
  isBefore,
  parseISO,
  subDays,
  subMonths,
} from "date-fns";
import {
  useGetReferralStatsQuery,
  useGetReferralCommissionHistoryQuery,
} from "@/API/referral.api";

// Skeleton Loading Components
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[1, 2, 3].map((item) => (
      <Card key={item} className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </div>
            <div className="h-10 w-10 bg-muted rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((row) => (
      <div
        key={row}
        className="flex items-center space-x-4 p-4 border rounded-lg"
      >
        <div className="h-10 w-10 bg-muted rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-3 bg-muted rounded w-24"></div>
        </div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-4 bg-muted rounded w-24"></div>
        <div className="h-6 bg-muted rounded w-16"></div>
      </div>
    ))}
  </div>
);

const ReferralLinkSkeleton = () => (
  <Card className="border-border shadow-sm">
    <CardHeader className="pb-4">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-muted rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded w-40"></div>
          <div className="h-3 bg-muted rounded w-56"></div>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 p-3 bg-muted/30 rounded-lg border border-border">
          <div className="h-5 bg-muted rounded"></div>
        </div>
        <div className="h-12 w-20 bg-muted rounded"></div>
      </div>
      <div className="p-3 bg-muted rounded-lg border border-border">
        <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
      </div>
    </CardContent>
  </Card>
);

export default function Referrals() {
  const [referralLink, setReferralLink] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const { toast } = useToast();

  // API calls with error handling
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetReferralStatsQuery();

  const {
    data: commissionHistory,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useGetReferralCommissionHistoryQuery();

  // Set referral link when stats data is available
  useEffect(() => {
    if (statsData?.referral?.code) {
      setReferralLink(`https://vaultpro.com/ref/${statsData.referral.code}`);
    } else if (statsError) {
      setReferralLink("Failed to load referral code");
    }
  }, [statsData, statsError]);

  // Transform commission history data for the table
  const referralData = useMemo(() => {
    if (!commissionHistory?.items) return [];

    return commissionHistory.items.map((item) => {
      const investmentAmount = Number(item.investmentAmount ?? 0);
      // prefer API aliases you exposed: amount → commissionEarned → commission
      const rawCommission =
        item.amount ?? item.commissionEarned ?? item.commission ?? "0";
      const commission = Number(rawCommission) || 0;

      // purely for display so the label matches reality
      const ratePct =
        investmentAmount > 0 ? (commission / investmentAmount) * 100 : 0;

      return {
        id: item.id,
        username: item.userName || "Unknown User",
        email: item.userEmail || "No email",
        dateJoined: item.dateInvestmentCreated || item.createdAt,
        status: mapStatus(item.status),

        // ✅ backend-driven values
        commission, // used in totals
        bonusEarned: commission, // used in the table cell below

        tier: getTier(investmentAmount),
        investmentAmount,
        ratePct,
      };
    });
  }, [commissionHistory]);

  function mapStatus(backendStatus: string): string {
    if (!backendStatus) return "Inactive";

    const status = backendStatus.toLowerCase();

    // Map various backend status values to frontend status
    switch (status) {
      case "active":
      case "completed":
      case "success":
      case "successful":
      case "paid":
      case "earning":
        return "Active";
      case "inactive":
      case "pending":
      case "cancelled":
      case "failed":
      case "expired":
      case "refunded":
        return "Inactive";
      default:
        return "Inactive"; // Default to inactive for unknown statuses
    }
  }

  // Helper function to determine tier based on investment amount
  function getTier(investmentAmount: number): string {
    if (investmentAmount >= 30000) return "Platinum";
    if (investmentAmount >= 20000) return "Gold";
    if (investmentAmount >= 10000) return "Silver";
    return "Bronze";
  }

  // Filter referral data based on date range
  const filteredReferralData = useMemo(() => {
    if (!fromDate && !toDate) return referralData;

    return referralData.filter((referral) => {
      const joinedDate = parseISO(referral.dateJoined);

      if (fromDate && toDate) {
        return !isBefore(joinedDate, fromDate) && !isAfter(joinedDate, toDate);
      } else if (fromDate) {
        return !isBefore(joinedDate, fromDate);
      } else if (toDate) {
        return !isAfter(joinedDate, toDate);
      }

      return true;
    });
  }, [referralData, fromDate, toDate]);

  // Calculate filtered stats based on API data and filters
  const filteredStats = useMemo(() => {
    // If stats API failed, use filtered data or show zeros
    if (statsError) {
      const totalPartners = filteredReferralData.length;
      const activePartners = filteredReferralData.filter(
        (r) => r.status === "Active"
      ).length;
      const totalCommission = filteredReferralData.reduce(
        (sum, r) => sum + r.commission,
        0
      );

      return [
        {
          title: "Total Partners",
          value: totalPartners.toString(),
          icon: Users,
          description: "Based on filtered data",
        },
        {
          title: "Commission Earned",
          value: `$${totalCommission.toFixed(2)}`,
          icon: DollarSign,
          description: "Based on filtered data",
        },
        {
          title: "Active Partners",
          value: activePartners.toString(),
          icon: BarChart3,
          description: "Based on filtered data",
        },
      ];
    }

    if (statsLoading) {
      return [
        {
          title: "Total Partners",
          value: "Loading...",
          icon: Users,
          description: "Active referral network",
        },
        {
          title: "Commission Earned",
          value: "$0.00",
          icon: DollarSign,
          description: "Total earnings to date",
        },
        {
          title: "Active Partners",
          value: "0",
          icon: BarChart3,
          description: "Currently investing",
        },
      ];
    }

    const totalPartners = filteredReferralData.length;
    const activePartners = filteredReferralData.filter(
      (r) => r.status === "Active"
    ).length;
    const totalCommission = filteredReferralData.reduce(
      (sum, r) => sum + r.commission,
      0
    );

    // Use API data when no date filters are applied
    if (!fromDate && !toDate) {
      return [
        {
          title: "Total Partners",
          value: statsData?.stats?.totalReferredUsers?.toString() || "0",
          icon: Users,
          description: "Active referral network",
        },
        {
          title: "Commission Earned",
          value: `$${statsData?.stats?.totalOverallEarnings || "0"}`,
          icon: DollarSign,
          description: "Total earnings to date",
        },
        {
          title: "Active Partners",
          value: statsData?.stats?.totalActiveInvestments?.toString() || "0",
          icon: BarChart3,
          description: "Currently investing",
        },
      ];
    }

    return [
      {
        title: "Total Partners",
        value: totalPartners.toString(),
        icon: Users,
        description: "Active referral network",
      },
      {
        title: "Commission Earned",
        value: `$${totalCommission.toFixed(2)}`,
        icon: DollarSign,
        description: "Total earnings to date",
      },
      {
        title: "Active Partners",
        value: activePartners.toString(),
        icon: BarChart3,
        description: "Currently investing",
      },
    ];
  }, [
    filteredReferralData,
    statsData,
    statsLoading,
    statsError,
    fromDate,
    toDate,
  ]);

  const copyToClipboard = (text: string) => {
    if (!text || text === "Failed to load referral code") {
      toast({
        title: "Cannot Copy",
        description: "Referral link is not available",
        variant: "destructive",
      });
      return;
    }

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied Successfully!",
      description: "Referral link copied to clipboard",
    });
  };

  const setPresetDateRange = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "7days":
        setFromDate(subDays(now, 7));
        setToDate(now);
        break;
      case "30days":
        setFromDate(subDays(now, 30));
        setToDate(now);
        break;
      case "3months":
        setFromDate(subMonths(now, 3));
        setToDate(now);
        break;
      case "all":
        setFromDate(undefined);
        setToDate(undefined);
        break;
    }
  };

  const clearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
  };

  const retryAPIs = () => {
    refetchStats();
    refetchHistory();
  };

  // Show loading state only for initial load
  if (statsLoading && historyLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>
          <div className="h-10 bg-muted rounded w-32"></div>
        </div>

        {/* Date Filter Skeleton */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-muted rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded w-32"></div>
                <div className="h-3 bg-muted rounded w-48"></div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Referral Link Skeleton */}
        <ReferralLinkSkeleton />

        {/* Stats Skeleton */}
        <StatsSkeleton />

        {/* Table Skeleton */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="h-6 bg-muted rounded w-40 mb-2"></div>
            <div className="h-4 bg-muted rounded w-56"></div>
          </CardHeader>
          <CardContent>
            <TableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Partner Program
          </h1>
          <p className="text-muted-foreground text-lg">
            Grow your network and earn competitive commission rates
          </p>
        </div>
        <div className="flex gap-2">
          {(statsError || historyError) && (
            <Button
              variant="outline"
              onClick={retryAPIs}
              className="border-border hover:bg-muted/50"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          <Button
            variant="default"
            className="px-6 py-2.5 text-base font-medium"
            onClick={() => referralLink && copyToClipboard(referralLink)}
            disabled={
              !referralLink || referralLink === "Failed to load referral code"
            }
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {(statsError || historyError) && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Failed to load referral data
                </p>
                <p className="text-sm text-muted-foreground">
                  {statsError ? "Stats data" : "Commission history"} could not
                  be loaded. Some information may be incomplete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Filter Section */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Filter by Date</CardTitle>
              <p className="text-muted-foreground text-sm">
                Filter referrals by join date
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* From Date */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground">
                From Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-border hover:bg-muted/50",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? (
                      format(fromDate, "PPP")
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground">
                To Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-border hover:bg-muted/50",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Preset Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetDateRange("7days")}
              className="border-border hover:bg-muted/50"
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetDateRange("30days")}
              className="border-border hover:bg-muted/50"
            >
              Last 30 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetDateRange("3months")}
              className="border-border hover:bg-muted/50"
            >
              Last 3 months
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetDateRange("all")}
              className="border-border hover:bg-muted/50"
            >
              All time
            </Button>
            {(fromDate || toDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-border hover:bg-muted/50 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filter Display */}
          {(fromDate || toDate) && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground">
                <span className="font-medium">Active Filter:</span>{" "}
                {fromDate && toDate
                  ? `${format(fromDate, "MMM dd, yyyy")} - ${format(
                      toDate,
                      "MMM dd, yyyy"
                    )}`
                  : fromDate
                  ? `From ${format(fromDate, "MMM dd, yyyy")}`
                  : `Until ${format(toDate!, "MMM dd, yyyy")}`}{" "}
                ({filteredReferralData.length} partner
                {filteredReferralData.length !== 1 ? "s" : ""})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Link Card */}
      {statsLoading ? (
        <ReferralLinkSkeleton />
      ) : (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Handshake className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Your Referral Link</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Share this link to start earning commissions
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ✅ NEW Referral Code Field */}
            {statsData?.referral?.code && (
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-muted/30 rounded-lg border border-border">
                  <Input
                    value={statsData.referral.code}
                    readOnly
                    className="bg-transparent border-none text-foreground font-mono text-sm p-0 focus-visible:ring-0"
                  />
                </div>
                <Button
                  onClick={() => copyToClipboard(statsData.referral.code)}
                  variant="outline"
                  className="px-4 py-3 border-border hover:bg-muted/50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}

            <div className="p-3 bg-success/5 rounded-lg border border-success/20">
              <p className="text-sm text-foreground">
                <span className="font-medium">Commission Rate:</span> Earn 1%
                commission every month on each successful referral investment
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Overview */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredStats.map((stat) => (
            <Card
              key={stat.title}
              className="border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Partner Network */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Partner Network</CardTitle>
          <p className="text-muted-foreground">
            Track your referral performance and earnings
          </p>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <TableSkeleton />
          ) : historyError && filteredReferralData.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 sm:p-10 md:p-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  Failed to load commission history
                </h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't load your referral commission history. Please try
                  again.
                </p>
                <Button onClick={retryAPIs} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : filteredReferralData.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 sm:p-10 md:p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  No referral partners yet
                </h3>
                <p className="text-muted-foreground">
                  {fromDate || toDate
                    ? "No partners found in the selected date range. Try adjusting your filters."
                    : "Start sharing your referral link to earn commissions from new partners."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Investment Amount</TableHead>
                  <TableHead>Commission Earned</TableHead>
                  <TableHead>Date Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReferralData.map((referral) => (
                  <TableRow key={referral.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {referral.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {referral.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        ${referral.investmentAmount.toLocaleString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-success">
                        +${referral.bonusEarned.toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">
                        {format(parseISO(referral.dateJoined), "MMM dd, yyyy")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          referral.status === "Active" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {referral.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

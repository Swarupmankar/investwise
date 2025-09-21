// components/Referrals.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Users,
  DollarSign,
  Share2,
  Handshake,
  BarChart3,
  Bell,
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
import {
  useGetReferralCommissionHistoryQuery,
  useGetReferralStatsQuery,
} from "@/API/referral.api";

export default function Referrals() {
  const { toast } = useToast();

  const {
    data: statsData,
    isLoading: statsLoading,
    isFetching: statsFetching,
    isError: statsError,
    refetch: refetchStats,
  } = useGetReferralStatsQuery();

  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    refetch: refetchHistory,
  } = useGetReferralCommissionHistoryQuery();

  const loading =
    statsLoading || historyLoading || statsFetching || historyFetching;

  // -------------------------
  // Stats fallbacks (show 0 if stats failed)
  // -------------------------
  const safeStats = {
    stats: {
      totalReferredUsers:
        statsError || !statsData?.stats?.totalReferredUsers
          ? 0
          : statsData.stats.totalReferredUsers,
      totalActiveInvestments:
        statsError || !statsData?.stats?.totalActiveInvestments
          ? 0
          : statsData.stats.totalActiveInvestments,
    },
    referral: {
      balance:
        statsError || !statsData?.referral?.balance
          ? 0
          : statsData.referral.balance,
      code:
        statsError || !statsData?.referral?.code ? "" : statsData.referral.code,
    },
  };

  // Referral history items (may be empty)
  const items = historyData?.items ?? [];

  const referralLink = safeStats.referral.code
    ? `${window.location.origin}/ref/${safeStats.referral.code}`
    : "";

  const copyToClipboard = (text: string) => {
    if (!text) {
      toast({
        title: "No referral link",
        description: "Referral link is empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied Successfully!",
        description: "Referral link copied to clipboard",
      });
    } catch (e) {
      toast({
        title: "Could not copy",
        description: "Your browser blocked copying to clipboard.",
        variant: "destructive",
      });
    }
  };

  const stats = [
    {
      title: "Total Partners",
      value: String(safeStats.stats.totalReferredUsers ?? 0),
      icon: Users,
      description: "Active referral network",
    },
    {
      title: "Commission Balance",
      value: `$${Number(safeStats.referral.balance ?? 0).toLocaleString(
        undefined,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}`,
      icon: DollarSign,
      description: "Overall commission earned",
    },
    {
      title: "Active Partners",
      value: String(safeStats.stats.totalActiveInvestments ?? 0),
      icon: BarChart3,
      description: "Currently investing",
    },
  ];

  // Helper to compute commission (assume 1% rate)
  const computeCommission = (investmentAmountStr?: string) => {
    const amt = Number(investmentAmountStr ?? "0");
    const commission = +(amt * 0.01).toFixed(2);
    return commission;
  };

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
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all duration-200 px-6 py-2.5 text-base font-medium">
          <Share2 className="h-4 w-4 mr-2" />
          Share Link
        </Button>
      </div>

      {/* Referral Link Card */}
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
          <div className="flex gap-3">
            <div className="flex-1 p-3 bg-muted/30 rounded-lg border border-border">
              {/* show skeleton if loading, otherwise show link (may be empty) */}
              {loading ? (
                <div className="h-6 w-full rounded bg-muted animate-pulse" />
              ) : (
                <Input
                  value={referralLink}
                  readOnly
                  className="bg-transparent border-none text-foreground font-mono text-sm p-0 focus-visible:ring-0"
                />
              )}
            </div>

            <Button
              onClick={() => copyToClipboard(referralLink)}
              variant="outline"
              className="px-4 py-3 border-border hover:bg-muted/50"
              disabled={!referralLink || loading}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>

          <div className="p-3 bg-success/5 rounded-lg border border-success/20">
            <p className="text-sm text-foreground">
              <span className="font-medium">Commission Rate:</span> Earn 1%
              commission every month on each successful referral investment
            </p>
          </div>

          {/* If stats failed, show non-blocking hint (we still show zeros) */}
          {statsError && (
            <p className="text-sm text-muted-foreground">
              Could not load stats — showing safe defaults. Try refreshing if
              you expect different values.
              <span className="ml-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refetchStats()}
                >
                  Refresh Stats
                </Button>
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
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
                    {loading ? (
                      <span className="inline-block h-8 w-20 rounded bg-muted animate-pulse" />
                    ) : (
                      stat.value
                    )}
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

      {/* Partner Network / Commission History Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Partner Network</CardTitle>
          <p className="text-muted-foreground">
            Track your referral performance and earnings
          </p>
        </CardHeader>

        <CardContent>
          {/* If history failed: show error card + single Refresh button */}
          {historyError && !historyLoading && !historyFetching ? (
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="p-8 sm:p-10 md:p-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    Unable to load referral history
                  </h3>
                  <p className="text-muted-foreground">
                    There was a problem loading your referral history. Try
                    refreshing.
                  </p>
                </CardContent>
              </Card>
              <div className="flex justify-center">
                <Button onClick={() => refetchHistory()}>Refresh</Button>
              </div>
            </div>
          ) : (
            <>
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
                  {/* loading skeleton rows */}
                  {loading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`} className="animate-pulse">
                        <TableCell>
                          <div className="h-6 w-48 rounded bg-muted" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 w-24 rounded bg-muted" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 w-24 rounded bg-muted" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 w-24 rounded bg-muted" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 w-16 rounded bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* actual rows when not loading & items present */}
                  {!loading && items.length > 0
                    ? items.map((item: any) => {
                        const commission = computeCommission(
                          item.investmentAmount
                        );
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Users className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {item.userName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.userEmail}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-foreground">
                                $
                                {Number(
                                  item.investmentAmount ?? 0
                                ).toLocaleString()}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-success">
                                +$
                                {commission.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                1.0% rate
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="text-sm text-foreground">
                                {item.dateInvestmentCreated
                                  ? new Date(
                                      item.dateInvestmentCreated
                                    ).toLocaleDateString()
                                  : "-"}
                              </p>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  item.status === "ACTIVE"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {item.status ?? "-"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    : null}

                  {/* no history message when not loading and no items */}
                  {!loading && items.length === 0 && !historyError && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                            No referral history
                          </h3>
                          <p className="text-muted-foreground">
                            You don’t have any referral history yet. Invite
                            partners to start earning commissions.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

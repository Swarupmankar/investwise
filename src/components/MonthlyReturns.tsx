import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestmentStore } from "@/hooks/useInvestmentStore";

export default function MonthlyReturns() {
  const { transactions } = useInvestmentStore();
  
  // Filter for return transactions
  const monthlyReturns = transactions.filter(t => t.type === 'return');
  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <TrendingUp className="h-5 w-5 text-success" />
          Monthly Return Credits
        </CardTitle>
        <p className="text-muted-foreground">Your automated investment returns</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {monthlyReturns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No returns credited yet</p>
              <p className="text-sm text-muted-foreground">Returns will appear here when they are processed</p>
            </div>
          ) : (
            monthlyReturns.map((returnItem) => (
              <div 
                key={returnItem.id}
                className={cn(
                  "p-4 rounded-xl border border-success/20 bg-gradient-to-r from-success/5 to-success/10",
                  "animate-fade-in hover:shadow-md transition-all duration-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 bg-success/10 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {returnItem.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Credited on {returnItem.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">+${returnItem.amount}</p>
                    <Badge className="bg-success/10 text-success border-success/20 text-xs">
                      Monthly Return
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
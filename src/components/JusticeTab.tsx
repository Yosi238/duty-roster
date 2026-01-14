"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, Printer, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { JusticeTableData, JusticeStats } from "@/types";
import { formatWithSign } from "@/lib/utils";

export default function JusticeTab() {
  const [data, setData] = useState<JusticeTableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("soldiers");
  const { toast } = useToast();

  useEffect(() => {
    fetchJusticeData();
  }, []);

  const fetchJusticeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/justice");
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת נתוני הצדק",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    const allStats = [
      ...data.soldiers.map((s) => ({ ...s, roleHeb: "חייל" })),
      ...data.commanders.map((s) => ({ ...s, roleHeb: "מפקד" })),
      ...data.officers.map((s) => ({ ...s, roleHeb: "קצין" })),
    ];

    const headers = [
      "שם",
      "תפקיד",
      "ימי חול",
      "סופשים",
      "כוננויות ימי חול",
      "כוננויות סופשים",
      "תורנות אחרונה",
      "פער מהממוצע (ימים)",
      "פער מהממוצע (סופשים)",
    ];

    const rows = allStats.map((s) => [
      s.personName,
      s.roleHeb,
      s.daysCount,
      s.weekendsCount,
      s.reserveDaysCount,
      s.reserveWeekendsCount,
      s.lastAssignedDate || "-",
      s.daysGapFromAvg.toFixed(1),
      s.weekendsGapFromAvg.toFixed(1),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `justice-table-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "הייצוא הושלם",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getGapIcon = (gap: number) => {
    if (gap > 0.5) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (gap < -0.5) return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getGapBadge = (gap: number) => {
    if (Math.abs(gap) < 0.5) {
      return <Badge variant="success">מאוזן</Badge>;
    }
    if (gap > 0) {
      return <Badge variant="destructive">מעל הממוצע</Badge>;
    }
    return <Badge variant="secondary">מתחת לממוצע</Badge>;
  };

  const renderTable = (stats: JusticeStats[], avgDays: number, avgWeekends: number) => {
    if (stats.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          אין נתונים להצגה
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-right py-3 px-4 font-medium">שם</th>
              <th className="text-center py-3 px-4 font-medium">ימי חול</th>
              <th className="text-center py-3 px-4 font-medium">סופשים</th>
              <th className="text-center py-3 px-4 font-medium">כוננויות</th>
              <th className="text-center py-3 px-4 font-medium">תורנות אחרונה</th>
              <th className="text-center py-3 px-4 font-medium">פער ימים</th>
              <th className="text-center py-3 px-4 font-medium">פער סופשים</th>
              <th className="text-center py-3 px-4 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, index) => (
              <tr
                key={stat.personId}
                className={`border-b hover:bg-muted/30 ${
                  index % 2 === 0 ? "" : "bg-muted/10"
                }`}
              >
                <td className="py-3 px-4 font-medium">{stat.personName}</td>
                <td className="text-center py-3 px-4">
                  <span className="font-semibold">{stat.daysCount}</span>
                </td>
                <td className="text-center py-3 px-4">
                  <span className="font-semibold">{stat.weekendsCount}</span>
                </td>
                <td className="text-center py-3 px-4 text-muted-foreground">
                  {stat.reserveDaysCount + stat.reserveWeekendsCount}
                </td>
                <td className="text-center py-3 px-4 text-muted-foreground">
                  {stat.lastAssignedDate || "-"}
                </td>
                <td className="text-center py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    {getGapIcon(stat.daysGapFromAvg)}
                    <span
                      className={
                        stat.daysGapFromAvg > 0.5
                          ? "text-destructive"
                          : stat.daysGapFromAvg < -0.5
                          ? "text-success"
                          : ""
                      }
                    >
                      {formatWithSign(stat.daysGapFromAvg)}
                    </span>
                  </div>
                </td>
                <td className="text-center py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    {getGapIcon(stat.weekendsGapFromAvg)}
                    <span
                      className={
                        stat.weekendsGapFromAvg > 0.5
                          ? "text-destructive"
                          : stat.weekendsGapFromAvg < -0.5
                          ? "text-success"
                          : ""
                      }
                    >
                      {formatWithSign(stat.weekendsGapFromAvg)}
                    </span>
                  </div>
                </td>
                <td className="text-center py-3 px-4">
                  {getGapBadge(stat.daysGapFromAvg + stat.weekendsGapFromAvg)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-medium">
              <td className="py-3 px-4">ממוצע</td>
              <td className="text-center py-3 px-4">{avgDays.toFixed(1)}</td>
              <td className="text-center py-3 px-4">{avgWeekends.toFixed(1)}</td>
              <td colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            טבלת צדק
          </CardTitle>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              ייצוא CSV
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              הדפסה
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">טוען...</div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground">אין נתונים</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="soldiers" className="gap-2">
                חיילים
                <Badge variant="secondary" className="mr-1">
                  {data.soldiers.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="commanders" className="gap-2">
                מפקדים
                <Badge variant="secondary" className="mr-1">
                  {data.commanders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="officers" className="gap-2">
                קצינים
                <Badge variant="secondary" className="mr-1">
                  {data.officers.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="soldiers">
              {renderTable(
                data.soldiers,
                data.averages.soldiers.days,
                data.averages.soldiers.weekends
              )}
            </TabsContent>

            <TabsContent value="commanders">
              {renderTable(
                data.commanders,
                data.averages.commanders.days,
                data.averages.commanders.weekends
              )}
            </TabsContent>

            <TabsContent value="officers">
              {renderTable(
                data.officers,
                data.averages.officers.days,
                data.averages.officers.weekends
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Summary Stats */}
        {data && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">חיילים</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>ממוצע ימי חול: {data.averages.soldiers.days.toFixed(1)}</p>
                  <p>ממוצע סופשים: {data.averages.soldiers.weekends.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">מפקדים</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>ממוצע ימי חול: {data.averages.commanders.days.toFixed(1)}</p>
                  <p>ממוצע סופשים: {data.averages.commanders.weekends.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">קצינים</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>ממוצע ימי חול: {data.averages.officers.days.toFixed(1)}</p>
                  <p>ממוצע סופשים: {data.averages.officers.weekends.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

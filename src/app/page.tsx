"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Calendar,
  BarChart3,
  Settings,
  Shuffle,
  Plus,
  Download,
  Shield,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

import PeopleTab from "@/components/PeopleTab";
import SlotsTab from "@/components/SlotsTab";
import ScheduleTab from "@/components/ScheduleTab";
import JusticeTab from "@/components/JusticeTab";
import SettingsTab from "@/components/SettingsTab";

type Stats = {
  totalPeople: number;
  activePeople: number;
  pendingSlots: number;
  assignedSlots: number;
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>("schedule");
  const [stats, setStats] = useState<Stats>({
    totalPeople: 0,
    activePeople: 0,
    pendingSlots: 0,
    assignedSlots: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    void fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const [peopleRes, slotsRes] = await Promise.all([
        fetch("/api/people"),
        fetch("/api/slots?includeAssignments=true"),
      ]);

      const peopleData = await peopleRes.json();
      const slotsData = await slotsRes.json();

      if (peopleData?.success && slotsData?.success) {
        const people = peopleData.data ?? [];
        const slots = slotsData.data ?? [];

        const pendingSlots = slots.filter(
          (s: any) => !s.assignments || s.assignments.length === 0
        ).length;

        setStats({
          totalPeople: people.length,
          activePeople: people.filter((p: any) => p.isActive).length,
          pendingSlots,
          assignedSlots: slots.length - pendingSlots,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/assignments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: false }),
      });

      const data = await response.json();

      if (data?.success) {
        toast({
          title: "Done",
          description: `Created ${data.data.created} assignments`,
        });
        await fetchStats();
      } else {
        toast({
          title: "Error",
          description: "Generation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/export");
      const data = await response.json();

      if (!data?.success) {
        toast({
          title: "Error",
          description: "Export failed",
          variant: "destructive",
        });
        return;
      }

      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Export failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Duty Roster</h1>
              <p className="text-xs text-muted-foreground">Smart Scheduling</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              onClick={handleGenerateAll}
              disabled={isGenerating}
              className="gap-2"
            >
              <Shuffle
                className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              Auto
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Active People</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activePeople}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Pending</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSlots}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Assigned</CardTitle>
              <Calendar className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assignedSlots}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Status</CardTitle>
              <BarChart3 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Badge
                variant={stats.pendingSlots === 0 ? "default" : "destructive"}
              >
                {stats.pendingSlots === 0 ? "Ready" : "Needs Work"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="slots">
              <Plus className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="justice">
              <BarChart3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleTab onRefresh={fetchStats} />
          </TabsContent>
          <TabsContent value="people">
            <PeopleTab onRefresh={fetchStats} />
          </TabsContent>
          <TabsContent value="slots">
            <SlotsTab onRefresh={fetchStats} />
          </TabsContent>
          <TabsContent value="justice">
            <JusticeTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

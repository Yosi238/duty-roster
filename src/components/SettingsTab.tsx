"use client";

import { useState, useEffect } from "react";
import { Settings, Save, RotateCcw, Lock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AlgorithmWeights } from "@/types";
import { DEFAULT_WEIGHTS } from "@/lib/algorithm";

export default function SettingsTab() {
  const [weights, setWeights] = useState<AlgorithmWeights>(DEFAULT_WEIGHTS);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (data.success) {
        if (data.data.algorithmWeights) {
          setWeights(data.data.algorithmWeights);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWeights = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algorithmWeights: weights }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Saved successfully",
          description: "Algorithm weights updated",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    toast({
      title: "Reset",
      description: "Weights reset to defaults",
    });
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast({
        title: "Error",
        description: "Password must be at least 4 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Password changed",
          description: "Admin password updated successfully",
        });
        setNewPassword("");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Algorithm Weights
          </CardTitle>
          <CardDescription>
            Adjust weights to affect automatic scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fairnessWeight">Fairness Weight</Label>
              <Input
                id="fairnessWeight"
                type="number"
                min="0"
                step="1"
                value={weights.fairnessWeight}
                onChange={(e) =>
                  setWeights({
                    ...weights,
                    fairnessWeight: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher = prefer balanced duty counts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gapWeight">Gap Weight</Label>
              <Input
                id="gapWeight"
                type="number"
                min="0"
                step="1"
                value={weights.gapWeight}
                onChange={(e) =>
                  setWeights({
                    ...weights,
                    gapWeight: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher = prefer longer gaps between duties
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consecutiveWeekendPenalty">Consecutive Weekend Penalty</Label>
              <Input
                id="consecutiveWeekendPenalty"
                type="number"
                min="0"
                step="1"
                value={weights.consecutiveWeekendPenalty}
                onChange={(e) =>
                  setWeights({
                    ...weights,
                    consecutiveWeekendPenalty: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Penalty for consecutive weekends
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sameWeekReservePenalty">Same Week Reserve Penalty</Label>
              <Input
                id="sameWeekReservePenalty"
                type="number"
                min="0"
                step="1"
                value={weights.sameWeekReservePenalty}
                onChange={(e) =>
                  setWeights({
                    ...weights,
                    sameWeekReservePenalty: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Penalty for reserve who had duty same week
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveWeights} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Weights"}
            </Button>
            <Button variant="outline" onClick={handleResetWeights} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Password
          </CardTitle>
          <CardDescription>
            Change admin password (default: admin123)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <Button onClick={handleChangePassword} className="gap-2">
            <Key className="h-4 w-4" />
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  CalendarDays,
  Trash2,
  Edit,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DutySlot } from "@/types";
import { formatDateHebrew, getDutyTypeNameHebrew, getWeekendDates } from "@/lib/utils";

interface SlotsTabProps {
  onRefresh: () => void;
}

export default function SlotsTab({ onRefresh }: SlotsTabProps) {
  const [slots, setSlots] = useState<DutySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DutySlot | null>(null);
  const [addForm, setAddForm] = useState({
    date: "",
    type: "regular" as "regular" | "weekend",
    soldiersNeeded: 1,
    commandersNeeded: 1,
    officersNeeded: 1,
  });
  const [bulkDates, setBulkDates] = useState("");
  const [bulkType, setBulkType] = useState<"regular" | "weekend">("regular");
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/slots?includeAssignments=true");
      const data = await response.json();
      if (data.success) {
        setSlots(data.data);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת המשבצות",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!addForm.date) {
      toast({
        title: "שגיאה",
        description: "יש לבחור תאריך",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.created.length > 0) {
          toast({
            title: "נוסף בהצלחה",
            description: `משבצת ${getDutyTypeNameHebrew(addForm.type)} נוספה`,
          });
        } else {
          toast({
            title: "דילוג",
            description: "המשבצת כבר קיימת",
            variant: "warning",
          });
        }
        setIsAddDialogOpen(false);
        setAddForm({
          date: "",
          type: "regular",
          soldiersNeeded: 1,
          commandersNeeded: 1,
          officersNeeded: 1,
        });
        fetchSlots();
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בהוספת המשבצת",
        variant: "destructive",
      });
    }
  };

  const handleBulkAdd = async () => {
    const dates = bulkDates
      .split(/[\n,]+/)
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

    if (dates.length === 0) {
      toast({
        title: "שגיאה",
        description: "לא נמצאו תאריכים תקינים",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: dates.map((date) => ({
            date,
            type: bulkType,
            soldiersNeeded: bulkType === "weekend" ? 2 : 1,
            commandersNeeded: 1,
            officersNeeded: 1,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "הושלם",
          description: `נוספו ${data.data.created.length} משבצות, דולגו ${data.data.skipped.length}`,
        });
        setIsBulkDialogOpen(false);
        setBulkDates("");
        fetchSlots();
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בהוספת המשבצות",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSlot = async () => {
    if (!selectedSlot) return;

    try {
      const response = await fetch(`/api/slots/${selectedSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldiersNeeded: selectedSlot.soldiersNeeded,
          commandersNeeded: selectedSlot.commandersNeeded,
          officersNeeded: selectedSlot.officersNeeded,
          isLocked: selectedSlot.isLocked,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "עודכן בהצלחה",
        });
        setIsEditDialogOpen(false);
        fetchSlots();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בעדכון",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSlot = async () => {
    if (!selectedSlot) return;

    try {
      const response = await fetch(`/api/slots/${selectedSlot.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "נמחק בהצלחה",
        });
        setIsDeleteDialogOpen(false);
        setSelectedSlot(null);
        fetchSlots();
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל במחיקה",
        variant: "destructive",
      });
    }
  };

  const groupedSlots = slots.reduce((acc, slot) => {
    const month = slot.date.substring(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(slot);
    return acc;
  }, {} as Record<string, DutySlot[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            ניהול משבצות תורנות
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוספה מרובה
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף משבצת
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">טוען...</div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            אין משבצות - הוסף משבצת חדשה
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSlots)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, monthSlots]) => (
                <div key={month}>
                  <h3 className="font-semibold text-lg mb-3 sticky top-0 bg-background py-2">
                    {new Date(month + "-01").toLocaleDateString("he-IL", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {monthSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                          slot.type === "weekend"
                            ? "border-primary/30 bg-primary/5"
                            : "bg-card"
                        } ${slot.isLocked ? "opacity-70" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatDateHebrew(slot.date)}
                              </span>
                              {slot.isLocked && (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <Badge
                              variant={slot.type === "weekend" ? "default" : "secondary"}
                              className="mt-1"
                            >
                              {getDutyTypeNameHebrew(slot.type)}
                            </Badge>
                            {slot.type === "weekend" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {(() => {
                                  const dates = getWeekendDates(slot.date);
                                  return `חמישי-שבת: ${dates.thursday} - ${dates.saturday}`;
                                })()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>חיילים: {slot.soldiersNeeded}</div>
                          <div>מפקדים: {slot.commandersNeeded}</div>
                          <div>קצינים: {slot.officersNeeded}</div>
                        </div>
                        {slot.assignments && slot.assignments.length > 0 && (
                          <Badge variant="success" className="mt-2">
                            {slot.assignments.length} שיבוצים
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Add Single Slot Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוספת משבצת תורנות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>סוג תורנות</Label>
                <Select
                  value={addForm.type}
                  onValueChange={(value: "regular" | "weekend") =>
                    setAddForm({ ...addForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">יום רגיל</SelectItem>
                    <SelectItem value="weekend">סופ״ש (חמישי-שבת)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {addForm.type === "weekend" ? "תאריך יום חמישי" : "תאריך"}
                </Label>
                <Input
                  type="date"
                  value={addForm.date}
                  onChange={(e) =>
                    setAddForm({ ...addForm, date: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>חיילים</Label>
                  <Input
                    type="number"
                    min="0"
                    value={addForm.soldiersNeeded}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        soldiersNeeded: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>מפקדים</Label>
                  <Input
                    type="number"
                    min="0"
                    value={addForm.commandersNeeded}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        commandersNeeded: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>קצינים</Label>
                  <Input
                    type="number"
                    min="0"
                    value={addForm.officersNeeded}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        officersNeeded: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleAddSlot}>הוסף</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Add Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוספה מרובה של משבצות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>סוג תורנות</Label>
                <Select
                  value={bulkType}
                  onValueChange={(value: "regular" | "weekend") =>
                    setBulkType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">ימים רגילים</SelectItem>
                    <SelectItem value="weekend">סופ״שים</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  תאריכים (שורה לכל תאריך או מופרדים בפסיקים, פורמט YYYY-MM-DD)
                </Label>
                <Textarea
                  value={bulkDates}
                  onChange={(e) => setBulkDates(e.target.value)}
                  placeholder="2024-01-15&#10;2024-01-16&#10;2024-01-17"
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleBulkAdd}>הוסף הכל</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Slot Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>עריכת משבצת</DialogTitle>
            </DialogHeader>
            {selectedSlot && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{formatDateHebrew(selectedSlot.date)}</p>
                  <Badge className="mt-1">
                    {getDutyTypeNameHebrew(selectedSlot.type)}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>חיילים</Label>
                    <Input
                      type="number"
                      min="0"
                      value={selectedSlot.soldiersNeeded}
                      onChange={(e) =>
                        setSelectedSlot({
                          ...selectedSlot,
                          soldiersNeeded: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>מפקדים</Label>
                    <Input
                      type="number"
                      min="0"
                      value={selectedSlot.commandersNeeded}
                      onChange={(e) =>
                        setSelectedSlot({
                          ...selectedSlot,
                          commandersNeeded: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>קצינים</Label>
                    <Input
                      type="number"
                      min="0"
                      value={selectedSlot.officersNeeded}
                      onChange={(e) =>
                        setSelectedSlot({
                          ...selectedSlot,
                          officersNeeded: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>נעול</Label>
                  <Button
                    variant={selectedSlot.isLocked ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectedSlot({
                        ...selectedSlot,
                        isLocked: !selectedSlot.isLocked,
                      })
                    }
                    className="gap-2"
                  >
                    {selectedSlot.isLocked ? (
                      <>
                        <Lock className="h-4 w-4" /> נעול
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" /> לא נעול
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleUpdateSlot}>שמור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת משבצת</AlertDialogTitle>
              <AlertDialogDescription>
                האם למחוק את המשבצת {selectedSlot && formatDateHebrew(selectedSlot.date)}?
                כל השיבוצים למשבצת זו יימחקו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSlot} className="bg-destructive">
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

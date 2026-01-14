"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  User,
  Shield,
  Star,
  ArrowLeftRight,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { DutySlot, Assignment, Person } from "@/types";
import {
  formatDateHebrew,
  getDutyTypeNameHebrew,
  getRoleNameHebrew,
  formatShortDate,
} from "@/lib/utils";
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from "date-fns";
import { he } from "date-fns/locale";

interface ScheduleTabProps {
  onRefresh: () => void;
}

interface SlotWithAssignments extends DutySlot {
  assignments: (Assignment & { person: Person })[];
}

export default function ScheduleTab({ onRefresh }: ScheduleTabProps) {
  const [slots, setSlots] = useState<SlotWithAssignments[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotWithAssignments | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [swapAssignment, setSwapAssignment] = useState<Assignment | null>(null);
  const [swapTargetId, setSwapTargetId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const [slotsRes, peopleRes] = await Promise.all([
        fetch(`/api/slots?month=${monthStr}&includeAssignments=true`),
        fetch("/api/people?includeBlocked=true"),
      ]);

      const slotsData = await slotsRes.json();
      const peopleData = await peopleRes.json();

      if (slotsData.success) {
        setSlots(slotsData.data);
      }
      if (peopleData.success) {
        setPeople(peopleData.data);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת הנתונים",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/assignments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "השיבוץ הושלם",
          description: `נוצרו ${data.data.created} שיבוצים`,
        });

        if (data.data.warnings?.length > 0) {
          toast({
            title: "אזהרות",
            description: `${data.data.warnings.length} אזהרות`,
            variant: "warning",
          });
        }

        fetchData();
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בביצוע השיבוץ",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggleLock = async (assignment: Assignment) => {
    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !assignment.isLocked }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: assignment.isLocked ? "שוחרר" : "ננעל",
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        variant: "destructive",
      });
    }
  };

  const handleSwap = async () => {
    if (!swapAssignment || !swapTargetId) return;

    try {
      const response = await fetch("/api/assignments/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment1Id: swapAssignment.id,
          assignment2Id: swapTargetId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "ההחלפה בוצעה",
        });
        setIsSwapDialogOpen(false);
        setSwapAssignment(null);
        setSwapTargetId("");
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בביצוע ההחלפה",
        variant: "destructive",
      });
    }
  };

  const handleManualAssign = async (slotId: string, personId: string, role: string, isReserve: boolean) => {
    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, personId, role, isReserve }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: "שובץ בהצלחה" });
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        variant: "destructive",
      });
    }
  };

  const getAssignmentsByRole = (assignments: Assignment[], role: string, isReserve: boolean) => {
    return assignments.filter((a) => a.role === role && a.isReserve === isReserve);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "soldier":
        return <User className="h-3 w-3" />;
      case "commander":
        return <Shield className="h-3 w-3" />;
      case "officer":
        return <Star className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Calendar view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const getSlotForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return slots.find((s) => s.date === dateStr);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            לוח תורנויות
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: he })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="gap-2 mr-4"
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
              שיבוץ מחדש
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">טוען...</div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-6">
              {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const slot = getSlotForDate(day);
                const hasAssignments = slot?.assignments && slot.assignments.length > 0;
                const hasWarnings = slot?.assignments?.some(
                  (a) => a.warnings && JSON.parse(a.warnings).length > 0
                );

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[80px] p-1 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      slot
                        ? slot.type === "weekend"
                          ? "bg-primary/10 border-primary/30"
                          : "bg-card"
                        : "bg-muted/30"
                    }`}
                    onClick={() => {
                      if (slot) {
                        setSelectedSlot(slot);
                        setIsDetailDialogOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{format(day, "d")}</span>
                      {hasWarnings && (
                        <AlertTriangle className="h-3 w-3 text-warning" />
                      )}
                    </div>
                    {slot && (
                      <div className="space-y-0.5">
                        <Badge
                          variant={slot.type === "weekend" ? "default" : "secondary"}
                          className="text-[10px] px-1 py-0"
                        >
                          {slot.type === "weekend" ? "סופ״ש" : "רגיל"}
                        </Badge>
                        {hasAssignments && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {slot.assignments
                              .filter((a) => !a.isReserve)
                              .slice(0, 2)
                              .map((a) => (a as Assignment & { person: Person }).person?.name?.split(" ")[0])
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* List View */}
            <div className="space-y-3">
              <h3 className="font-semibold">פירוט משבצות</h3>
              {slots.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  אין משבצות בחודש זה
                </p>
              ) : (
                slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-lg border ${
                      slot.type === "weekend"
                        ? "border-primary/30 bg-primary/5"
                        : "bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatDateHebrew(slot.date)}
                        </span>
                        <Badge variant={slot.type === "weekend" ? "default" : "secondary"}>
                          {getDutyTypeNameHebrew(slot.type)}
                        </Badge>
                        {slot.isLocked && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        פרטים
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Soldiers */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <User className="h-4 w-4" />
                          חיילים ({slot.soldiersNeeded})
                        </div>
                        <div className="space-y-1">
                          {getAssignmentsByRole(slot.assignments, "soldier", false).map((a) => (
                            <AssignmentBadge
                              key={a.id}
                              assignment={a as Assignment & { person: Person }}
                              onToggleLock={() => handleToggleLock(a)}
                              onSwap={() => {
                                setSwapAssignment(a);
                                setIsSwapDialogOpen(true);
                              }}
                            />
                          ))}
                          {getAssignmentsByRole(slot.assignments, "soldier", true).map((a) => (
                            <AssignmentBadge
                              key={a.id}
                              assignment={a as Assignment & { person: Person }}
                              isReserve
                              onToggleLock={() => handleToggleLock(a)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Commanders */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Shield className="h-4 w-4" />
                          מפקדים ({slot.commandersNeeded})
                        </div>
                        <div className="space-y-1">
                          {getAssignmentsByRole(slot.assignments, "commander", false).map((a) => (
                            <AssignmentBadge
                              key={a.id}
                              assignment={a as Assignment & { person: Person }}
                              onToggleLock={() => handleToggleLock(a)}
                              onSwap={() => {
                                setSwapAssignment(a);
                                setIsSwapDialogOpen(true);
                              }}
                            />
                          ))}
                          {getAssignmentsByRole(slot.assignments, "commander", true).map((a) => (
                            <AssignmentBadge
                              key={a.id}
                              assignment={a as Assignment & { person: Person }}
                              isReserve
                              onToggleLock={() => handleToggleLock(a)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Officers */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Star className="h-4 w-4" />
                          קצינים ({slot.officersNeeded})
                        </div>
                        <div className="space-y-1">
                          {getAssignmentsByRole(slot.assignments, "officer", false).map((a) => (
                            <AssignmentBadge
                              key={a.id}
                              assignment={a as Assignment & { person: Person }}
                              onToggleLock={() => handleToggleLock(a)}
                              onSwap={() => {
                                setSwapAssignment(a);
                                setIsSwapDialogOpen(true);
                              }}
                            />
                          ))}
                          {getAssignmentsByRole(slot.assignments, "officer", true).map((a) => (
                            <AssignmentBadge
                              key={a.id}
                              assignment={a as Assignment & { person: Person }}
                              isReserve
                              onToggleLock={() => handleToggleLock(a)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Slot Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedSlot && formatDateHebrew(selectedSlot.date)}
              </DialogTitle>
            </DialogHeader>
            {selectedSlot && (
              <div className="space-y-4 py-4">
                <Badge variant={selectedSlot.type === "weekend" ? "default" : "secondary"}>
                  {getDutyTypeNameHebrew(selectedSlot.type)}
                </Badge>

                {["soldier", "commander", "officer"].map((role) => (
                  <div key={role} className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {getRoleIcon(role)}
                      {getRoleNameHebrew(role)}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">ראשי</p>
                        {getAssignmentsByRole(selectedSlot.assignments, role, false).map((a) => (
                          <div key={a.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                            <span>{(a as Assignment & { person: Person }).person?.name}</span>
                            {a.isLocked && <Lock className="h-3 w-3" />}
                            {a.warnings && JSON.parse(a.warnings).length > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-3 w-3 text-warning" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {JSON.parse(a.warnings).join(", ")}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">כונן</p>
                        {getAssignmentsByRole(selectedSlot.assignments, role, true).map((a) => (
                          <div key={a.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <span>{(a as Assignment & { person: Person }).person?.name}</span>
                            {a.isLocked && <Lock className="h-3 w-3" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Swap Dialog */}
        <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>החלפת שיבוץ</DialogTitle>
            </DialogHeader>
            {swapAssignment && (
              <div className="space-y-4 py-4">
                <p>
                  החלפת {(swapAssignment as Assignment & { person?: Person }).person?.name} עם:
                </p>
                <Select value={swapTargetId} onValueChange={setSwapTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר שיבוץ להחלפה" />
                  </SelectTrigger>
                  <SelectContent>
                    {slots
                      .flatMap((s) => s.assignments)
                      .filter(
                        (a) =>
                          a.id !== swapAssignment.id &&
                          a.role === swapAssignment.role &&
                          a.isReserve === swapAssignment.isReserve &&
                          !a.isLocked
                      )
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {(a as Assignment & { person: Person }).person?.name} -{" "}
                          {slots.find((s) => s.id === a.slotId)?.date}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSwapDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSwap} disabled={!swapTargetId}>
                החלף
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Assignment Badge Component
function AssignmentBadge({
  assignment,
  isReserve,
  onToggleLock,
  onSwap,
}: {
  assignment: Assignment & { person: Person };
  isReserve?: boolean;
  onToggleLock: () => void;
  onSwap?: () => void;
}) {
  const hasWarnings = assignment.warnings && JSON.parse(assignment.warnings).length > 0;

  return (
    <div
      className={`flex items-center justify-between p-2 rounded text-sm ${
        isReserve ? "bg-muted/50" : "bg-muted"
      }`}
    >
      <div className="flex items-center gap-1">
        {isReserve && <span className="text-xs text-muted-foreground">(כונן)</span>}
        <span>{assignment.person?.name}</span>
        {hasWarnings && (
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="h-3 w-3 text-warning" />
            </TooltipTrigger>
            <TooltipContent>
              {JSON.parse(assignment.warnings!).join(", ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          {assignment.isLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </Button>
        {onSwap && !assignment.isLocked && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onSwap();
            }}
          >
            <ArrowLeftRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

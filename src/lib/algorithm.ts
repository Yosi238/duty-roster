/**
 * אלגוריתם שיבוץ תורנויות
 * =============================
 * 
 * האלגוריתם עובד בצורה אינקרמנטלית:
 * - שומר שיבוצים נעולים קיימים
 * - משבץ רק משבצות חדשות/חסרות
 * 
 * פונקציית עלות משקללת:
 * 1) סטייה מאיזון (daysCount / weekendsCount)
 * 2) מרווח מתורנות אחרונה (ככל שרחוק יותר - טוב יותר)
 * 3) ענישה על סופ"שים רצופים
 * 4) לכוננים: ענישה על תורנות באותו שבוע
 */

import {
  Role,
  DutyType,
  Person,
  DutySlot,
  Assignment,
  AlgorithmWeights,
  AssignmentResult,
  Warning,
  WarningType,
} from "@/types";
import {
  isDateBlocked,
  daysBetween,
  isInSameWeek,
  getWeekendDates,
  getWeekStart,
} from "./utils";
import { parseISO, addDays, format } from "date-fns";

// ברירות מחדל למשקלים
export const DEFAULT_WEIGHTS: AlgorithmWeights = {
  fairnessWeight: 10,
  gapWeight: 5,
  consecutiveWeekendPenalty: 20,
  sameWeekReservePenalty: 50,
};

// סוגי נתונים פנימיים לאלגוריתם
interface PersonStats {
  personId: string;
  role: Role;
  daysCount: number;
  weekendsCount: number;
  reserveDaysCount: number;
  reserveWeekendsCount: number;
  lastAssignedDate: string | null;
  lastWeekendDate: string | null;
  assignedDates: Set<string>;
  assignedWeeks: Set<string>; // תחילות שבועות בהם יש תורנות
}

interface CandidateScore {
  personId: string;
  cost: number;
  warnings: Warning[];
}

/**
 * חישוב סטטיסטיקות עבור כל האנשים
 */
export function calculateStats(
  people: Person[],
  assignments: Assignment[],
  slots: DutySlot[],
  role: Role
): Map<string, PersonStats> {
  const stats = new Map<string, PersonStats>();
  
  // אתחול סטטיסטיקות לכל אדם
  const roleFilter = getRoleFilter(role);
  const relevantPeople = people.filter(p => p.isActive && roleFilter(p));
  
  for (const person of relevantPeople) {
    stats.set(person.id, {
      personId: person.id,
      role,
      daysCount: 0,
      weekendsCount: 0,
      reserveDaysCount: 0,
      reserveWeekendsCount: 0,
      lastAssignedDate: null,
      lastWeekendDate: null,
      assignedDates: new Set(),
      assignedWeeks: new Set(),
    });
  }
  
  // מיפוי משבצות לתאריכים וסוגים
  const slotMap = new Map<string, DutySlot>();
  for (const slot of slots) {
    slotMap.set(slot.id, slot);
  }
  
  // עיבוד שיבוצים קיימים
  for (const assignment of assignments) {
    if (assignment.role !== role) continue;
    
    const personStats = stats.get(assignment.personId);
    if (!personStats) continue;
    
    const slot = slotMap.get(assignment.slotId);
    if (!slot) continue;
    
    const isWeekend = slot.type === "weekend";
    
    if (assignment.isReserve) {
      // כונן
      if (isWeekend) {
        personStats.reserveWeekendsCount++;
      } else {
        personStats.reserveDaysCount++;
      }
    } else {
      // משובץ ראשי
      if (isWeekend) {
        personStats.weekendsCount++;
        personStats.lastWeekendDate = slot.date;
      } else {
        personStats.daysCount++;
      }
      
      // עדכון תאריך אחרון
      if (
        !personStats.lastAssignedDate ||
        slot.date > personStats.lastAssignedDate
      ) {
        personStats.lastAssignedDate = slot.date;
      }
    }
    
    // סימון תאריכים ושבועות
    personStats.assignedDates.add(slot.date);
    personStats.assignedWeeks.add(getWeekStart(slot.date));
    
    // לסופ"ש - הוסף את כל הימים
    if (isWeekend) {
      const weekendDates = getWeekendDates(slot.date);
      personStats.assignedDates.add(weekendDates.thursday);
      personStats.assignedDates.add(weekendDates.friday);
      personStats.assignedDates.add(weekendDates.saturday);
    }
  }
  
  return stats;
}

/**
 * קבלת פילטר תפקיד
 */
function getRoleFilter(role: Role): (p: Person) => boolean {
  switch (role) {
    case "soldier":
      return (p) => p.isSoldier;
    case "commander":
      return (p) => p.isCommander;
    case "officer":
      return (p) => p.isOfficer;
  }
}

/**
 * חישוב ממוצע קבוצה
 */
function calculateAverages(stats: Map<string, PersonStats>): {
  avgDays: number;
  avgWeekends: number;
} {
  const values = Array.from(stats.values());
  if (values.length === 0) return { avgDays: 0, avgWeekends: 0 };
  
  const totalDays = values.reduce((sum, s) => sum + s.daysCount, 0);
  const totalWeekends = values.reduce((sum, s) => sum + s.weekendsCount, 0);
  
  return {
    avgDays: totalDays / values.length,
    avgWeekends: totalWeekends / values.length,
  };
}

/**
 * חישוב עלות שיבוץ אדם לתורנות
 */
function calculateCost(
  personStats: PersonStats,
  slot: DutySlot,
  isReserve: boolean,
  averages: { avgDays: number; avgWeekends: number },
  weights: AlgorithmWeights,
  excludedPersonIds: Set<string>
): CandidateScore {
  const warnings: Warning[] = [];
  let cost = 0;
  
  const isWeekend = slot.type === "weekend";
  const slotDate = slot.date;
  
  // בדיקה שלא משובץ כבר למשבצת הזו
  if (excludedPersonIds.has(personStats.personId)) {
    return { personId: personStats.personId, cost: Infinity, warnings: [] };
  }
  
  // 1) סטייה מאיזון - מעדיפים מי שעשה פחות
  const currentCount = isWeekend
    ? personStats.weekendsCount
    : personStats.daysCount;
  const avgCount = isWeekend ? averages.avgWeekends : averages.avgDays;
  const fairnessDeviation = currentCount - avgCount;
  
  // ככל שהאדם עשה יותר מהממוצע - עלות גבוהה יותר
  cost += fairnessDeviation * weights.fairnessWeight;
  
  if (fairnessDeviation > 1) {
    warnings.push({
      type: "fairness_deviation",
      message: `סטייה מהממוצע: ${fairnessDeviation.toFixed(1)}+`,
      severity: fairnessDeviation > 2 ? "high" : "medium",
    });
  }
  
  // 2) מרווח מתורנות אחרונה - מעדיפים רחוק יותר
  if (personStats.lastAssignedDate) {
    const daysSinceLast = daysBetween(personStats.lastAssignedDate, slotDate);
    
    // ככל שהמרווח קטן יותר - עלות גבוהה יותר
    // משתמשים בפונקציה הפוכה: עלות = maxGap - actualGap
    const maxExpectedGap = 14; // מרווח מקסימלי צפוי
    const gapPenalty = Math.max(0, maxExpectedGap - daysSinceLast);
    cost += gapPenalty * weights.gapWeight;
    
    if (daysSinceLast < 3) {
      warnings.push({
        type: "short_gap",
        message: `מרווח קצר: ${daysSinceLast} ימים בלבד`,
        severity: daysSinceLast < 2 ? "high" : "medium",
      });
    }
  }
  
  // 3) ענישה על סופ"שים רצופים
  if (isWeekend && personStats.lastWeekendDate) {
    const daysSinceLastWeekend = daysBetween(
      personStats.lastWeekendDate,
      slotDate
    );
    
    if (daysSinceLastWeekend <= 7) {
      cost += weights.consecutiveWeekendPenalty;
      warnings.push({
        type: "consecutive_weekend",
        message: "סופ״ש רצוף",
        severity: "high",
      });
    }
  }
  
  // 4) לכוננים: ענישה על תורנות באותו שבוע
  if (isReserve) {
    const slotWeekStart = getWeekStart(slotDate);
    
    if (personStats.assignedWeeks.has(slotWeekStart)) {
      cost += weights.sameWeekReservePenalty;
      warnings.push({
        type: "same_week_reserve",
        message: "כבר ביצע תורנות השבוע",
        severity: "high",
      });
    }
    
    // מעדיפים כונן שהתורנות האחרונה שלו הכי רחוקה
    if (personStats.lastAssignedDate) {
      const daysSinceLast = daysBetween(personStats.lastAssignedDate, slotDate);
      // הפחתת עלות ככל שרחוק יותר (מספר שלילי = בונוס)
      cost -= daysSinceLast * 0.5;
    } else {
      // מי שלא עשה תורנות כלל - בונוס גדול
      cost -= 100;
    }
  }
  
  return { personId: personStats.personId, cost, warnings };
}

/**
 * בחירת המועמד הטוב ביותר
 */
function selectBestCandidate(
  candidates: CandidateScore[]
): CandidateScore | null {
  if (candidates.length === 0) return null;
  
  // מסנן Infinity
  const validCandidates = candidates.filter((c) => c.cost < Infinity);
  if (validCandidates.length === 0) return null;
  
  // מיון לפי עלות (נמוך יותר = טוב יותר)
  validCandidates.sort((a, b) => a.cost - b.cost);
  
  return validCandidates[0];
}

/**
 * שיבוץ תפקיד בודד במשבצת
 */
export function assignRole(
  slot: DutySlot,
  role: Role,
  count: number,
  includeReserve: boolean,
  people: Person[],
  existingAssignments: Assignment[],
  allSlots: DutySlot[],
  weights: AlgorithmWeights = DEFAULT_WEIGHTS
): AssignmentResult[] {
  const results: AssignmentResult[] = [];
  
  // חישוב סטטיסטיקות
  const stats = calculateStats(people, existingAssignments, allSlots, role);
  const averages = calculateAverages(stats);
  
  // קבלת רשימת אנשים זמינים
  const roleFilter = getRoleFilter(role);
  const availablePeople = people.filter((p) => {
    if (!p.isActive || !roleFilter(p)) return false;
    
    // בדיקת חסימות
    const blockedDates = p.blockedDates?.map((b) => b.date) || [];
    if (isDateBlocked(blockedDates, slot.date, slot.type === "weekend")) {
      return false;
    }
    
    return true;
  });
  
  // מעקב אחרי מי כבר משובץ במשבצת זו
  const assignedToSlot = new Set<string>();
  
  // שיבוצים קיימים לתפקיד הזה במשבצת
  const existingForRole = existingAssignments.filter(
    (a) => a.slotId === slot.id && a.role === role && !a.isReserve && a.isLocked
  );
  
  for (const existing of existingForRole) {
    assignedToSlot.add(existing.personId);
  }
  
  // שיבוץ ראשיים
  const mainCount = count - existingForRole.length;
  
  for (let i = 0; i < mainCount; i++) {
    const candidates = availablePeople
      .filter((p) => !assignedToSlot.has(p.id))
      .map((p) => {
        const personStats = stats.get(p.id);
        if (!personStats) return null;
        
        return calculateCost(
          personStats,
          slot,
          false,
          averages,
          weights,
          assignedToSlot
        );
      })
      .filter((c): c is CandidateScore => c !== null);
    
    const best = selectBestCandidate(candidates);
    
    if (best) {
      assignedToSlot.add(best.personId);
      
      // עדכון סטטיסטיקות
      const personStats = stats.get(best.personId);
      if (personStats) {
        if (slot.type === "weekend") {
          personStats.weekendsCount++;
          personStats.lastWeekendDate = slot.date;
        } else {
          personStats.daysCount++;
        }
        personStats.lastAssignedDate = slot.date;
        personStats.assignedDates.add(slot.date);
        personStats.assignedWeeks.add(getWeekStart(slot.date));
      }
      
      results.push({
        personId: best.personId,
        role,
        isReserve: false,
        cost: best.cost,
        warnings: best.warnings.map((w) => w.message),
      });
    } else {
      // אין מועמדים זמינים
      results.push({
        personId: "",
        role,
        isReserve: false,
        cost: Infinity,
        warnings: ["אין מועמדים זמינים לתפקיד זה"],
      });
    }
  }
  
  // שיבוץ כוננים
  if (includeReserve) {
    // כוננים קיימים
    const existingReserves = existingAssignments.filter(
      (a) =>
        a.slotId === slot.id && a.role === role && a.isReserve && a.isLocked
    );
    
    const reserveCount = count - existingReserves.length;
    
    for (const existing of existingReserves) {
      assignedToSlot.add(existing.personId);
    }
    
    for (let i = 0; i < reserveCount; i++) {
      const candidates = availablePeople
        .filter((p) => !assignedToSlot.has(p.id))
        .map((p) => {
          const personStats = stats.get(p.id);
          if (!personStats) return null;
          
          return calculateCost(
            personStats,
            slot,
            true,
            averages,
            weights,
            assignedToSlot
          );
        })
        .filter((c): c is CandidateScore => c !== null);
      
      const best = selectBestCandidate(candidates);
      
      if (best) {
        assignedToSlot.add(best.personId);
        
        // עדכון סטטיסטיקות לכונן
        const personStats = stats.get(best.personId);
        if (personStats) {
          if (slot.type === "weekend") {
            personStats.reserveWeekendsCount++;
          } else {
            personStats.reserveDaysCount++;
          }
          personStats.assignedWeeks.add(getWeekStart(slot.date));
        }
        
        results.push({
          personId: best.personId,
          role,
          isReserve: true,
          cost: best.cost,
          warnings: best.warnings.map((w) => w.message),
        });
      } else {
        results.push({
          personId: "",
          role,
          isReserve: true,
          cost: Infinity,
          warnings: ["אין כונן זמין"],
        });
      }
    }
  }
  
  return results;
}

/**
 * שיבוץ אוטומטי מלא למשבצת
 */
export function assignSlot(
  slot: DutySlot,
  people: Person[],
  existingAssignments: Assignment[],
  allSlots: DutySlot[],
  weights: AlgorithmWeights = DEFAULT_WEIGHTS
): AssignmentResult[] {
  const results: AssignmentResult[] = [];
  
  // שיבוץ חיילים
  if (slot.soldiersNeeded > 0) {
    const soldierResults = assignRole(
      slot,
      "soldier",
      slot.soldiersNeeded,
      true,
      people,
      existingAssignments,
      allSlots,
      weights
    );
    results.push(...soldierResults);
    
    // עדכון רשימת שיבוצים לתפקידים הבאים
    for (const result of soldierResults) {
      if (result.personId) {
        existingAssignments = [
          ...existingAssignments,
          {
            id: `temp-${Date.now()}-${Math.random()}`,
            slotId: slot.id,
            personId: result.personId,
            role: result.role,
            isReserve: result.isReserve,
            isLocked: false,
            warnings: null,
          },
        ];
      }
    }
  }
  
  // שיבוץ מפקדים
  if (slot.commandersNeeded > 0) {
    const commanderResults = assignRole(
      slot,
      "commander",
      slot.commandersNeeded,
      true,
      people,
      existingAssignments,
      allSlots,
      weights
    );
    results.push(...commanderResults);
    
    for (const result of commanderResults) {
      if (result.personId) {
        existingAssignments = [
          ...existingAssignments,
          {
            id: `temp-${Date.now()}-${Math.random()}`,
            slotId: slot.id,
            personId: result.personId,
            role: result.role,
            isReserve: result.isReserve,
            isLocked: false,
            warnings: null,
          },
        ];
      }
    }
  }
  
  // שיבוץ קצינים
  if (slot.officersNeeded > 0) {
    const officerResults = assignRole(
      slot,
      "officer",
      slot.officersNeeded,
      true,
      people,
      existingAssignments,
      allSlots,
      weights
    );
    results.push(...officerResults);
  }
  
  return results;
}

/**
 * שיבוץ מלא לכל המשבצות הלא-נעולות
 */
export function generateFullSchedule(
  slots: DutySlot[],
  people: Person[],
  existingAssignments: Assignment[],
  weights: AlgorithmWeights = DEFAULT_WEIGHTS
): Map<string, AssignmentResult[]> {
  const schedule = new Map<string, AssignmentResult[]>();
  
  // מיון משבצות לפי תאריך
  const sortedSlots = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  
  // שמירת שיבוצים מצטברים
  let currentAssignments = [...existingAssignments];
  
  for (const slot of sortedSlots) {
    // דילוג על משבצות נעולות
    if (slot.isLocked) continue;
    
    // שיבוץ המשבצת
    const results = assignSlot(
      slot,
      people,
      currentAssignments,
      sortedSlots,
      weights
    );
    
    schedule.set(slot.id, results);
    
    // הוספת השיבוצים החדשים לרשימה
    for (const result of results) {
      if (result.personId) {
        currentAssignments.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          slotId: slot.id,
          personId: result.personId,
          role: result.role,
          isReserve: result.isReserve,
          isLocked: false,
          warnings: JSON.stringify(result.warnings),
        });
      }
    }
  }
  
  return schedule;
}

/**
 * בדיקת אפשרות החלפה בין שני שיבוצים
 */
export function canSwap(
  assignment1: Assignment,
  assignment2: Assignment,
  people: Person[]
): { canSwap: boolean; reason?: string } {
  // אותו תפקיד
  if (assignment1.role !== assignment2.role) {
    return { canSwap: false, reason: "תפקידים שונים" };
  }
  
  // אותו סוג (ראשי/כונן)
  if (assignment1.isReserve !== assignment2.isReserve) {
    return { canSwap: false, reason: "סוגים שונים (ראשי/כונן)" };
  }
  
  // בדיקת נעילות
  if (assignment1.isLocked || assignment2.isLocked) {
    return { canSwap: false, reason: "אחד השיבוצים נעול" };
  }
  
  const person1 = people.find((p) => p.id === assignment1.personId);
  const person2 = people.find((p) => p.id === assignment2.personId);
  
  if (!person1 || !person2) {
    return { canSwap: false, reason: "לא נמצאו אנשים" };
  }
  
  // TODO: בדיקת חסימות לאחר ההחלפה
  
  return { canSwap: true };
}

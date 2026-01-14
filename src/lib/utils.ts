import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  format, 
  parseISO, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval,
  differenceInDays 
} from "date-fns";
import { he } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// המרת תאריך לפורמט עברי
export function formatDateHebrew(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "EEEE, d בMMMM", { locale: he });
}

// קבלת יום בשבוע בעברית
export function getDayNameHebrew(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "EEEE", { locale: he });
}

// קבלת תאריכי סופ"ש מיום חמישי
export function getWeekendDates(thursdayDateStr: string): {
  thursday: string;
  friday: string;
  saturday: string;
} {
  const thursday = parseISO(thursdayDateStr);
  const friday = addDays(thursday, 1);
  const saturday = addDays(thursday, 2);
  
  return {
    thursday: format(thursday, "yyyy-MM-dd"),
    friday: format(friday, "yyyy-MM-dd"),
    saturday: format(saturday, "yyyy-MM-dd"),
  };
}

// בדיקה האם תאריך נמצא בשבוע מסוים (א'-ש')
export function isInSameWeek(dateStr1: string, dateStr2: string): boolean {
  const date1 = parseISO(dateStr1);
  const date2 = parseISO(dateStr2);
  
  // שבוע מתחיל ביום ראשון
  const weekStart1 = startOfWeek(date1, { weekStartsOn: 0 });
  const weekEnd1 = endOfWeek(date1, { weekStartsOn: 0 });
  
  return isWithinInterval(date2, { start: weekStart1, end: weekEnd1 });
}

// חישוב מרחק בימים
export function daysBetween(dateStr1: string, dateStr2: string): number {
  const date1 = parseISO(dateStr1);
  const date2 = parseISO(dateStr2);
  return Math.abs(differenceInDays(date1, date2));
}

// קבלת תחילת השבוע (יום ראשון)
export function getWeekStart(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(startOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd");
}

// בדיקה האם תאריך חסום לאדם (כולל בדיקת סופ"ש)
export function isDateBlocked(
  blockedDates: string[],
  dateStr: string,
  isWeekend: boolean
): boolean {
  if (!isWeekend) {
    return blockedDates.includes(dateStr);
  }
  
  // לסופ"ש - בדיקה של כל שלושת הימים
  const weekendDates = getWeekendDates(dateStr);
  return (
    blockedDates.includes(weekendDates.thursday) ||
    blockedDates.includes(weekendDates.friday) ||
    blockedDates.includes(weekendDates.saturday)
  );
}

// פורמט תאריך קצר
export function formatShortDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "d/M");
}

// קבלת שם החודש בעברית
export function getMonthNameHebrew(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "MMMM yyyy", { locale: he });
}

// תרגום תפקיד לעברית
export function getRoleNameHebrew(role: string): string {
  const roleNames: Record<string, string> = {
    soldier: "חייל תורן",
    commander: "מפקד תורן",
    officer: "קצין תורן",
  };
  return roleNames[role] || role;
}

// תרגום סוג תורנות לעברית
export function getDutyTypeNameHebrew(type: string): string {
  return type === "weekend" ? "סופ״ש" : "יום רגיל";
}

// יצירת ID ייחודי
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// פורמט מספר עם סימן (+ או -)
export function formatWithSign(num: number, decimals: number = 1): string {
  const formatted = num.toFixed(decimals);
  return num >= 0 ? `+${formatted}` : formatted;
}

// בדיקה האם מחרוזת היא תאריך תקין
export function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = parseISO(dateStr);
  return !isNaN(date.getTime());
}

// נרמול רשימת תאריכים מטקסט (מופרדים בפסיקים או שורות חדשות)
export function parseDateList(text: string): string[] {
  return text
    .split(/[,\n\r]+/)
    .map(d => d.trim())
    .filter(d => isValidDate(d));
}

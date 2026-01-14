// סוגי תורנויות
export type DutyType = 'regular' | 'weekend';

// תפקידים
export type Role = 'soldier' | 'commander' | 'officer';

// אדם
export interface Person {
  id: string;
  name: string;
  isSoldier: boolean;
  isCommander: boolean;
  isOfficer: boolean;
  isActive: boolean;
  notes: string | null;
  blockedDates?: BlockedDate[];
  assignments?: Assignment[];
}

// תאריך חסום
export interface BlockedDate {
  id: string;
  personId: string;
  date: string;
}

// משבצת תורנות
export interface DutySlot {
  id: string;
  date: string;
  type: DutyType;
  soldiersNeeded: number;
  commandersNeeded: number;
  officersNeeded: number;
  isLocked: boolean;
  notes: string | null;
  assignments?: Assignment[];
}

// שיבוץ
export interface Assignment {
  id: string;
  slotId: string;
  personId: string;
  role: Role;
  isReserve: boolean;
  isLocked: boolean;
  warnings: string | null;
  person?: Person;
  slot?: DutySlot;
}

// סטטיסטיקות צדק לאדם
export interface JusticeStats {
  personId: string;
  personName: string;
  role: Role;
  daysCount: number; // ימי חול
  weekendsCount: number; // סופ"שים
  reserveDaysCount: number; // כוננויות ימי חול
  reserveWeekendsCount: number; // כוננויות סופ"שים
  lastAssignedDate: string | null;
  daysGapFromAvg: number;
  weekendsGapFromAvg: number;
}

// תוצאת שיבוץ
export interface AssignmentResult {
  personId: string;
  role: Role;
  isReserve: boolean;
  cost: number;
  warnings: string[];
}

// אזהרות שיבוץ
export type WarningType = 
  | 'short_gap'
  | 'consecutive_weekend'
  | 'same_week_reserve'
  | 'no_alternatives'
  | 'fairness_deviation';

export interface Warning {
  type: WarningType;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// משקלי אלגוריתם
export interface AlgorithmWeights {
  fairnessWeight: number;
  gapWeight: number;
  consecutiveWeekendPenalty: number;
  sameWeekReservePenalty: number;
}

// בקשת שיבוץ
export interface AssignmentRequest {
  slotId: string;
  forceRegenerate?: boolean;
}

// תצוגת לוח
export interface CalendarSlot extends DutySlot {
  soldiers: { main: Assignment[]; reserve: Assignment[] };
  commanders: { main: Assignment[]; reserve: Assignment[] };
  officers: { main: Assignment[]; reserve: Assignment[] };
}

// פילטרים
export interface Filters {
  search: string;
  role: Role | 'all';
  status: 'active' | 'inactive' | 'all';
  month: string;
}

// תצוגת טבלת צדק
export interface JusticeTableData {
  soldiers: JusticeStats[];
  commanders: JusticeStats[];
  officers: JusticeStats[];
  averages: {
    soldiers: { days: number; weekends: number };
    commanders: { days: number; weekends: number };
    officers: { days: number; weekends: number };
  };
}

// תוצאת ייצוא
export interface ExportData {
  people: Person[];
  slots: DutySlot[];
  assignments: Assignment[];
  justiceTable: JusticeTableData;
  exportDate: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

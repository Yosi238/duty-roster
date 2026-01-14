import { PrismaClient } from '@prisma/client';
import { addDays, format, nextThursday, startOfToday } from 'date-fns';

const prisma = new PrismaClient();

// שמות ישראליים לדוגמה
const soldierNames = [
  'יוסי כהן', 'דני לוי', 'משה פרץ', 'אבי גולן', 'רון שמעון',
  'גיל ברק', 'עומר דוד', 'איתי רז', 'נדב קליין', 'אלון וייס',
  'תום פישר', 'עידו ברגר', 'שי מלכה', 'ליאור אברהם', 'דור זיו',
  'בן שטרן', 'מתן רוזן', 'יונתן גל', 'אריאל חיים', 'נועם סגל',
  'יובל קמחי', 'רועי שלום', 'אדם פרידמן', 'עמית אלון', 'שחר נחום',
  'יהונתן מזרחי', 'אסף שפירא', 'נתנאל עזרא', 'מיכאל טל', 'אורי לב',
  'ינון גרינברג', 'גל הראל', 'עדי פרנקל', 'אלעד מור', 'ניר רביב',
  'איילון שני', 'יניב רן', 'תומר זהבי', 'רז אופיר', 'אייל ירון'
];

const commanderNames = [
  'סרן יובל אלמוג', 'סרן דן רותם', 'רס"ן עמיר נוי', 
  'רס"ן גיא ארז', 'סרן מור אילן', 'סרן ליאב כרמל'
];

const officerNames = [
  'סא"ל איתן הר-לב', 'רס"ן נועה בן-עמי', 
  'סא"ל רון גבאי', 'רס"ן יעל אורן'
];

async function main() {
  console.log('🌱 מתחיל seed...');

  // ניקוי בסיס הנתונים
  await prisma.assignment.deleteMany();
  await prisma.dutySlot.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.person.deleteMany();
  await prisma.settings.deleteMany();

  console.log('🧹 בסיס הנתונים נוקה');

  // יצירת חיילים
  const soldiers = await Promise.all(
    soldierNames.map(name =>
      prisma.person.create({
        data: {
          name,
          isSoldier: true,
          isCommander: false,
          isOfficer: false,
          isActive: true,
        },
      })
    )
  );
  console.log(`👥 נוצרו ${soldiers.length} חיילים`);

  // יצירת מפקדים
  const commanders = await Promise.all(
    commanderNames.map(name =>
      prisma.person.create({
        data: {
          name,
          isSoldier: false,
          isCommander: true,
          isOfficer: false,
          isActive: true,
        },
      })
    )
  );
  console.log(`🎖️ נוצרו ${commanders.length} מפקדים`);

  // יצירת קצינים
  const officers = await Promise.all(
    officerNames.map(name =>
      prisma.person.create({
        data: {
          name,
          isSoldier: false,
          isCommander: false,
          isOfficer: true,
          isActive: true,
        },
      })
    )
  );
  console.log(`⭐ נוצרו ${officers.length} קצינים`);

  // הוספת חסימות רנדומליות (20% מהימים לכל אדם)
  const today = startOfToday();
  const allPeople = [...soldiers, ...commanders, ...officers];
  
  for (const person of allPeople) {
    const numBlockedDays = Math.floor(Math.random() * 8) + 2; // 2-9 ימים חסומים
    const blockedDays = new Set<string>();
    
    while (blockedDays.size < numBlockedDays) {
      const randomDay = Math.floor(Math.random() * 30);
      const date = format(addDays(today, randomDay), 'yyyy-MM-dd');
      blockedDays.add(date);
    }
    
    await Promise.all(
      Array.from(blockedDays).map(date =>
        prisma.blockedDate.create({
          data: {
            personId: person.id,
            date,
          },
        })
      )
    );
  }
  console.log('🚫 נוספו תאריכים חסומים');

  // יצירת משבצות תורנות לחודש קדימה
  // ימים רגילים (לא חמישי-שבת)
  const dutySlots = [];
  
  for (let i = 0; i < 30; i++) {
    const date = addDays(today, i);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // דילוג על חמישי-שבת (יטופלו כסופ"ש)
    if (dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6) {
      continue;
    }
    
    dutySlots.push({
      date: dateStr,
      type: 'regular',
      soldiersNeeded: 1,
      commandersNeeded: 1,
      officersNeeded: 1,
    });
  }

  // סופשים (מתחילים מיום חמישי הקרוב)
  let thursdayDate = nextThursday(today);
  for (let w = 0; w < 5; w++) {
    const dateStr = format(thursdayDate, 'yyyy-MM-dd');
    dutySlots.push({
      date: dateStr,
      type: 'weekend',
      soldiersNeeded: 2, // יותר חיילים בסופ"ש
      commandersNeeded: 1,
      officersNeeded: 1,
    });
    thursdayDate = addDays(thursdayDate, 7);
  }

  await prisma.dutySlot.createMany({
    data: dutySlots,
  });
  console.log(`📅 נוצרו ${dutySlots.length} משבצות תורנות`);

  // הגדרות ברירת מחדל
  await prisma.settings.createMany({
    data: [
      {
        key: 'adminPassword',
        value: JSON.stringify('admin123'), // סיסמת ברירת מחדל
      },
      {
        key: 'algorithmWeights',
        value: JSON.stringify({
          fairnessWeight: 10, // משקל לאיזון כמות
          gapWeight: 5, // משקל למרווחים
          consecutiveWeekendPenalty: 20, // ענישה על סופ"שים רצופים
          sameWeekReservePenalty: 50, // ענישה על כונן באותו שבוע
        }),
      },
    ],
  });
  console.log('⚙️ נוספו הגדרות מערכת');

  console.log('✅ Seed הושלם בהצלחה!');
}

main()
  .catch((e) => {
    console.error('❌ שגיאה ב-seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

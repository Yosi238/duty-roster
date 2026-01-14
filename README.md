# Duty Roster System - Army Scheduling App

A smart and fair duty scheduling system for military units, built with Next.js 14, TypeScript, Prisma, and SQLite.

## Features

- **People Management**: Add soldiers, commanders, and officers with role assignments
- **Duty Slots**: Create regular days and weekend (Thu-Sat) duty slots
- **Auto-Scheduling**: Fair algorithm that balances workload and respects constraints
- **Reserve System**: Each duty has a backup person assigned
- **Justice Table**: Track fairness metrics per role group
- **Blocked Dates**: Set unavailable dates per person
- **Lock/Unlock**: Lock assignments to prevent changes
- **Swap**: Quick swap between two assignments
- **Export**: JSON and CSV export options
- **Hebrew RTL Interface**: Fully localized

## Quick Start (Easy Method)

### Prerequisites
- Node.js 18+ installed on your computer
- Download from: https://nodejs.org/

### Installation Steps

1. **Extract the ZIP file** to any folder

2. **Open Terminal/Command Prompt** in that folder

3. **Run these commands one by one:**

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Add sample data (40 soldiers, 6 commanders, 4 officers)
npm run db:seed

# Start the app
npm run dev
```

4. **Open browser** and go to: http://localhost:3000

## Default Login
- Password: `admin123`

## Usage Guide

### Adding People
1. Go to "People" tab
2. Click "Add Person"
3. Enter name, select roles (Soldier/Commander/Officer)
4. Add blocked dates if needed (format: YYYY-MM-DD, one per line)

### Creating Duty Slots
1. Go to "Slots" tab
2. Click "Add Slot" for single slot
3. Or "Bulk Add" for multiple dates
4. Set how many of each role needed

### Auto-Scheduling
1. Click "Auto Schedule" button in header
2. System assigns people fairly including reserves
3. Yellow warnings show potential issues
4. Lock important assignments to protect them

### Viewing Schedule
1. "Schedule" tab shows calendar view
2. Click any day for details
3. Use arrows to change month
4. Each slot shows main + reserve assignments

### Justice Table
1. Shows fairness metrics per role
2. "Days" = regular duty count
3. "Weekends" = weekend duty count
4. Green = balanced, Red = above average

## Algorithm Details

The scheduling algorithm considers:
- **Fairness**: Equal distribution of duties within each role
- **Gaps**: Prefer longer time between duties
- **Consecutive Weekends**: Avoid back-to-back weekends
- **Reserve Selection**: Choose backup from different week if possible
- **Blocked Dates**: Never assign on blocked dates
- **Weekend Rule**: If blocked on Thu/Fri/Sat, blocked for whole weekend

## File Structure

```
duty-roster/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Sample data
├── src/
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── globals.css  # Styles
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Main page
│   ├── components/      # React components
│   ├── lib/
│   │   ├── algorithm.ts # Scheduling algorithm
│   │   ├── prisma.ts    # Database client
│   │   └── utils.ts     # Utilities
│   └── types/           # TypeScript types
├── package.json
└── README.md
```

## Defaults Chosen

- **Soldiers needed per slot**: 1 (weekends: 2)
- **Commanders needed per slot**: 1
- **Officers needed per slot**: 1
- **Algorithm weights**:
  - Fairness: 10
  - Gap: 5
  - Consecutive weekend penalty: 20
  - Same week reserve penalty: 50

## Troubleshooting

**"prisma: command not found"**
```bash
npm install
npx prisma generate
```

**Database errors**
```bash
rm prisma/dev.db
npx prisma db push
npm run db:seed
```

**Port 3000 in use**
```bash
npm run dev -- -p 3001
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite
- Tailwind CSS
- shadcn/ui components
- date-fns

## License

MIT

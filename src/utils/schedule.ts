import { ScheduleType } from '../config/types';

export function calculateNextRun(scheduleType: ScheduleType, timeOfDay: string, timezone: string): Date {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const now = new Date();
  let nextRun = new Date();
  
  // Set time of day
  nextRun.setUTCHours(hours, minutes, 0, 0);

  // If time today has passed, start from tomorrow
  if (nextRun <= now) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }

  // Calculate based on schedule type
  switch (scheduleType) {
    case 'daily':
      // Already set for next day if needed
      break;

    case 'two_days':
      if ((now.getUTCDate() % 2) === 0) {
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
      }
      break;

    case 'weekly':
      // Move to next week if we're past the target time this week
      const daysSinceLastRun = 7 - now.getUTCDay();
      if (daysSinceLastRun > 0) {
        nextRun.setUTCDate(nextRun.getUTCDate() + daysSinceLastRun);
      }
      break;

    case 'two_weeks':
      // Calculate days until next bi-weekly run
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000);
      const weeksFromStart = Math.floor(dayOfYear / 14);
      const nextBiWeeklyDay = (weeksFromStart + 1) * 14;
      const daysUntilNext = nextBiWeeklyDay - dayOfYear;
      nextRun.setUTCDate(nextRun.getUTCDate() + daysUntilNext);
      break;

    case 'monthly':
      // Move to first day of next month
      if (nextRun.getUTCDate() !== 1) {
        nextRun.setUTCMonth(nextRun.getUTCMonth() + 1);
        nextRun.setUTCDate(1);
      }
      break;
  }

  return nextRun;
}

export function shouldRunNow(lastRun: Date | null, scheduleType: ScheduleType, timeOfDay: string, timezone: string): boolean {
  if (!lastRun) return true;

  const now = new Date();
  const nextScheduledRun = calculateNextRun(scheduleType, timeOfDay, timezone);

  // If we're past the next scheduled run time, we should run
  return now >= nextScheduledRun;
} 
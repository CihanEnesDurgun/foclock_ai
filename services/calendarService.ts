
import { PomodoroSession } from '../types';

/**
 * Redirects user to Google Calendar "New Event" page.
 * Title format: {Task} [FC]
 */
export const generateCalendarUrl = (
  session: PomodoroSession,
  enhancedDesc: string
): string => {
  const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
  
  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  
  // Fix: session.startTime is a string, converting it to Date for the formatDate function
  const startTime = formatDate(new Date(session.startTime));
  // Fix: session.endTime is a string, converting it to Date for the formatDate function
  const endTime = formatDate(new Date(session.endTime));
  
  const title = `${session.task} [FC]`;
  
  const params = new URLSearchParams({
    text: title,
    details: enhancedDesc,
    dates: `${startTime}/${endTime}`,
  });

  return `${baseUrl}&${params.toString()}`;
};

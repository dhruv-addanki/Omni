import { IntegrationProvider } from '@prisma/client';
import { CalendarProvider, CalendarEventInput } from './types';

// Placeholder: wire real Google Calendar API here.
export const googleCalendarProvider: CalendarProvider = {
  provider: IntegrationProvider.GOOGLE_CALENDAR,
  async fetchEvents(_userId: string, _params: { start: Date; end: Date }): Promise<CalendarEventInput[]> {
    // TODO: Fetch OAuth tokens from IntegrationConnection and call Google Calendar API.
    // Return mapped events with start/end in UTC.
    return [];
  }
};

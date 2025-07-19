import { endOfDay, format, isWithinInterval, parse } from 'date-fns';
import dotenv from 'dotenv-safe';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import winston from 'winston';
import closingPeriods from '../closing-periods.json';
import enrichedPlaces from '../enriched_places.json';
import holidays from '../holidays.json';

// Configure Winston logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/server.log',
      level: 'info',
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
  ],
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        'img-src': [
          "'self'",
          'data:',
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
          'https://*.tile.openstreetmap.org',
          'https://tile.openstreetmap.org',
          'https://*.osm.org',
        ],
        'connect-src': [
          "'self'",
          'https://*.tile.openstreetmap.org',
          'https://tile.openstreetmap.org',
          'https://*.osm.org',
        ],
        'font-src': [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
        ],
        'default-src': ["'self'", '*'],
      },
    },
  }),
);
// Helper function to check if a place is closed during a specific period
function isPlaceClosedInPeriod(
  placeName: string,
  period: {
    from: string;
    to: string;
    for?: string[];
    except?: string[];
  },
  targetDate: Date,
) {
  const currentYear = targetDate.getFullYear();

  // Parse the from and to dates with the current year
  const fromDate = parse(
    `${period.from}-${currentYear}`,
    'dd-MM-yyyy',
    new Date(),
  );
  const toDate = parse(`${period.to}-${currentYear}`, 'dd-MM-yyyy', new Date());

  // Check if target date is within the period
  const isInPeriod = isWithinInterval(targetDate, {
    start: fromDate,
    end: endOfDay(toDate),
  });

  logger.debug(
    `[isPlaceClosedInPeriod] Checking "${placeName}" on ${targetDate.toISOString()}`,
  );
  logger.debug(
    `[isPlaceClosedInPeriod] Period: ${fromDate.toISOString()} - ${toDate.toISOString()}`,
  );
  logger.debug(`[isPlaceClosedInPeriod] Is in period: ${isInPeriod}`);

  if (!isInPeriod) return false;

  if (period.for && Array.isArray(period.for)) {
    const included = period.for.includes(placeName);
    logger.debug(
      `[isPlaceClosedInPeriod] "for" list present. Is "${placeName}" in list? ${included}`,
    );
    return included;
  }

  if (period.except && Array.isArray(period.except)) {
    const excluded = period.except.includes(placeName);
    logger.debug(
      `[isPlaceClosedInPeriod] "except" list present. Is "${placeName}" excluded? ${excluded}`,
    );
    return !excluded;
  }

  logger.debug(
    `[isPlaceClosedInPeriod] No "for" or "except". Defaulting to true.`,
  );
  return true;
}

// Helper function to check if a place is currently closed
function isPlaceClosed(placeName: string, date = new Date()) {
  logger.debug(
    `[isPlaceClosed] Checking if "${placeName}" is closed on ${date.toISOString()}`,
  );
  const result = closingPeriods.some((period) =>
    isPlaceClosedInPeriod(placeName, period, date),
  );
  logger.debug(`[isPlaceClosed] "${placeName}" is closed? ${result}`);
  return result;
}

app.get('/', (_req, res) => {
  logger.debug('[GET /] Serving main HTML');
  res.sendFile(path.join(process.cwd(), 'aulestudio.html'));
});

app.get('/data', (_req, res) => {
  const today = new Date();
  logger.debug(
    '[GET /data/enhanced] Returning data with current closed status',
  );
  const enhancedData = enrichedPlaces.map((place) => ({
    ...place,
    isClosed: isPlaceClosed(place.name, today),
  }));

  res.json(enhancedData);
});

app.get('/holiday', (_req, res) => {
  const today = format(new Date(), 'MM-dd');
  const holiday = holidays.find((h) => h.date === today);
  logger.debug(
    `[GET /holiday] Today: ${today}, Holiday: ${holiday ? holiday.name : 'None'}`,
  );
  res.json(holiday ? holiday.name : null);
});

app.get('/closing-periods', (_req, res) => {
  logger.debug('[GET /closing-periods] Returning closingPeriods data');
  res.json(closingPeriods);
});

app.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`);
});

import path from 'node:path';
import { format } from 'date-fns';
import dotenv from 'dotenv-safe';
import express from 'express';
import helmet from 'helmet';
import enrichedPlaces from '../enriched_places.json';
import holidays from '../holidays.json';

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

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'aulestudio.html'));
});

app.get('/data', (_req, res) => {
  res.json(enrichedPlaces);
});

app.get('/holiday', (_req, res) => {
  const today = format(new Date(), 'MM-dd');
  const holiday = holidays.find((h) => h.date === today);
  res.json(holiday ? holiday.name : null);
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

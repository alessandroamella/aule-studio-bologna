import path from 'node:path';
import { format } from 'date-fns';
import dotenv from 'dotenv-safe';
import express from 'express';
import enrichedPlaces from '../enriched_places.json';
import holidays from '../holidays.json';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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

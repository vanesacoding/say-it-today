import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Prepare source-matched narration jobs; this script makes no paid API calls.
const root = fileURLToPath(new URL('../', import.meta.url));
const raw = await readFile(path.join(root, 'public/books/catalog.js'), 'utf8');
const books = JSON.parse(raw.replace(/^window\.JIGU_BOOKS\s*=\s*/, '').replace(/;\s*$/, ''));
const output = path.join(root, '.reading-audio');
const direction = 'Read the supplied text exactly in natural English, with a bright, childlike story voice and a gently unhurried pace. Preserve natural connected speech, clear sentence stress, wording, repetitions and punctuation. Do not add an introduction, page numbers, explanations, sound effects, or music. Keep the approved Isla audition voice and settings consistent across pages.';
const jobs = books.filter(book => book.audioType === 'device').flatMap(book =>
  book.pages.flatMap((page, index) => {
    if (!page.en.trim()) return [];
    const number = String(index + 1).padStart(2, '0');
    return [{
      id: `${book.id}/${number}`,
      bookId: book.id,
      bookTitle: book.title,
      pageIndex: index,
      text: page.en,
      textSha256: createHash('sha256').update(page.en).digest('hex'),
      target: `${book.id}/audio/${number}.mp3`,
      source: book.source.url,
    }];
  }),
);
const auditionIds = ['come-back-cat/01', 'come-back-cat/07', 'sleepy-mr-sloth/02'];
const auditionJobs = auditionIds.flatMap(id => {
  const [bookId, page] = id.split('/');
  const book = books.find(entry => entry.id === bookId);
  const pageIndex = Number(page) - 1;
  const text = book?.pages[pageIndex]?.en;
  if (!text) throw new Error(`Audition source page missing: ${id}`);
  return [{ id, bookId, bookTitle: book.title, pageIndex, text }];
});
const plan = {
  version: 1,
  status: 'pending-narration-generation',
  language: 'en-US',
  direction,
  qualityReview: [
    'Narration matches the original text, with no omitted, added or repeated words.',
    'Accent, connected speech, sentence stress and question intonation sound natural.',
    'Book character names and uncommon animal names have been checked.',
    'The same voice, pace and recording level are used throughout each book.',
    'Every spoken page has an audible, decodable file; wordless pages remain silent.',
  ],
  bookCount: new Set(jobs.map(job => job.bookId)).size,
  pageCount: jobs.length,
  characterCount: jobs.reduce((sum, job) => sum + [...job.text].length, 0),
  jobs,
};
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(path.join(output, 'audition.json'), `${JSON.stringify({
  version: 1,
  direction,
  voiceSelection: 'Approved audition: Higgsfield seed_audio, preset Isla, speech_rate -8, pitch_rate 2. The provider does not label an age for this voice.',
  jobs: auditionJobs,
}, null, 2)}\n`);
console.log(`Prepared ${plan.bookCount} books, ${plan.pageCount} spoken pages, ${plan.characterCount} characters; ${auditionJobs.length} source passages for voice comparison.`);
console.log('No audio generated, no provider called, no public catalogue changed.');

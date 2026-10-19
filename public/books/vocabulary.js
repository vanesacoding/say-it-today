/* Vocabulary comes only from pages already read or explicitly saved. */
(() => {
  'use strict';
  const keyFor = word => word.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  function collect(books, records = {}, saves = {}) {
    const groups = new Map();
    const ordered = [...books].sort((a, b) => (records[b.id]?.lastReadAt || 0) - (records[a.id]?.lastReadAt || 0));
    for (const book of ordered) {
      const r = records[book.id] || {};
      const furthest = Math.max(Number.isInteger(r.page) ? r.page : 0, Number.isInteger(r.furthestPage) ? r.furthestPage : 0);
      for (const word of book.keywords) {
        if (!saves[book.id + ':' + word.id] && !(r.opened && (r.finished || furthest >= word.pageIndex))) continue;
        const key = keyFor(word.word);
        if (!groups.has(key)) groups.set(key, {key, word: word.word, meaning: word.meaning, sources: []});
        groups.get(key).sources.push({bookId: book.id, wordId: word.id, pageIndex: word.pageIndex});
      }
    }
    return [...groups.values()];
  }
  function queue(items, ratings = {}, now = Date.now(), count = 3) {
    return items.filter(item => !Number.isFinite(ratings[item.key]?.dueAt) || ratings[item.key].dueAt <= now)
      .sort((a, b) => (ratings[a.key]?.dueAt || 0) - (ratings[b.key]?.dueAt || 0))
      .slice(0, Math.max(1, Math.min(5, count)));
  }
  function rate(previous, remembered, now = Date.now()) {
    const successes = remembered ? Math.max(0, Math.min(3, Number.isInteger(previous?.successes) ? previous.successes : 0)) + 1 : 0;
    const days = remembered ? [1, 3, 7, 14][Math.min(successes - 1, 3)] : 1;
    return {successes, lastReviewedAt: now, dueAt: now + days * 86400000};
  }
  window.JiguVocabulary = Object.freeze({keyFor, collect, queue, rate});
})();

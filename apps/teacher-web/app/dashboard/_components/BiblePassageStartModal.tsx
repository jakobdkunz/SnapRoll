"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Modal, Button, TextInput } from '@flamelink/ui';
import { useAction, useQuery } from 'convex/react';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';

const BIBLE_BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy",
  "Joshua","Judges","Ruth","1 Samuel","2 Samuel",
  "1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs",
  "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations",
  "Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk",
  "Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts",
  "Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
  "Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy",
  "2 Timothy","Titus","Philemon","Hebrews","James",
  "1 Peter","2 Peter","1 John","2 John","3 John",
  "Jude","Revelation",
];

const TRANSLATIONS = [
  { id: "web", label: "World English Bible (WEB)" },
  { id: "webbe", label: "World English Bible, British Edition (WEBBE)" },
  { id: "oeb-us", label: "Open English Bible (US)" },
  { id: "oeb-cw", label: "Open English Bible (Commonwealth)" },
  { id: "kjv", label: "King James Version (KJV)" },
  { id: "asv", label: "American Standard Version (ASV)" },
  { id: "bbe", label: "Bible in Basic English (BBE)" },
  { id: "darby", label: "Darby Bible" },
  { id: "dra", label: "Douay-Rheims 1899 American Edition" },
  { id: "ylt", label: "Young's Literal Translation (YLT, NT only)" },
];

export default function BiblePassageStartModal({
  open,
  onClose,
  sectionId,
  sessionId,
  initialReference,
  initialTranslationId,
  demoUserEmail,
}: {
  open: boolean;
  onClose: () => void;
  sectionId: Id<'sections'> | null;
  sessionId?: Id<'biblePassageSessions'> | null;
  initialReference?: string | null;
  initialTranslationId?: string | null;
  demoUserEmail?: string;
}) {
  const router = useRouter();
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  const demoArgs = isDemoMode && demoUserEmail ? { demoUserEmail } : {};
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [verseRange, setVerseRange] = useState('');
  const [translation, setTranslation] = useState<string>('web');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const section = useQuery(
    api.functions.sections.get,
    sectionId ? { id: sectionId as Id<'sections'>, ...demoArgs } : 'skip'
  ) as { title?: string } | null | undefined;

  const startBible = useAction(api.functions.bible.startBiblePassage);
  const updateBible = useAction(api.functions.bible.updateBiblePassage);

  const visible = open && !!sectionId;
  const isEditing = !!sessionId;

  // When opening (or when the initial reference/translation change), seed the fields.
  useEffect(() => {
    if (!open) return;
    const ref = (initialReference || '').trim();
    if (ref) {
      const lastSpace = ref.lastIndexOf(' ');
      if (lastSpace > 0) {
        setSelectedBook(ref.slice(0, lastSpace));
        setBookQuery('');
        setVerseRange(ref.slice(lastSpace + 1));
      } else {
        setSelectedBook(ref);
        setBookQuery('');
        setVerseRange('');
      }
    } else {
      setSelectedBook('');
      setBookQuery('');
      setVerseRange('');
    }
    if (initialTranslationId) {
      setTranslation(initialTranslationId);
    } else {
      setTranslation('web');
    }
    setError(null);
    setWorking(false);
  }, [open, initialReference, initialTranslationId]);

  const normalizedQuery = bookQuery.trim().toLowerCase();
  const matches =
    normalizedQuery.length === 0
      ? BIBLE_BOOKS.slice(0, 8)
      : BIBLE_BOOKS.filter((b) => b.toLowerCase().includes(normalizedQuery)).slice(0, 8);

  const fullReference = `${selectedBook || bookQuery}${verseRange ? ' ' + verseRange : ''}`.trim();

  async function handleStart() {
    if (!sectionId) return;
    setError(null);
    if (!fullReference || !selectedBook) {
      setError('Please select a book and enter a verse or range (e.g. 3:16-18).');
      return;
    }
    try {
      setWorking(true);
      if (isEditing && sessionId) {
        await (updateBible as unknown as (args: {
          sessionId: Id<'biblePassageSessions'>;
          bookAndRange: string;
          translationId: string;
          demoUserEmail?: string;
        }) => Promise<unknown>)({
          sessionId: sessionId as Id<'biblePassageSessions'>,
          bookAndRange: fullReference,
          translationId: translation,
          ...demoArgs,
        });
        onClose();
      } else {
        const createdSessionId = await (startBible as unknown as (args: {
          sectionId: Id<'sections'>;
          bookAndRange: string;
          translationId: string;
          demoUserEmail?: string;
        }) => Promise<unknown>)({
          sectionId: sectionId as Id<'sections'>,
          bookAndRange: fullReference,
          translationId: translation,
          ...demoArgs,
        });
        onClose();
        const idStr =
          typeof createdSessionId === 'string'
            ? createdSessionId
            : String((createdSessionId as unknown as { _id?: string })._id ?? createdSessionId);
        if (idStr) {
          setTimeout(() => router.push(`/bible/live/${idStr}`), 120);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load Bible passage. Please try again.';
      setError(msg);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Modal open={visible} onClose={onClose}>
      <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg p-6 w-[90vw] max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">Bible Passage</h2>
            {section?.title && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {section.title}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Book
            </label>
            <TextInput
              value={selectedBook || bookQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSelectedBook('');
                setBookQuery(e.target.value);
              }}
              placeholder="Start typing (e.g. John)"
            />
            {matches.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                {matches.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                      selectedBook === m ? 'bg-neutral-100 dark:bg-neutral-800 font-medium' : ''
                    }`}
                    onClick={() => {
                      setSelectedBook(m);
                      setBookQuery('');
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Verse or range
            </label>
            <TextInput
              value={verseRange}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerseRange(e.target.value)}
              placeholder="e.g. 3:16-18"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              You can enter a single verse (3:16), range (3:16-18), or multiple segments.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Translation
            </label>
            <select
              value={translation}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setTranslation(e.target.value)
              }
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm px-2 py-1.5 text-neutral-900 dark:text-neutral-100"
            >
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded p-2">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={working || !sectionId} onClick={handleStart}>
              {working ? 'Starting…' : 'Read Passage'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


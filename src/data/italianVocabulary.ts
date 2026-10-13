/**
 * Italian Vocabulary Data & Type Definitions
 * Tailored for Chinese speakers learning Italian, with bilingual UI support (English & Simplified Chinese).
 * Modularized with JSON-based topic pack storage and offline media support.
 */

import greetingsCourtesyPack from './packs/greetings-courtesy.json';
import dailySurvivalPack from './packs/daily-survival.json';
import keyVerbsPack from './packs/key-verbs.json';

export interface BilingualText {
  en: string;
  'zh-CN': string;
}

export interface ExampleSentence {
  it: string;
  en: string;
  'zh-CN': string;
}

export interface WordMedia {
  image?: string | null;
  audio?: string | null;
  attribution?: string | null;
}

export interface ItalianWord {
  id: string;
  word: string; // Target Italian word or phrase
  pinyinHint: string; // Pronunciation approximation optimized for Chinese speakers
  phoneticIPA?: string; // Standard International Phonetic Alphabet
  translations: BilingualText; // English and Simplified Chinese definitions
  category: string; // Identifier for the pack / topic category
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'expression';
  gender?: 'm' | 'f'; // Grammatical gender for nouns
  plural?: string; // Plural form
  pronunciationNotes?: BilingualText; // Targeted phonetic advice for Chinese native speakers
  exampleSentence?: ExampleSentence; // Authentic contextual example
  media?: WordMedia; // Local image and audio assets
}

export interface VocabularyPack {
  id: string;
  title: BilingualText;
  description: BilingualText;
  icon?: string;
  words: ItalianWord[];
}

export const VOCABULARY_PACKS: VocabularyPack[] = [
  greetingsCourtesyPack as VocabularyPack,
  dailySurvivalPack as VocabularyPack,
  keyVerbsPack as VocabularyPack,
];

/**
 * Convenience helper to retrieve all words across all packs
 */
export function getAllWords(): ItalianWord[] {
  return VOCABULARY_PACKS.flatMap((pack) => pack.words);
}

/**
 * Convenience helper to retrieve a pack by ID
 */
export function getPackById(packId: string): VocabularyPack | undefined {
  return VOCABULARY_PACKS.find((pack) => pack.id === packId);
}

/**
 * Search words by Italian text, English translation, or Chinese translation
 */
export function searchWords(query: string): ItalianWord[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return getAllWords();
  return getAllWords().filter(
    (item) =>
      item.word.toLowerCase().includes(clean) ||
      item.translations.en.toLowerCase().includes(clean) ||
      item.translations['zh-CN'].includes(clean) ||
      item.pinyinHint.toLowerCase().includes(clean)
  );
}

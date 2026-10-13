# Technical Architecture & Implementation Plan: "Zen Italian" (Italian for Chinese Speakers)

## 1. Executive Summary & Vision

**Zen Italian** is an interactive, gamified language learning web application designed specifically for native Chinese (Mandarin) speakers learning Italian, with complete bilingual UI support for **English (`en`)** and **Simplified Chinese (`zh-CN`)**.

The application repurposes the high-focus, modular learning architecture pioneered by **Zen Kana** (spaced repetition flashcards, verification testing, interactive gamified arcade modes), while completely replacing Japanese syllabary/kana mechanics with an Italian lexical engine, phonological bridge (Mandarin Pinyin approximations + stress markings), and contextual grammar annotations.

---

## 2. Workspace Constraints & Architecture Rules

1. **Submodule Directory Protection (`./zen-kana`)**:
   - The `./zen-kana` submodule is **strictly read-only**.
   - No files inside `./zen-kana` may be added, edited, copied into, or removed.
   - Any reusable UI paradigms, Tailwind configuration design tokens, or logic structures are adapted via an external Adapter Layer (`./src/adapters/`) or implemented as standalone modular components in `./src/`.
2. **Localization & Multi-Language Framework**:
   - Built on `i18next`.
   - UI seamlessly switches dynamically between `en` (English) and `zh-CN` (Simplified Chinese).
   - Zero hardcoded English or Chinese UI strings.
3. **Target Vocabulary & Phonetic Bridge**:
   - Target vocabulary strictly consists of authentic Italian words and phrases.
   - Phonetic hints provide **Pinyin approximations** tailored for Chinese native speakers to rapidly grasp Italian pronunciation, accentuation, and double-consonant stress.
   - Every lexical item provides both English and Simplified Chinese definitions.

---

## 3. Phonological Bridge: Italian for Chinese Speakers

### 3.1 Why Pinyin Approximations?
Chinese speakers face specific phonological obstacles when learning Italian:
- **Rolled/Trilled 'R' / 'RR'**: The alveolar trill does not exist in standard Mandarin.
- **Vowel Purity**: Italian vowels (*a, e, i, o, u*) are crisp, non-diphthongized single sounds.
- **Double Consonants (Consonanti Doppie)**: Italian lengthens the consonant closure (e.g., *notte*, *mille*), which has no direct Mandarin equivalent.
- **Soft vs. Hard C & G**: *c/g* followed by *e/i* are soft (*ciao* -> `qiào`, *gelato* -> `jié-là-tuò`), whereas before *a/o/u* or with *h* are hard (*caffè* -> `kǎ-fāi`, *chianti* -> `kiàn-tī`).

### 3.2 Pinyin Representation System
To make pronunciation intuitive without requiring immediate mastery of the International Phonetic Alphabet (IPA):
1. **Pinyin Syllables with Tones**: Standard Mandarin Pinyin syllables are used to approximate each Italian syllable.
   - High/accented Italian syllables use First Tone (flat, e.g. `pā`) or Fourth Tone (sharp descending, e.g. `qiào`, `sì`).
   - Falling/soft syllables use Neutral or Third tones.
2. **Hyphenated Syllabification**: Syllables are explicitly separated by hyphens (e.g., `bù-on-jiāo-ěr-nuò` for *buongiorno*).
3. **Phonetic IPA & Explanatory Guidance**: Each word carries both a Pinyin hint and standard IPA, plus targeted pronunciation tips (e.g., "Roll tongue for 'r'", "Short pause before double consonant 'tt'").

---

## 4. Vocabulary & Data Architecture

### 4.1 Schema Definition (`./src/data/italianVocabulary.ts`)
```typescript
export interface BilingualText {
  en: string;
  'zh-CN': string;
}

export interface ExampleSentence {
  it: string;
  en: string;
  'zh-CN': string;
}

export interface ItalianWord {
  id: string;
  word: string; // Italian target word/phrase
  pinyinHint: string; // Pronunciation approximation for Chinese speakers
  phoneticIPA?: string; // Standard IPA representation
  translations: BilingualText; // English & Simplified Chinese
  category: string; // Pack or topic category
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'expression';
  gender?: 'm' | 'f'; // Grammatical gender for nouns
  plural?: string; // Plural form
  pronunciationNotes?: BilingualText; // Specific tips (e.g., rolled R, double consonant)
  exampleSentence?: ExampleSentence; // Contextual usage
}

export interface VocabularyPack {
  id: string;
  title: BilingualText;
  description: BilingualText;
  icon?: string;
  words: ItalianWord[];
}
```

### 4.2 Seed Packs Taxonomy
1. **Greetings & Courtesy (`greetings-courtesy`)**:
   Essential social courtesies (*Ciao, Buongiorno, Buonasera, Buonanotte, Grazie, Grazie mille, Prego, Per favore, Scusa, Scusi, Arrivederci, Piacere*).
2. **Daily Survival (`daily-survival`)**:
   Essential emergency and situational phrases (*Sì, No, Dov'è...?, Il bagno, Quanto costa?, Il conto per favore, Aiuto!, Non capisco, Parla inglese?, Acqua, Pane, Caffè*).
3. **Key Verbs (`key-verbs`)**:
   Foundational high-frequency infinitive verbs (*Essere, Avere, Andare, Fare, Volere, Potere, Dovere, Mangiare, Bere, Parlare, Capire, Vedere*).

---

## 5. Core Learning & Game Modules

### Module A: Spaced Repetition Flashcards
- **Interactive Card Flip**: Clean 3D rotation with front (Italian word + audio trigger + part of speech tag) and back (Pinyin hint, Simplified Chinese, English, IPA, and contextual sentence).
- **Audio Integration**: Integrated Speech Synthesis (Web Speech API with Italian `it-IT` voice) for native audio pronunciation on card flip.
- **Pinyin Toggle**: Learners can toggle Pinyin visibility on/off to test pure reading recall.
- **Mastery Tracking**: "Mastered" vs. "Need Practice" buckets persisted in localStorage, with a filter to review mistaken items.

### Module B: Verification & Testing Suite
- **Multiple Choice Quiz**:
  - Italian -> Chinese / English meaning.
  - Chinese / English -> Italian spelling/word.
  - Audio -> Target word selection.
- **Confidence Scoring & Mistake Review**: Real-time accuracy metrics, streak counts, and targeted post-test review sessions.

### Module C: Falling Words Arcade Game ("Caduta Parole" / "雨下词汇")
- **Game Mechanics**: Italian vocabulary words float down the screen at increasing speeds.
- **Player Interaction**:
  - Prompt displays Italian word + Pinyin audio hint.
  - Player types the translation in Chinese or English, or chooses from floating target catchers/baskets before words reach the bottom border.
- **Combos & Power-ups**: Multiplier streaks for correct answers, time freezes, and explosive clear items for mastered vocabulary.
- **Difficulty Scaler**: Easy (Greetings), Medium (Survival), Hard (Key Verbs & Mixed Rapid Fire).

---

## 6. Localization (L10N) Framework Architecture

- **Engine**: `i18next` with modular resource bundles.
- **Languages**:
  - `en`: English (Default / International)
  - `zh-CN`: Simplified Chinese (Target audience primary language)
- **Namespaces**:
  - `common`: Global actions, buttons, general labels.
  - `nav`: Navigation tabs (Dashboard, Flashcards, Quiz, Falling Words, Settings).
  - `flashcards`: Card controls, flip indicators, study deck stats.
  - `quiz`: Test question prompts, results modal, streak counts.
  - `fallingWords`: Arcade game HUD, score, combo counters, game over screens.
  - `packs`: Vocabulary pack titles, descriptions, and category tags.

---

## 7. Phased Implementation Roadmap

```
+------------------------------------------------------------------------+
| PHASE 1: Planning, Data Schema & L10N Infrastructure (CURRENT)         |
| - Technical Architecture Plan (ITALIAN_APP_PLAN.md)                     |
| - Italian vocabulary TypeScript dataset (src/data/italianVocabulary.ts)|
| - i18next dynamic localization setup (src/i18n.ts)                     |
+------------------------------------------------------------------------+
                                   |
                                   v
+------------------------------------------------------------------------+
| PHASE 2: Application Shell, Styling & Zen-Kana UI Adapters             |
| - Root package configuration (Vite, React, Tailwind, Lucide-react)     |
| - Zen-Kana aesthetic adapter (Zen color tokens, layout, dark mode)     |
| - Top Navigation with dynamic Language Switcher (EN <-> ZH-CN)         |
| - Audio Service (Web Speech API it-IT synthesizer)                     |
+------------------------------------------------------------------------+
                                   |
                                   v
+------------------------------------------------------------------------+
| PHASE 3: Flashcards Study Engine                                       |
| - Interactive 3D flip card component with Pinyin pronunciation hint    |
| - Deck filtering by Pack (Greetings, Survival, Verbs)                  |
| - Audio pronunciation playback button                                  |
| - Spaced-repetition mastery tracking (Mastered / Need Practice)        |
+------------------------------------------------------------------------+
                                   |
                                   v
+------------------------------------------------------------------------+
| PHASE 4: Verification & Testing Suite                                  |
| - Multiple choice quiz (Italian <-> ZH/EN)                             |
| - Listening test with speech synthesis                                 |
| - Score summary, accuracy percentage, and review mode                  |
+------------------------------------------------------------------------+
                                   |
                                   v
+------------------------------------------------------------------------+
| PHASE 5: "Falling Words" Arcade Game                                   |
| - Canvas / requestAnimationFrame dynamic physics engine                |
| - Word dropping mechanics with speed progression                       |
| - Chinese / English input matching or lane selection                   |
| - Combo multiplier, sound effects, and high score board                |
+------------------------------------------------------------------------+
                                   |
                                   v
+------------------------------------------------------------------------+
| PHASE 6: Polish, Offline Persistence & PWA Packaging                   |
| - LocalStorage / IndexedDB progress persistence                        |
| - Offline Service Worker / PWA manifest                                |
| - End-to-end testing and performance tuning                            |
+------------------------------------------------------------------------+
```

---

## 8. Directory Topology

```
/home/lorenzo/personal/test/
├── GEMINI.md                        # Workspace rules & directory constraints
├── ITALIAN_APP_PLAN.md              # Master technical architecture plan
├── package.json                     # Root project dependencies & scripts
├── vite.config.ts                   # Vite build configuration
├── tailwind.config.js               # Tailwind configuration with Zen design tokens
├── index.html                       # Application HTML entry point
├── src/
│   ├── main.tsx                     # React root initialization
│   ├── App.tsx                      # Main container with router/tabs
│   ├── i18n.ts                      # i18next configuration (EN / ZH-CN)
│   ├── data/
│   │   └── italianVocabulary.ts     # Core Italian vocabulary dataset & interfaces
│   ├── components/
│   │   ├── Navigation.tsx           # Navbar with language toggle & mode selector
│   │   ├── Flashcards/              # Flashcards study mode
│   │   ├── Quiz/                    # Verification quiz mode
│   │   ├── FallingWords/            # Arcade game mode
│   │   └── common/                  # Audio button, Pinyin badge, Card container
│   ├── services/
│   │   └── audioService.ts          # Web Speech Synthesis wrapper for Italian
│   └── adapters/                    # Clean adapters referencing Zen Kana design tokens
└── zen-kana/                        # IMMUTABLE READ-ONLY SUBMODULE
```


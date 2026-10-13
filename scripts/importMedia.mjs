#!/usr/bin/env node
/**
 * Zen Italian - Media & Anki Asset Importer
 * 
 * Automatically matches, copies, and links local images and audio files
 * from Anki decks or media collections into Zen Italian vocabulary packs.
 * 
 * Zero external dependencies. Uses native Node.js APIs.
 * 
 * Usage:
 *   npm run import-media -- <path-to-media-folder> [--dry-run]
 *   node scripts/importMedia.mjs <path-to-media-folder> [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PACKS_DIR = path.resolve(ROOT_DIR, 'src/data/packs');
const TARGET_IMG_DIR = path.resolve(ROOT_DIR, 'public/media/images');
const TARGET_AUDIO_DIR = path.resolve(ROOT_DIR, 'public/media/audio');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.avif', '.bmp']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']);

// Parse command line arguments
const rawArgs = process.argv.slice(2);
const isDryRun = rawArgs.includes('--dry-run');
const sourceFolderArg = rawArgs.find((arg) => !arg.startsWith('--'));

console.log('\n======================================================');
console.log('  🇮🇹  Zen Italian - Media & Anki Asset Importer');
console.log('======================================================\n');

if (!sourceFolderArg) {
  console.log('❌ Error: No source media folder specified.\n');
  console.log('Usage:');
  console.log('  npm run import-media -- <path-to-media-folder> [--dry-run]\n');
  console.log('Examples:');
  console.log('  npm run import-media -- /path/to/anki/collection.media');
  console.log('  npm run import-media -- ./my-anki-deck-media --dry-run\n');
  console.log('Supported formats:');
  console.log('  Images: .png, .jpg, .jpeg, .webp, .svg, .gif, .avif');
  console.log('  Audio:  .mp3, .wav, .ogg, .m4a, .aac, .flac\n');
  process.exit(1);
}

const sourceFolder = path.resolve(process.cwd(), sourceFolderArg);

if (!fs.existsSync(sourceFolder) || !fs.statSync(sourceFolder).isDirectory()) {
  console.error(`❌ Error: Source directory does not exist or is not a directory:`);
  console.error(`   ${sourceFolder}\n`);
  process.exit(1);
}

if (isDryRun) {
  console.log('🔍 DRY RUN MODE: No files will be copied and no JSON files modified.\n');
}

// 1. Ensure target public directories exist
if (!isDryRun) {
  fs.mkdirSync(TARGET_IMG_DIR, { recursive: true });
  fs.mkdirSync(TARGET_AUDIO_DIR, { recursive: true });
}

// 2. Load all vocabulary packs
if (!fs.existsSync(PACKS_DIR)) {
  console.error(`❌ Error: Packs directory not found: ${PACKS_DIR}\n`);
  process.exit(1);
}

const packFiles = fs.readdirSync(PACKS_DIR).filter((f) => f.endsWith('.json'));
if (packFiles.length === 0) {
  console.error(`❌ Error: No pack JSON files found in ${PACKS_DIR}\n`);
  process.exit(1);
}

/**
 * Normalizes text for robust fuzzy matching:
 * - lowercase
 * - remove accents (e.g. è -> e, à -> a)
 * - strip punctuation and symbols
 */
function normalizeString(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`\-_\s.,;!?/\\()]/g, '');
}

/**
 * Normalizes filename base:
 * - strips trailing Anki numbering or timestamps (e.g. `ciao_1`, `grazie (2)`)
 */
function cleanFileBase(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return base
    .replace(/\s*\(\d+\)$/, '')
    .replace(/[_\-]\d+$/, '')
    .replace(/^\[sound:/i, '')
    .replace(/\]$/, '');
}

// Load packs into memory
const packs = [];
const allWords = [];

for (const packFileName of packFiles) {
  const filePath = path.join(PACKS_DIR, packFileName);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const packData = JSON.parse(raw);
    packs.push({ fileName: packFileName, filePath, data: packData });
    for (const word of packData.words) {
      allWords.push({
        wordObj: word,
        packId: packData.id,
        packFileName,
        normWord: normalizeString(word.word),
        normId: normalizeString(word.id),
        // English keywords (first 2 segments if split by /)
        normEn: word.translations.en
          .split(/[\/,;]/)
          .map((s) => normalizeString(s))
          .filter(Boolean),
      });
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to parse pack ${packFileName}: ${err.message}`);
  }
}

console.log(`📁 Loaded ${packs.length} packs with ${allWords.length} total words.`);

// 3. Scan the source media folder
const sourceFiles = fs.readdirSync(sourceFolder);
console.log(`📂 Found ${sourceFiles.length} files in source directory: ${sourceFolder}\n`);

const matchedImages = [];
const matchedAudio = [];
const matchedWordsSet = new Set();

for (const fileName of sourceFiles) {
  const ext = path.extname(fileName).toLowerCase();
  const isImg = IMAGE_EXTS.has(ext);
  const isAud = AUDIO_EXTS.has(ext);

  if (!isImg && !isAud) continue;

  const rawBase = cleanFileBase(fileName);
  const normBase = normalizeString(rawBase);

  // Match strategy:
  // 1. Exact or prefix match on Word ID (e.g. gc-01, gc01)
  // 2. Exact match on Italian word (e.g. ciao, buongiorno, per favore)
  // 3. Match on primary English translation keyword (e.g. hello)
  let bestMatch = allWords.find((w) => normBase === w.normId || normBase.startsWith(w.normId + '_'));

  if (!bestMatch) {
    bestMatch = allWords.find((w) => normBase === w.normWord);
  }

  if (!bestMatch) {
    bestMatch = allWords.find((w) => w.normEn.includes(normBase));
  }

  if (bestMatch) {
    matchedWordsSet.add(bestMatch.wordObj.id);
    const sourceFilePath = path.join(sourceFolder, fileName);

    if (isImg) {
      const publicPath = `/media/images/${fileName}`;
      matchedImages.push({
        word: bestMatch.wordObj.word,
        wordId: bestMatch.wordObj.id,
        pack: bestMatch.packFileName,
        fileName,
        sourceFilePath,
        targetPath: path.join(TARGET_IMG_DIR, fileName),
        publicPath,
        wordObj: bestMatch.wordObj,
      });
    } else if (isAud) {
      const publicPath = `/media/audio/${fileName}`;
      matchedAudio.push({
        word: bestMatch.wordObj.word,
        wordId: bestMatch.wordObj.id,
        pack: bestMatch.packFileName,
        fileName,
        sourceFilePath,
        targetPath: path.join(TARGET_AUDIO_DIR, fileName),
        publicPath,
        wordObj: bestMatch.wordObj,
      });
    }
  }
}

// 4. Report matches
console.log('------------------------------------------------------');
console.log(`✨ MATCH RESULTS:`);
console.log(`   📸 Images matched: ${matchedImages.length}`);
console.log(`   🔊 Audio matched:  ${matchedAudio.length}`);
console.log(`   🎴 Words covered:  ${matchedWordsSet.size} / ${allWords.length}`);
console.log('------------------------------------------------------\n');

if (matchedImages.length > 0) {
  console.log('📸 Matched Images:');
  for (const match of matchedImages) {
    console.log(`   • [${match.wordId}] ${match.word.padEnd(16)} -> ${match.fileName} (${match.pack})`);
    if (!isDryRun) {
      fs.copyFileSync(match.sourceFilePath, match.targetPath);
      if (!match.wordObj.media) match.wordObj.media = { image: null, audio: null };
      match.wordObj.media.image = match.publicPath;
    }
  }
  console.log();
}

if (matchedAudio.length > 0) {
  console.log('🔊 Matched Audio:');
  for (const match of matchedAudio) {
    console.log(`   • [${match.wordId}] ${match.word.padEnd(16)} -> ${match.fileName} (${match.pack})`);
    if (!isDryRun) {
      fs.copyFileSync(match.sourceFilePath, match.targetPath);
      if (!match.wordObj.media) match.wordObj.media = { image: null, audio: null };
      match.wordObj.media.audio = match.publicPath;
    }
  }
  console.log();
}

// 5. Save updated pack JSON files
if (!isDryRun && (matchedImages.length > 0 || matchedAudio.length > 0)) {
  for (const pack of packs) {
    fs.writeFileSync(pack.filePath, JSON.stringify(pack.data, null, 2) + '\n', 'utf-8');
    console.log(`💾 Saved updated pack: ${pack.fileName}`);
  }
  console.log('\n✅ All pack metadata updated successfully!');
}

// 6. Highlight words that still don't have images
const wordsWithoutImages = allWords.filter((w) => !w.wordObj.media?.image);
if (wordsWithoutImages.length > 0) {
  console.log('\n------------------------------------------------------');
  console.log(`ℹ️  Words without an image (${wordsWithoutImages.length} remaining):`);
  const groupedByPack = {};
  for (const w of wordsWithoutImages) {
    if (!groupedByPack[w.packId]) groupedByPack[w.packId] = [];
    groupedByPack[w.packId].push(`[${w.wordObj.id}] ${w.wordObj.word}`);
  }
  for (const [pId, list] of Object.entries(groupedByPack)) {
    console.log(`   📂 ${pId}: ${list.join(', ')}`);
  }
  console.log('------------------------------------------------------');
} else {
  console.log('🎉 100% of words in the vocabulary have images!');
}

console.log('\n🚀 Done! Open the browser to preview your flashcards.\n');


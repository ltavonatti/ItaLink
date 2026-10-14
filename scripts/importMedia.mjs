#!/usr/bin/env node
/**
 * Zen Italian - Media Standardization & Deck Sync Script
 * 
 * Performs:
 * 1. Filename Analysis & Cleaning (strips hashes, random IDs, copy numbers)
 * 2. Standardized Renaming (lowercase kebab-case, collision resolution, sha256 deduplication)
 * 3. Bulk Move (moves processed files into public/media/images/)
 * 4. Sync Existing Cards (updates src/data/packs/*.json with matching image paths)
 * 
 * Usage:
 *   node scripts/importMedia.mjs [--dry-run] [--copy] [--source <path>]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Command Line Flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isCopyMode = args.includes('--copy');
const overwriteExisting = args.includes('--overwrite-existing');

// Directory paths
const sourceArgIndex = args.indexOf('--source');
const customSource = sourceArgIndex !== -1 ? args[sourceArgIndex + 1] : null;
const positionalSource = args.find((arg) => !arg.startsWith('--') && arg !== customSource);

const defaultSource = fs.existsSync(path.resolve(ROOT_DIR, 'public/media/temp_anki_deck'))
  ? 'public/media/temp_anki_deck'
  : 'public/media/images';
const SOURCE_DIR = path.resolve(ROOT_DIR, customSource || positionalSource || defaultSource);
const TARGET_DIR = path.resolve(ROOT_DIR, 'public/media/images');
const PACKS_DIR = path.resolve(ROOT_DIR, 'src/data/packs');

const VALID_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.avif']);

console.log('===============================================================');
console.log('  🇮🇹  Zen Italian - Media Standardization & Deck Sync Engine');
console.log('===============================================================\n');

if (isDryRun) {
  console.log('🔍 DRY RUN ACTIVE: Simulating analysis, renaming, and card sync.');
  console.log('   No files will be moved and no JSON files will be written.\n');
}

// Validation
if (!fs.existsSync(SOURCE_DIR) || !fs.statSync(SOURCE_DIR).isDirectory()) {
  console.error(`❌ Error: Source folder not found or is not a directory: ${SOURCE_DIR}`);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// STEP 1 & 2: Filename Analysis, Cleaning, & Standardized Renaming
// -----------------------------------------------------------------------------

/**
 * Strips noise, hashes, IDs, and normalizes into lowercase kebab-case.
 */
function cleanFilename(rawFilename) {
  const ext = path.extname(rawFilename).toLowerCase();
  let base = path.basename(rawFilename, path.extname(rawFilename));

  // 1. Strip trailing 32-40 hex hashes (e.g. -dd853fff270e774755a62c94ef072c5d33396e19)
  base = base.replace(/[-_][0-9a-fA-F]{32,40}$/i, '');

  // 2. Strip UUID patterns if present
  base = base.replace(/[-_][0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i, '');

  // 3. Normalize Blogger / long opaque hash strings
  if (/^[A-Za-z0-9_-]{45,}$/.test(base)) {
    base = 'asset-' + base.slice(0, 16).toLowerCase();
  }

  // 4. Strip duplicate copy markers like " (1)", "_copy"
  base = base.replace(/\s*\(\d+\)$/, '').replace(/[-_]copy$/i, '');

  // 5. Lowercase and normalize separators (spaces, underscores, dots to hyphens)
  base = base
    .toLowerCase()
    .replace(/[\s_.]+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base) base = 'asset';
  return base + ext;
}

/**
 * Computes sha256 of file buffer to detect identical binary duplicates.
 */
function getFileSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

console.log(`📂 Scanning source directory: ${SOURCE_DIR}`);
const sourceFiles = fs.readdirSync(SOURCE_DIR).filter((f) => {
  const ext = path.extname(f).toLowerCase();
  return VALID_EXTENSIONS.has(ext);
});
console.log(`📸 Found ${sourceFiles.length} media files to process.\n`);

// Index existing target directory to avoid collisions with files already in public/media/images
const existingTargetHashes = new Map(); // hash -> filename
const existingTargetNames = new Set();
if (fs.existsSync(TARGET_DIR)) {
  for (const existingFile of fs.readdirSync(TARGET_DIR)) {
    existingTargetNames.add(existingFile.toLowerCase());
    try {
      const fullP = path.join(TARGET_DIR, existingFile);
      if (fs.statSync(fullP).isFile()) {
        const hash = getFileSha256(fullP);
        existingTargetHashes.set(hash, existingFile);
      }
    } catch {
      // Ignore directory or unreadable files
    }
  }
}

const isSameDir = path.resolve(SOURCE_DIR) === path.resolve(TARGET_DIR);

// Plan moves and handle collisions
const moveOperations = [];
const seenHashes = new Map([...existingTargetHashes]);
const allocatedNames = new Set([...existingTargetNames]);
let duplicateCount = 0;
let collisionCount = 0;

if (!isSameDir) {
  for (const rawName of sourceFiles) {

  const sourcePath = path.join(SOURCE_DIR, rawName);
  const hash = getFileSha256(sourcePath);

  // Check for exact binary duplicate
  if (seenHashes.has(hash)) {
    duplicateCount++;
    moveOperations.push({
      action: 'skip_duplicate',
      sourcePath,
      rawName,
      targetName: seenHashes.get(hash),
      hash,
    });
    continue;
  }

  const baseCleanName = cleanFilename(rawName);
  const ext = path.extname(baseCleanName);
  const rawBaseName = path.basename(baseCleanName, ext);

  let finalTargetName = baseCleanName;
  let counter = 2;

  // Collision resolution for distinct files: append -2, -3...
  if (allocatedNames.has(finalTargetName)) {
    collisionCount++;
    while (allocatedNames.has(`${rawBaseName}-${counter}${ext}`)) {
      counter++;
    }
    finalTargetName = `${rawBaseName}-${counter}${ext}`;
  }

  allocatedNames.add(finalTargetName);
  seenHashes.set(hash, finalTargetName);

  moveOperations.push({
    action: isCopyMode ? 'copy' : 'move',
    sourcePath,
    targetPath: path.join(TARGET_DIR, finalTargetName),
    rawName,
    targetName: finalTargetName,
    publicPath: `/media/images/${finalTargetName}`,
    hash,
  });
  }

  console.log('---------------------------------------------------------------');
  console.log('📊 STANDARDIZATION & DEDUPLICATION SUMMARY:');
  console.log(`   • Total source files:       ${sourceFiles.length}`);
  console.log(`   • Unique new assets:        ${moveOperations.filter((o) => o.action !== 'skip_duplicate').length}`);
  console.log(`   • Binary duplicates pruned: ${duplicateCount}`);
  console.log(`   • Collision-resolved (-2):  ${collisionCount}`);
  console.log('---------------------------------------------------------------\n');

  // -----------------------------------------------------------------------------
  // STEP 3: Bulk Move Operations
  // -----------------------------------------------------------------------------

  if (!isDryRun) {
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    let movedCount = 0;
    for (const op of moveOperations) {
      if (op.action === 'skip_duplicate') {
        // Remove duplicate from temp folder if moving, to leave temp clean
        if (!isCopyMode) {
          fs.unlinkSync(op.sourcePath);
        }
        continue;
      }

      if (op.action === 'move') {
        try {
          fs.renameSync(op.sourcePath, op.targetPath);
        } catch (err) {
          // Fallback for cross-device or partition moves
          if (err.code === 'EXDEV') {
            fs.copyFileSync(op.sourcePath, op.targetPath);
            fs.unlinkSync(op.sourcePath);
          } else {
            throw err;
          }
        }
        movedCount++;
      } else if (op.action === 'copy') {
        fs.copyFileSync(op.sourcePath, op.targetPath);
        movedCount++;
      }
    }

    console.log(`🚚 Bulk Operation Complete: ${movedCount} files transferred to ${TARGET_DIR}`);

    // If temp folder is now empty and in move mode, clean up
    if (!isCopyMode && fs.existsSync(SOURCE_DIR)) {
      const remaining = fs.readdirSync(SOURCE_DIR);
      if (remaining.length === 0) {
        console.log(`🧹 Source directory ${SOURCE_DIR} is empty and clean.`);
      } else {
        console.log(`ℹ️  ${remaining.length} non-media items remain in source folder.`);
      }
    }
  } else {
    console.log(`🚚 [Simulated] Bulk Move: ${moveOperations.filter((o) => o.action !== 'skip_duplicate').length} files ready for transfer.`);
  }
} else {
  console.log(`ℹ️  Source and Target directories are identical (${TARGET_DIR}).`);
  console.log(`   Skipping file transfers and proceeding directly to deck synchronization.\n`);
}

// -----------------------------------------------------------------------------
// STEP 4: Sync Existing Cards
// -----------------------------------------------------------------------------

console.log('\n---------------------------------------------------------------');
console.log('🎴 SYNCHRONIZING VOCABULARY DECKS');
console.log('---------------------------------------------------------------');

// Semantic dictionary mapping Italian deck card IDs and keywords to standardized asset names
const VOCABULARY_ASSET_MAPPINGS = {
  // === 1. Greetings & Courtesy Pack (40 items) ===
  'gc-01': ['gc-01-ciao.svg', 'aisatsu-sayounara-2.webp'], // Ciao
  'gc-02': ['aisatsu-kodomo-otona.webp', 'hotel-morning-call.webp'], // Buongiorno
  'gc-03': ['party-drink-rojou-noimikai.webp'],        // Buonasera
  'gc-04': ['study-night-boy.webp', 'time4-yoru.webp'],// Buonanotte
  'gc-05': ['gc-05-grazie.svg'],                       // Grazie
  'gc-06': ['ojigi-aisatsu-business-woman.webp'],      // Grazie mille
  'gc-07': ['ojigi-tenin-woman.webp'],                 // Prego
  'gc-08': ['onegai-gomen-man.webp'],                  // Per favore
  'gc-09': ['onegai-gomen-woman.webp'],                // Scusa
  'gc-10': ['business-ojigi-man.webp'],                // Scusi
  'gc-11': ['aisatsu-sayounara.webp'],                 // Arrivederci
  'gc-12': ['akusyu-man-woman.webp', 'akusyu-black-white.webp'], // Piacere
  'gc-13': ['talk-man-woman-casual.webp'],             // Come stai?
  'gc-14': ['character-heart-genki.webp'],             // Sto bene
  'gc-15': ['mon-gate-asia-open-half.webp', 'door-in-businessman.webp'], // Benvenuto
  'gc-16': ['aisatsu-sayounara-2.webp'],               // A presto
  'gc-17': ['syufu-miokuri.webp'],                     // A dopo
  'gc-18': ['text-day5-ashita.webp'],                  // A domani
  'gc-19': ['syoukai-business-man.webp'],              // Come ti chiami?
  'gc-20': ['jikosyoukai-man.webp'],                   // Mi chiamo...
  'gc-21': ['sekaichizu.webp'],                        // Di dove sei?
  'gc-22': ['landmark-hotoke-ushiku-daibutsu.webp'],   // Sono cinese
  'gc-23': ['world-giza-sphynx.webp', 'travel-happy-young4.webp'], // Sono italiano
  'gc-24': ['window01-hare.webp', 'window02-aozora.webp'], // Buona giornata
  'gc-25': ['bg-school-room-yuyake.jpg'],              // Buona serata
  'gc-26': ['weekmark6-sat.webp', 'weekmark7-sun.webp'], // Buon weekend
  'gc-27': ['work-shigoto-osame-man.webp', 'shigoto-tekipaki.webp'], // Buon lavoro
  'gc-28': ['pose-ganbarou-woman.webp'],               // Buona fortuna
  'gc-29': ['pose-makasenasai-boy.webp'],              // In bocca al lupo
  'gc-30': ['figure-goodjob.webp'],                    // Viva il lupo
  'gc-31': ['wedding-syukufuku.webp'],                 // Tanti auguri
  'gc-32': ['birthday-cake.png'],                      // Buon compleanno
  'gc-33': ['trophy-school-girl.webp', 'wedding-syukufuku-2.webp'], // Congratulazioni
  'gc-34': ['party-drink-rojou-noimikai.webp'],        // Salute!
  'gc-35': ['wakeru-drink.webp'],                      // Cin cin!
  'gc-36': ['pose-syazai-sliding-dogeza-man.webp', 'dogeza-ojiisan.webp'], // Scusami tanto
  'gc-37': ['yurusu.webp'],                            // Non fa niente
  'gc-38': ['ojigi-tenin-woman.webp'],                 // Di niente
  'gc-39': ['character-ochoushimono.webp'],            // Con piacere
  'gc-40': ['aisatsu-sayounara.webp'],                 // Ci vediamo

  // === 2. Food, Coffee & Dining Pack (40 items) ===
  'fd-01': ['bg-cafe.jpg'],                            // Un caffè
  'fd-02': ['tea2.webp'],                              // Cappuccino
  'fd-03': ['sweets-crepe-teppan.webp', 'pan-bread-set.webp'], // Cornetto
  'fd-04': ['food-medamayaki-futago.webp'],            // Colazione
  'fd-05': ['food-obentou-makunouchi.webp'],           // Pranzo
  'fd-06': ['syokuji-woman2.webp'],                    // Cena
  'fd-07': ['book-open-yoko.webp'],                    // Il menù
  'fd-08': ['cooking-microwave-sara.webp', 'fruit-grapefruit-cut.webp'], // Antipasto
  'fd-09': ['food-ra-men-tanmen.webp'],                // Primo
  'fd-10': ['food-niku-katamari-abura.webp', 'syokuji-sakana-kitanai.webp'], // Secondo
  'fd-11': ['vegetable-yasai-kirai.webp'],             // Contorno
  'fd-12': ['sweets-baketsu-purin.webp'],              // Dolce
  'fd-13': ['shopping-shiharai-man.webp', 'money-10.webp'], // Il conto
  'fd-14': ['osara-yamadumi.webp', 'souji-table-fuku-boy.webp'], // Il coperto
  'fd-15': ['sweets-crepe-teppan.webp', 'sweets-okashi-erabu-boy-2.webp'], // Pizza
  'fd-16': ['food-ra-men-tanmen.webp'],                // Pasta
  'fd-17': ['food-tamagokakegohan.webp', 'amount-gohan-ochawan2.webp'], // Risotto
  'fd-18': ['drink-rum.webp'],                         // Vino rosso
  'fd-19': ['amount-water-glass3.webp'],               // Vino bianco
  'fd-20': ['himan-beer-para-man.webp'],               // Birra
  'fd-21': ['tearai3-arau.webp'],                      // Tè
  'fd-22': ['koori-ice.webp'],                         // Gelato
  'fd-23': ['sweets-chocolate-cake-sachertorte.webp'], // Tiramisù
  'fd-24': ['bread-syokupan-5maigiri.webp', 'sweets-okashi-erabu-boy.webp'], // Formaggio
  'fd-25': ['food-niku-katamari-abura.webp'],          // Prosciutto
  'fd-26': ['hato-olive.webp'],                        // Olio d'oliva
  'fd-27': ['cooking-hitotsumami.webp'],               // Sale
  'fd-28': ['cooking-hitotsumami-2.webp'],             // Zucchero
  'fd-29': ['cooking-mama.webp'],                      // Forchetta
  'fd-30': ['cooking-houchou.webp', 'dougu-army-knife.webp'], // Coltello
  'fd-31': ['amount-gohan-ochawan2.webp'],             // Cucchiaio
  'fd-32': ['amount-water-glass2.webp'],               // Bicchiere
  'fd-33': ['baby-jyunyu-honyubin.webp', 'drink-rum.webp'], // Bottiglia
  'fd-34': ['cooking-ih-heater.webp'],                 // Caldo
  'fd-35': ['fuyu-samui.webp', 'ofuro-shower-cold.webp'], // Freddo
  'fd-36': ['oishii6-woman.webp', 'oishii7-obasan.webp'], // Buono
  'fd-37': ['bread-syokupan-5maigiri.webp'],           // Senza glutine
  'fd-38': ['cooking-jitsuen-hanbai.webp', 'syokuji-woman2.webp'], // Vorrei ordinare...
  'fd-39': ['shopping-bag-rejibukuro.webp'],           // Da portare via
  'fd-40': ['shopping-shiharai-man.webp'],             // Posso pagare con carta?

  // === 3. Daily Survival & City Life Pack (40 items) ===
  'ds-01': ['mark-maru.webp', 'figure-goodjob.webp'],  // Sì (Yes)
  'ds-02': ['animal-quiz-inu-batsu.webp'],             // No (No)
  'ds-03': ['boy-question.webp', 'girl-question.webp'], // Dov'è...? (Where is...?)
  'ds-04': ['toilet-gaman-boy.webp', 'toilet-nagasu-hand.webp'], // Il bagno (Bathroom)
  'ds-05': ['money-10.webp'],                          // Quanto costa? (Cost)
  'ds-06': ['business-ojigi-man.webp', 'money-10.webp'], // Il conto, per favore (The bill)
  'ds-07': ['gake-tasukeru.webp', 'train-sos-button.webp'], // Aiuto! (Help!)
  'ds-08': ['study-wakaranai-boy.webp'],                // Non capisco (Don't understand)
  'ds-09': ['english-speaking.webp'],                   // Parla inglese? (Speak English?)
  'ds-10': ['amount-water-glass2.webp', 'amount-water-glass3.webp'], // Acqua (Water)
  'ds-11': ['pan-bread-set.webp', 'bread-syokupan-5maigiri.webp'], // Pane (Bread)
  'ds-12': ['bg-cafe.jpg', 'tea2.webp'],                // Caffè (Coffee)
  'ds-13': ['car-gps.webp', 'sekaichizu.webp'],         // Dove siamo?
  'ds-14': ['yajirushi-kururi-right.webp'],             // A destra
  'ds-15': ['yajirushi12-left-right.webp'],             // A sinistra
  'ds-16': ['yajirushi-fast.webp'],                     // Sempre dritto
  'ds-17': ['shopping-mall-ekinaka.webp'],              // La stazione
  'ds-18': ['train-4retsu-jousya.webp', 'train-arashiyama-torokko.webp'], // Il treno
  'ds-19': ['train-homedoor-smartphone-otosu.webp'],    // La metro
  'ds-20': ['car-side.webp'],                           // L'autobus
  'ds-21': ['tosyokan-syokuin-barcode.webp', 'cardgame-deck-hiku.webp'], // Il biglietto
  'ds-22': ['kuukou.webp'],                             // L'aeroporto
  'ds-23': ['car-taxi-free.webp', 'taxi-tomeru-man.webp'], // Il taxi
  'ds-24': ['medical-medicine.webp', 'medical-medicine-2.webp'], // La farmacia
  'ds-25': ['dai-byouin2.webp'],                        // L'ospedale
  'ds-26': ['police-man1-young.webp', 'otoshimono-police1.webp'], // La polizia
  'ds-27': ['shopping-supermarket-woman.webp'],         // Il supermercato
  'ds-28': ['hotel-morning-call.webp'],                 // L'hotel
  'ds-29': ['room-kodomobeya.webp', 'room-office-clean.webp'], // La camera
  'ds-30': ['kagi-ie.webp'],                            // La chiave
  'ds-31': ['internet-heiwa.webp'],                     // Il Wi-Fi
  'ds-32': ['computer-onetime-password.webp'],          // La password
  'ds-33': ['door-half-open.webp'],                     // Aperto
  'ds-34': ['text-oshirase-eigyousyuuryou.webp'],       // Chiuso
  'ds-35': ['text-entrance.webp'],                      // Entrata
  'ds-36': ['door-out-businesswoman.webp', 'door-out-obaasan.webp'], // Uscita
  'ds-37': ['shopping-reji-gyouretsu-man.webp'],        // La cassa
  'ds-38': ['document-paper-mekure.webp'],              // Lo scontrino
  'ds-39': ['otoshimono-saifu.webp', 'otoshimono-man.webp'], // Ho perso...
  'ds-40': ['train-sos-button.webp', 'medical-triage-kakunin4-juumei.webp'], // Chiami un'ambulanza!

  // === 4. Key Verbs Pack (40 items) ===
  'kv-01': ['character-ochoushimono.webp'],             // Essere
  'kv-02': ['dorobou-money-kasoutsuuka-coin.webp'],     // Avere
  'kv-03': ['walking2-man.webp'],                       // Andare
  'kv-04': ['cooking-ih-heater.webp'],                  // Fare
  'kv-05': ['nagareboshi-oinori-negaigoto.webp'],       // Volere
  'kv-06': ['figure-goodjob.webp'],                     // Potere
  'kv-07': ['toilet-gaman-boy.webp'],                   // Dovere
  'kv-08': ['onigiri-taberu-man.webp'],                 // Mangiare
  'kv-09': ['ofuro-drink-milk-man.webp', 'drink-rum.webp'], // Bere
  'kv-10': ['fusen-hanasu-boy.webp'],                   // Parlare
  'kv-11': ['animal-quiz-neko-maru.webp'],              // Capire
  'kv-12': ['window-miru-man.webp', 'window-miru-woman.webp'], // Vedere
  'kv-13': ['hirameki-man.webp', 'woman-idea.webp'],    // Sapere
  'kv-14': ['syoukai-business-man-2.webp', 'syoukai-business-man.webp'], // Conoscere
  'kv-15': ['ue-mezasu-man.webp', 'tachiagaru-woman.webp'], // Venire
  'kv-16': ['door-out-obaasan.webp', 'door-out-businesswoman.webp'], // Uscire
  'kv-17': ['shopping-shufu.webp'],                     // Comprare
  'kv-18': ['shopping-shiharai-man.webp'],              // Pagare
  'kv-19': ['nimotsu-takai-toru-woman.webp', 'nimotsu-uketoru-man.webp'], // Prendere
  'kv-20': ['nimotsu-ukewatashi.webp'],                 // Dare
  'kv-21': ['teinen-slowlife.webp'],                    // Stare
  'kv-22': ['neru-sleep-woman.webp'],                   // Dormire
  'kv-23': ['shigoto-tekipaki.webp', 'work-shigoto-osame-man.webp'], // Lavorare
  'kv-24': ['study-gogaku-man7.webp', 'study-man-normal.webp'], // Studiare
  'kv-25': ['boy-question.webp'],                       // Chiedere
  'kv-26': ['phone-kurodenwa-call.webp'],               // Rispondere
  'kv-27': ['pose-sagasu-kyorokyoro-man.webp'],         // Cercare
  'kv-28': ['hakken-kyouryu.webp', 'toy-goods-search.webp'], // Trovare
  'kv-29': ['pose-iraira-matsu.webp', 'pose-tokei-kakunin-man.webp'], // Aspettare
  'kv-30': ['travel-isogu.webp', 'travel-nidukuri.webp'], // Partire
  'kv-31': ['travel-happy-young4.webp'],                // Arrivare
  'kv-32': ['door-in-businessman.webp'],                // Entrare
  'kv-33': ['kiku-woman.webp'],                         // Sentire
  'kv-34': ['smart-speaker-tv-talk.webp'],              // Ascoltare
  'kv-35': ['syomei-onegai.webp', 'school-test-enpitsu.webp'], // Scrivere
  'kv-36': ['tegami-yomu-man-binsen.webp', 'book-dokusyo-kansoubun.webp'], // Leggere
  'kv-37': ['hinanjo-seikatsu-family-smile.webp', 'travel-happy-family-father.webp'], // Vivere
  'kv-38': ['train-yuzuru-ninpu.webp', 'gake-tasukeru.webp'], // Aiutare
  'kv-39': ['photo-omoide.webp'],                       // Ricordare
  'kv-40': ['megane-sagasu-odeko-man.webp'],            // Dimenticare

  // === 5. Italian Slang & Street Italian (40 items) ===
  'is-01': ['study-wakaranai-boy.webp'],                // Boh!
  'is-02': ['yaruki-moeru-man.webp', 'travel-isogu.webp'], // Dai!
  'is-03': ['face-angry-woman5.webp'],                  // Cavolo!
  'is-04': ['figure-goodjob.webp'],                     // Che figata!
  'is-05': ['tsukare-girl.webp', 'hima-taikutsu.webp'], // Che palle!
  'is-06': ['pose-sugoi-okoru-man.webp'],               // Cazzo!
  'is-07': ['undoukai-pyramid-kuzureru.webp'],          // Un casino
  'is-08': ['teinen-slowlife.webp'],                    // Meno male!
  'is-09': ['ojigi-aisatsu-business-woman.webp'],       // Figurati!
  'is-10': ['yume-man.webp'],                           // Magari!
  'is-11': ['joushi-buka-men2-okoru.webp', 'police-angry-man.webp'], // Stronzo
  'is-12': ['pose-sugoi-okoru-man.webp', 'face-angry-woman5.webp'], // Vaffanculo!
  'is-13': ['bikkuri-me-tobideru-man.webp'],            // Mamma mia!
  'is-14': ['pose-kusai.webp'],                         // Che schifo!
  'is-15': ['talk-man-woman-casual.webp'],              // Ti va?
  'is-16': ['figure-service.webp', 'teinen-slowlife.webp'], // Tranquillo!
  'is-17': ['figure-goodjob.webp'],                     // Ci sta
  'is-18': ['pose-syazai-sliding-dogeza-man.webp'],     // Fare brutta figura
  'is-19': ['businessman-dekiru.webp', 'businessman-dekiru-2.webp'], // Fare bella figura
  'is-20': ['vegetable-yasai-kirai.webp'],              // Non mi va
  'is-21': ['friends-abareru.webp'],                    // Che bordello!
  'is-22': ['cat-nezumi-oikakeru.webp', 'cat-nezumi-oikakeru-2.webp'], // Beccare
  'is-23': ['aisatsu-sayounara-2.webp'],                // Ci vediamo dopo, raga
  'is-24': ['animal-quiz-inu-batsu.webp'],              // Macché!
  'is-25': ['animal-buta-shock.webp'],                  // Ma va?!
  'is-26': ['trophy-school-girl.webp'],                 // Sei un grande!
  'is-27': ['test0.webp'],                              // Che figura di merda!
  'is-28': ['syokuji-sakana-kitanai.webp'],             // Mi fa cagare
  'is-29': ['hako-nakami-nandarou-man.webp', 'box-kara-hako.webp'], // Rompere le scatole
  'is-30': ['tosou-airbrush-bad.webp'],                 // A cazzo di cane
  'is-31': ['uso-hakkenki-man.webp'],                   // Cazzata
  'is-32': ['hima-taikutsu.webp'],                      // Non me ne frega niente
  'is-33': ['animal-monkey-gelada-hihi.webp'],          // Testa di cazzo
  'is-34': ['akuma-shadow.webp'],                       // Minchia!
  'is-35': ['honoo-hi-fire.webp'],                      // Che bomba!
  'is-36': ['pose-yubisashi-kakunin-businessman.webp'], // Andare liscio
  'is-37': ['pose-ganbarou-woman.webp'],                // Dai che ce la fai!
  'is-38': ['yuusya-game.webp'],                        // Spaccare
  'is-39': ['test100.webp'],                            // Avere culo
  'is-40': ['ojigi-tenin-woman.webp'],                  // Ci mancherebbe!
};

// Available standardized assets in TARGET_DIR (from existing + planned moves)
const availableAssets = new Set([
  ...allocatedNames,
  ...existingTargetNames,
]);

// Read all pack files
const packFiles = fs.existsSync(PACKS_DIR)
  ? fs.readdirSync(PACKS_DIR).filter((f) => f.endsWith('.json'))
  : [];

let totalUpdatedWords = 0;
const packUpdates = [];

for (const packFileName of packFiles) {
  const packPath = path.join(PACKS_DIR, packFileName);
  const packRaw = fs.readFileSync(packPath, 'utf-8');
  const packData = JSON.parse(packRaw);
  let packModified = false;

  for (const word of packData.words) {
    // Preserve custom hand-crafted SVG assets unless overwrite requested
    if (word.media?.image && !overwriteExisting && word.media.image.endsWith('.svg')) {
      continue;
    }

    // Check if card has a candidate mapping
    const candidates = VOCABULARY_ASSET_MAPPINGS[word.id] || [];
    let matchedAsset = null;

    for (const cand of candidates) {
      if (availableAssets.has(cand)) {
        matchedAsset = cand;
        break;
      }
    }

    if (matchedAsset) {
      const newPath = `/media/images/${matchedAsset}`;
      if (word.media?.image !== newPath) {
        if (!word.media) word.media = { image: null, audio: null };
        const oldImage = word.media.image;
        word.media.image = newPath;
        packModified = true;
        totalUpdatedWords++;
        console.log(`   ✨ [${word.id}] ${word.word.padEnd(16)} -> ${newPath} ${oldImage ? `(was: ${oldImage})` : '(was: null)'}`);
      }
    }
  }

  if (packModified) {
    packUpdates.push({ packPath, packData, packFileName });
  }
}

if (!isDryRun && packUpdates.length > 0) {
  for (const update of packUpdates) {
    fs.writeFileSync(update.packPath, JSON.stringify(update.packData, null, 2) + '\n', 'utf-8');
    console.log(`💾 Saved updated deck pack: ${update.packFileName}`);
  }
}

console.log('---------------------------------------------------------------');
console.log(`🎉 COMPLETED!`);
console.log(`   • Decks checked:     ${packFiles.length}`);
console.log(`   • Word cards synced: ${totalUpdatedWords}`);
console.log('===============================================================\n');

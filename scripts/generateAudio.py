#!/usr/bin/env python3
"""
Batch Neural Audio Generator for Zen Italian Flashcards.
Synthesizes authentic, high-fidelity Italian speech for vocabulary words
and example sentences using Microsoft Edge Neural TTS voices (Elsa and Diego).
Updates src/data/packs/*.json metadata with paths to the generated audio assets.
"""

import os
import re
import json
import asyncio
import unicodedata
from pathlib import Path
import edge_tts

VOICE_FEMALE = "it-IT-ElsaNeural"   # Elsa (Female, natural native cadence)
VOICE_MALE = "it-IT-DiegoNeural"    # Diego (Male, natural native cadence)

BASE_DIR = Path(__file__).resolve().parent.parent
PACKS_DIR = BASE_DIR / "src" / "data" / "packs"
AUDIO_DIR = BASE_DIR / "public" / "media" / "audio"

def slugify(text: str) -> str:
    """Normalize text into a clean filesystem-friendly slug."""
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '_', text)

async def synthesize_speech(text: str, voice: str, target_path: Path) -> bool:
    """Synthesize text to MP3 using edge-tts with retry logic."""
    if not text or not text.strip():
        return False

    clean_text = text.strip()
    target_path.parent.mkdir(parents=True, exist_ok=True)

    # If already generated and > 500 bytes, skip regeneration unless forced
    if target_path.exists() and target_path.stat().st_size > 500:
        return True

    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(clean_text, voice)
            await communicate.save(str(target_path))
            if target_path.exists() and target_path.stat().st_size > 0:
                return True
        except Exception as e:
            print(f"    [Retry {attempt + 1}/3] Error synthesizing '{clean_text[:20]}...': {e}")
            await asyncio.sleep(1.0)
    return False

async def process_pack(pack_file: Path) -> int:
    """Process all cards in a pack and update the JSON structure."""
    print(f"\n🎧 Processing pack: {pack_file.name}")
    with open(pack_file, "r", encoding="utf-8") as f:
        pack_data = json.load(f)

    words = pack_data.get("words", [])
    updated_count = 0

    for idx, item in enumerate(words):
        card_id = item.get("id", f"card-{idx:02d}")
        word_text = item.get("word", "")
        example_obj = item.get("exampleSentence", {})
        example_it = example_obj.get("it", "") if isinstance(example_obj, dict) else ""

        # Balanced alternate voice distribution
        voice = VOICE_FEMALE if idx % 2 == 0 else VOICE_MALE
        speaker_name = "Elsa" if voice == VOICE_FEMALE else "Diego"

        word_slug = slugify(word_text)[:25]
        word_filename = f"it_{card_id}_{word_slug}.mp3"
        word_path = AUDIO_DIR / word_filename

        print(f"  [{idx + 1}/{len(words)}] {card_id}: '{word_text}' ({speaker_name})")

        # Synthesize primary word
        ok_word = await synthesize_speech(word_text, voice, word_path)

        # Synthesize example sentence if present
        example_filename = None
        if example_it:
            example_filename = f"it_{card_id}_{word_slug}_example.mp3"
            example_path = AUDIO_DIR / example_filename
            await synthesize_speech(example_it, voice, example_path)

        # Update metadata
        if "media" not in item:
            item["media"] = {}

        if ok_word:
            item["media"]["audio"] = f"/media/audio/{word_filename}"
        if example_filename:
            item["media"]["exampleAudio"] = f"/media/audio/{example_filename}"
        item["media"]["voiceSpeaker"] = speaker_name

        updated_count += 1

    # Save pack with formatting
    with open(pack_file, "w", encoding="utf-8") as f:
        json.dump(pack_data, f, ensure_ascii=False, indent=2)

    print(f"  ✅ Finished {pack_file.name}: {updated_count} cards updated with neural audio.")
    return updated_count

async def main():
    print("=" * 60)
    print("🚀 Starting Italian Neural TTS Generation (Edge TTS)")
    print(f"   Voices: {VOICE_FEMALE} & {VOICE_MALE}")
    print(f"   Destination: {AUDIO_DIR}")
    print("=" * 60)

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    pack_files = sorted(PACKS_DIR.glob("*.json"))
    
    if not pack_files:
        print("❌ No pack files found in", PACKS_DIR)
        return

    total_cards = 0
    for pack_file in pack_files:
        total_cards += await process_pack(pack_file)

    print("\n" + "=" * 60)
    print(f"🎉 Complete! Processed {total_cards} cards across {len(pack_files)} packs.")
    print(f"   Audio assets written to {AUDIO_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())


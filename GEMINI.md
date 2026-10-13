# Workspace Guidelines and Architecture Rules

## 1. Developer Communication
- Always respond, explain code, and chat with the user in **English**.

## 2. Directory Protection & Read-Only Policy
- The `./zen-kana` directory (git submodule) is **strictly read-only**.
- **NEVER** modify, write, copy into, or delete any files inside `./zen-kana`.
- Any components, styles, or utilities borrowed from `./zen-kana` must be referenced as immutable external modules or cleanly wrapped via adapters.

## 3. Localization & Multi-Language UI Framework
- The root application must implement a multi-language UI framework supporting both:
  - **English (`en`)**
  - **Simplified Chinese (`zh-CN`)**
- Users must be able to toggle dynamically between `en` and `zh-CN`.

## 4. Target Vocabulary & Subject Matter
- The target language vocabulary dataset injected into the card engine components must strictly use **Italian**.
- Translations, definitions, and phonetic/grammatical annotations should support both `en` and `zh-CN` according to the active UI language.

## 5. File Location Standards
- All new adapters, components, translation configurations, datasets, and application code must be created in:
  - The main project root folder (`./`), or
  - The `./src` directory (`./src/`).


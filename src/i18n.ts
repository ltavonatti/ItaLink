import { useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'zh-CN';

export const STORAGE_LANG_KEY = 'zen_italian_lang';

/**
 * UI Localization Resources for English and Simplified Chinese
 */
export const resources = {
  en: {
    translation: {
      app: {
        title: 'Zen Italian',
        subtitle: 'Italian for Chinese Speakers',
        tagline: 'Master Italian phonetics, essential vocabulary, and conversational reflexes.',
      },
      nav: {
        dashboard: 'Dashboard',
        flashcards: 'Flashcards',
        quiz: 'Verification Quiz',
        fallingWords: 'Falling Words',
        vocabulary: 'Vocabulary Packs',
        languageToggle: 'Language: English',
        currentLanguage: 'EN',
        switchLabel: 'Switch to 中文',
      },
      common: {
        start: 'Start',
        pause: 'Pause',
        resume: 'Resume',
        restart: 'Restart',
        next: 'Next',
        previous: 'Previous',
        finish: 'Finish',
        score: 'Score',
        accuracy: 'Accuracy',
        streak: 'Streak',
        reset: 'Reset',
        close: 'Close',
        back: 'Back',
        loading: 'Loading...',
        audioPlay: 'Play pronunciation',
        mastered: 'Mastered',
        needPractice: 'Need Practice',
        allPacks: 'All Packs',
        filterBy: 'Filter by',
        totalWords: 'Total Words',
        activePack: 'Active Pack',
        selectPack: 'Select Pack',
        studyNow: 'Study Now',
        preview: 'Preview',
      },
      dashboard: {
        welcomeTitle: 'Benvenuto a Zen Italian',
        welcomeSubtitle: 'Tailored specifically for Mandarin speakers to master Italian pronunciation, core vocabulary, and intuitive recall.',
        selectPackTitle: '1. Select Vocabulary Pack',
        selectPackSubtitle: 'Choose a foundational domain to focus your study session.',
        selectModeTitle: '2. Select Study Mode',
        selectModeSubtitle: 'Choose an interactive engine to drill and master vocabulary.',
        modes: {
          flashcards: {
            title: 'Flashcards',
            nativeTitle: '字卡',
            desc: '3D interactive cards with Pinyin pronunciation bridge, audio playback, and bilingual definitions.',
            action: 'Start Flashcards',
          },
          quiz: {
            title: 'Testing Suite',
            nativeTitle: '测试',
            desc: 'Speed drills and multiple-choice verification to solidify recall and track retention accuracy.',
            action: 'Start Quiz',
          },
          fallingWords: {
            title: 'Falling Words Arcade',
            nativeTitle: '下落单词',
            desc: 'Gamified reaction challenge: match falling Italian words before they touch the ground!',
            action: 'Play Arcade',
          },
        },
        quickStats: {
          totalCards: 'Available Vocabulary',
          corePacks: 'Curated Packs',
          phoneticEngine: 'Pinyin Bridge',
          phoneticEngineStatus: 'Active',
        },
      },
      flashcards: {
        title: 'Interactive Flashcards',
        subtitle: 'Review Italian vocabulary with Pinyin pronunciation approximations and bilingual definitions.',
        tapToFlip: 'Tap card or press Space to flip',
        showPinyin: 'Show Pinyin Hint',
        hidePinyin: 'Hide Pinyin Hint',
        shuffleDeck: 'Shuffle Deck',
        reviewMistakes: 'Review Mistakes Only',
        reviewAll: 'Review All Words',
        deckCompleted: 'Bravo! Deck completed!',
        deckStats: 'Mastered {{mastered}} of {{total}} cards',
        practiceAgain: 'Practice Again',
        pronunciationTip: 'Phonetic Tip',
        exampleUsage: 'Example Usage',
      },
      quiz: {
        title: 'Verification Quiz',
        subtitle: 'Test your recognition speed and memory retention with multiple-choice drills.',
        questionPrompt: 'Select the correct translation for:',
        listeningPrompt: 'Listen and select the spoken Italian word:',
        nextQuestion: 'Next Question',
        quizComplete: 'Quiz Complete!',
        finalScore: 'Your Score: {{score}} / {{total}} ({{percent}}%)',
        highAccuracy: 'Eccellente! Your memory retention is solid.',
        lowAccuracy: 'Keep practicing! Repetition builds intuition.',
        playAgain: 'Try Again',
      },
      fallingWords: {
        title: 'Falling Words (Caduta Parole)',
        subtitle: 'Arcade reaction drill: match the falling Italian words before they touch the ground!',
        startGame: 'Start Game',
        gameOver: 'Game Over',
        highScore: 'High Score: {{score}}',
        currentScore: 'Score: {{score}}',
        combo: '{{count}}x Combo!',
        lives: 'Lives',
        typeOrSelect: 'Type or click the matching meaning...',
        congratulations: 'Fantastic reflexes!',
        playAgain: 'Play Again',
      },
      packs: {
        greetingsCourtesy: 'Greetings & Courtesy',
        dailySurvival: 'Daily Survival',
        keyVerbs: 'Key Verbs',
        wordsCount: '{{count}} words',
      },
      pinyinGuide: {
        badgeLabel: 'Pinyin Guide',
        helpTitle: 'Why Pinyin for Italian?',
        helpDescription: 'Italian is phonetically transparent. Pinyin syllables help Chinese speakers quickly anchor foreign sounds like rolled Rs, pure vowels, and double consonants.',
      },
      srs: {
        again: 'Again',
        hard: 'Hard',
        good: 'Good',
        easy: 'Easy',
        dailyHubTitle: "Today's Spaced Repetition",
        dailyHubSubtitle: 'Anki-powered memory engine. Reviews due cards first, then introduces new words.',
        startDaily: 'Start Daily Session',
        dueBadge: 'Due',
        learnBadge: 'Learning',
        newBadge: 'New',
        allCaughtUp: "You're all caught up for today!",
        allCaughtUpDesc: 'Great work! No more cards due right now. Rest or increase your daily goal.',
        settingsTitle: 'Daily Study Goals',
        settingsSubtitle: 'Configure daily word intake and scheduling rules.',
        newCardsPerDay: 'New Words / Day',
        maxReviewsPerDay: 'Max Reviews / Day',
        dayCutoffHour: 'Day Rollover Hour',
        dayCutoffDesc: 'Hour of day when new daily quotas begin (default 4:00 AM).',
        presets: 'Presets',
        casual: 'Casual (5)',
        standard: 'Standard (15)',
        intensive: 'Intensive (25)',
        saveSettings: 'Save Goals',
        savedSuccess: 'Goals updated!',
        sessionCompleteToast: 'Daily session complete! Great work!',
        shortcutHint: 'Keys: 1=Again, 2=Hard, 3=Good, 4=Easy, Space=Flip',
        srsModeActive: 'Anki SRS Mode Active',
      },
    },
  },
  'zh-CN': {
    translation: {
      app: {
        title: 'Zen Italian (禅意意语)',
        subtitle: '专为中文母语者打造的意语学习引擎',
        tagline: '通过拼音发音桥梁、高频词卡与沉浸式街机练习，高效掌握地道意大利语。',
      },
      nav: {
        dashboard: '仪表盘',
        flashcards: '单词卡片',
        quiz: '闯关测验',
        fallingWords: '雨下词汇',
        vocabulary: '词汇词库',
        languageToggle: '界面语言: 简体中文',
        currentLanguage: '中',
        switchLabel: '切换为 English',
      },
      common: {
        start: '开始',
        pause: '暂停',
        resume: '继续',
        restart: '重新开始',
        next: '下一个',
        previous: '上一个',
        finish: '完成',
        score: '得分',
        accuracy: '正确率',
        streak: '连胜',
        reset: '重置',
        close: '关闭',
        back: '返回',
        loading: '加载中...',
        audioPlay: '朗读意语发音',
        mastered: '已掌握',
        needPractice: '需巩固',
        allPacks: '全部词包',
        filterBy: '分类筛选',
        totalWords: '词汇总计',
        activePack: '当前词包',
        selectPack: '选择词包',
        studyNow: '立即学习',
        preview: '预览',
      },
      dashboard: {
        welcomeTitle: '欢迎使用 Zen Italian (禅意意语)',
        welcomeSubtitle: '专为中文母语者量身定制，通过汉语音节与声调辅助注音，快速攻克意大利语发音、核心词汇与口语反应。',
        selectPackTitle: '1. 选择学习词包',
        selectPackSubtitle: '挑选你希望在本次学习中专注训练的词汇分类。',
        selectModeTitle: '2. 选择学习模式',
        selectModeSubtitle: '挑选适合当前节奏的互动学习引擎。',
        modes: {
          flashcards: {
            title: '单词闪卡',
            nativeTitle: '字卡',
            desc: '3D 翻转卡片，配备中文拼音发音桥梁、语音朗读与汉英双语释义。',
            action: '开始闪卡学习',
          },
          quiz: {
            title: '闯关测验',
            nativeTitle: '测试',
            desc: '快速辨析与多选题实战，巩固词汇瞬时记忆并统计准确率。',
            action: '开始测验',
          },
          fallingWords: {
            title: '雨下词汇街机',
            nativeTitle: '下落单词',
            desc: '敏捷反应挑战：在意大利语单词掉落到底部之前，快速选出或输入匹配含义！',
            action: '进入街机挑战',
          },
        },
        quickStats: {
          totalCards: '精选核心词汇',
          corePacks: '基础主题包',
          phoneticEngine: '拼音发音桥梁',
          phoneticEngineStatus: '已就绪',
        },
      },
      flashcards: {
        title: '互动式发音闪卡',
        subtitle: '结合汉语音节拼音辅助注音与双语释义，高效攻克意大利语词汇记忆。',
        tapToFlip: '点击卡片或按空格键翻转',
        showPinyin: '显示拼音助读',
        hidePinyin: '隐藏拼音助读',
        shuffleDeck: '随机乱序',
        reviewMistakes: '仅复习错题',
        reviewAll: '复习全部词汇',
        deckCompleted: '太棒了！本组词卡已全部学完！',
        deckStats: '已掌握 {{total}} 张词卡中的 {{mastered}} 张',
        practiceAgain: '再练一次',
        pronunciationTip: '发音技巧提示',
        exampleUsage: '地道例句',
      },
      quiz: {
        title: '词义闯关测验',
        subtitle: '通过多选题与听力听辨，强化反应敏锐度与词义辨析能力。',
        questionPrompt: '请选出对应正确释义：',
        listeningPrompt: '听录音，选出你听到的意语单词：',
        nextQuestion: '下一题',
        quizComplete: '测验完成！',
        finalScore: '最终得分: {{score}} / {{total}} ({{percent}}%)',
        highAccuracy: '太出色了 (Eccellente)！你的词汇记忆非常扎实。',
        lowAccuracy: '再接再厉！多加重复即可形成肌肉记忆。',
        playAgain: '再试一次',
      },
      fallingWords: {
        title: '雨下词汇街机挑战 (Caduta Parole)',
        subtitle: '敏捷反应挑战：在意大利语单词掉落到底部之前，快速选出或输入对应的中文含义！',
        startGame: '开始挑战',
        gameOver: '挑战结束',
        highScore: '最高纪录: {{score}}',
        currentScore: '当前得分: {{score}}',
        combo: '{{count}} 连击!',
        lives: '生命值',
        typeOrSelect: '输入或点击匹配的中文含义...',
        congratulations: '反应太迅捷了！',
        playAgain: '再玩一次',
      },
      packs: {
        greetingsCourtesy: '问候与礼貌表达',
        dailySurvival: '日常生活与生存应急',
        keyVerbs: '核心高频动词',
        wordsCount: '{{count}} 个词汇',
      },
      pinyinGuide: {
        badgeLabel: '拼音发音导引',
        helpTitle: '为什么用拼音辅助学意大利语？',
        helpDescription: '意大利语发音极其规则（见词能读）。我们运用汉语拼音的声韵调，为中文母语者搭建发音桥梁，快速掌握大舌音、纯元音与双辅音停顿。',
      },
      srs: {
        again: '重来',
        hard: '困难',
        good: '良好',
        easy: '简单',
        dailyHubTitle: '今日间隔重复学习 (Anki 模式)',
        dailyHubSubtitle: '基于 SuperMemo 记忆曲线。先复习到期卡片，再掌握今日新词配额。',
        startDaily: '开始今日复习',
        dueBadge: '待复习',
        learnBadge: '学习中',
        newBadge: '新词',
        allCaughtUp: '今日计划已全部完成！',
        allCaughtUpDesc: '干得漂亮！当前没有待复习的卡片。可稍作休息或上调每日目标。',
        settingsTitle: '每日学习目标设置',
        settingsSubtitle: '个性化设定每日新词配额与复习上限。',
        newCardsPerDay: '每日新学单词数',
        maxReviewsPerDay: '每日复习上限',
        dayCutoffHour: '跨日计算时间点',
        dayCutoffDesc: '判定新一天学习配额的时间点（默认凌晨 4:00，夜猫子无忧）。',
        presets: '快捷预设',
        casual: '轻松休闲 (5词)',
        standard: '稳步进阶 (15词)',
        intensive: '高阶攻坚 (25词)',
        saveSettings: '保存设置',
        savedSuccess: '学习目标已更新！',
        sessionCompleteToast: '太棒了！今日复习任务已圆满完成！',
        shortcutHint: '快捷键: 1=重来, 2=困难, 3=良好, 4=简单, 空格=翻转',
        srsModeActive: 'Anki 间隔重复模式',
      },
    },
  },
};

/**
 * Determine initial language preference
 */
export function getInitialLanguage(): SupportedLanguage {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_LANG_KEY);
    if (saved === 'en' || saved === 'zh-CN') {
      return saved as SupportedLanguage;
    }
    const browserLang = window.navigator.language;
    if (browserLang && browserLang.startsWith('zh')) {
      return 'zh-CN';
    }
  }
  return 'zh-CN'; // Default to Simplified Chinese
}

let activeLang: SupportedLanguage = getInitialLanguage();
const languageChangeListeners = new Set<(lang: SupportedLanguage) => void>();

/**
 * Translation lookup function supporting dot-notation and interpolation
 */
export function t(key: string, params?: Record<string, string | number>, langOverride?: SupportedLanguage): string {
  const lang = langOverride || activeLang;
  const keys = key.split('.');
  
  let current: any = resources[lang]?.translation;
  for (const k of keys) {
    if (current && current[k] !== undefined) {
      current = current[k];
    } else {
      current = undefined;
      break;
    }
  }

  // Fallback to English if missing in target
  if (current === undefined && lang !== 'en') {
    let fallback: any = resources.en.translation;
    for (const k of keys) {
      if (fallback && fallback[k] !== undefined) {
        fallback = fallback[k];
      } else {
        fallback = undefined;
        break;
      }
    }
    current = fallback;
  }

  if (current === undefined) {
    return key;
  }

  if (typeof current === 'string' && params) {
    return current.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      return params[varName] !== undefined ? String(params[varName]) : `{{${varName}}}`;
    });
  }

  return typeof current === 'string' ? current : key;
}

/**
 * Dynamic language switcher helper
 */
export function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  activeLang = lang;
  if (typeof window !== 'undefined') {
    if (window.localStorage) {
      window.localStorage.setItem(STORAGE_LANG_KEY, lang);
    }
    if (document.documentElement) {
      document.documentElement.lang = lang;
    }
  }
  languageChangeListeners.forEach((fn) => fn(lang));
  return Promise.resolve();
}

/**
 * Quick toggle between English and Simplified Chinese
 */
export function toggleAppLanguage(): Promise<void> {
  const nextLang: SupportedLanguage = activeLang === 'zh-CN' ? 'en' : 'zh-CN';
  return setAppLanguage(nextLang);
}

/**
 * Get current active language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return activeLang;
}

/**
 * React Hook for reactive translations inside functional components
 */
export function useTranslation() {
  const [lang, setLang] = useState<SupportedLanguage>(activeLang);

  useEffect(() => {
    const handler = (newLang: SupportedLanguage) => {
      setLang(newLang);
    };
    languageChangeListeners.add(handler);
    return () => {
      languageChangeListeners.delete(handler);
    };
  }, []);

  const translate = (key: string, params?: Record<string, string | number>): string => {
    return t(key, params, lang);
  };

  return {
    t: translate,
    lang,
    currentLang: lang,
    setLanguage: setAppLanguage,
    toggleLanguage: toggleAppLanguage,
  };
}

export default {
  t,
  setAppLanguage,
  toggleAppLanguage,
  getCurrentLanguage,
  useTranslation,
  resources,
};

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
        title: 'ItaLink',
        subtitle: 'Italian Vocabulary & Spaced Repetition',
        tagline: 'Master Italian phonetics, essential vocabulary, and conversational reflexes.',
      },
      nav: {
        dashboard: 'Dashboard',
        flashcards: 'Flashcards',
        fallingWords: 'Falling Words',
        wordFill: 'Word Forge',
        quiz: 'Word Forge',
        settings: 'Settings',
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
        welcomeTitle: 'Benvenuto su ItaLink',
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
          fallingWords: {
            title: 'Falling Words Arcade',
            nativeTitle: '下落单词',
            desc: 'Gamified reaction challenge: match falling Italian words before they touch the ground!',
            action: 'Play Arcade',
          },
          wordFill: {
            title: 'Word Forge',
            nativeTitle: 'Arcade',
            desc: 'Contextual fill-in-the-blank challenge: complete missing syllables, verbs, and sentence blanks.',
            action: 'Coming Soon',
          },
          quiz: {
            title: 'Word Forge',
            nativeTitle: 'Arcade',
            desc: 'Contextual fill-in-the-blank challenge: complete missing syllables, verbs, and sentence blanks.',
            action: 'Coming Soon',
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
      wordFill: {
        title: 'Word Forge',
        nativeTitle: 'Word Forge',
        subtitle: 'Fill-in-the-blank vocabulary challenges and contextual sentence drills.',
        underConstruction: 'Work In Progress',
        statusBadge: 'Under Construction (In Sviluppo)',
        catMemeTop: 'CANNOT WRITE THE CODE',
        catMemeBottom: 'BECAUSE CAT FELL ASLEEP ON KEYBOARD 🐾',
        message: 'This game mode is currently under construction and will be implemented in a future update! Check back soon for exciting fill-in-the-blank vocabulary drills.',
        backToDashboard: 'Back to Dashboard',
        playFallingWords: 'Play Falling Words Instead',
        practiceFlashcards: 'Practice Flashcards',
      },
      quiz: {
        title: 'Word Forge',
        subtitle: 'Under construction. Coming soon!',
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
        typeOrSelect: 'Select the matching meaning...',
        congratulations: 'Fantastic reflexes!',
        playAgain: 'Play Again',
        selectPack: 'Challenge Word Pool',
        allPacks: 'All Packs (Mixed Pool)',
        howToPlay: 'Italian words fall from the sky. Click the matching translation or press 1 - 4 on your keyboard before the card hits the ground!',
        keyboardHint: 'Shortcuts: 1 - 4 select, Space / Esc pauses',
        pausedTitle: 'Game Paused',
        resume: 'Resume Game',
        quit: 'Exit to Menu',
        statsSummary: 'Session Recap',
        wordsCleared: 'Words Cleared',
        maxCombo: 'Max Streak',
        finalScore: 'Final Score',
        newHighScore: '🎉 New High Score!',
        missedWords: 'Words to Review',
        noMissedWords: 'Flawless run! 100% accuracy!',
        soundEffects: 'Sound FX',
        autoPronounce: 'Auto-Pronounce',
        showPinyin: 'Pinyin Hint',
        speedRamp: 'Speed',
        missedAlert: 'Floor Hit!',
        wrongAlert: 'Wrong Option!',
        scoreBonus: '+{{points}} pts',
        difficultyLabel: 'Difficulty & Pacing',
        difficultyRelaxed: 'Relaxed (Beginner)',
        difficultyRelaxedDesc: '10s fall · Gentle pace, plenty of time to listen & read',
        difficultyStandard: 'Standard',
        difficultyStandardDesc: '7.5s fall · Balanced tempo',
        difficultyFast: 'Fast (Arcade)',
        difficultyFastDesc: '5.5s fall · High-speed reflex test',
        poolScopeLabel: 'Word Pool Source',
        poolScopeStudied: 'Studied Words Only (SRS)',
        poolScopeStudiedDesc: 'Only reinforces words you have already learned and reviewed in Spaced Repetition',
        poolScopeAll: 'All Vocabulary (Free Practice)',
        poolScopeAllDesc: 'Includes unstudied and new words for open arcade practice',
        noStudiedWordsInPack: 'No studied words in this pack yet',
        noStudiedWordsInPackDesc: 'You haven\'t reviewed any words from "{{pack}}" in the SRS Hub yet. Switch to All Vocabulary to practice freely, or pick a pack with studied words.',
        noStudiedWordsTotal: 'No studied words found in SRS yet',
        noStudiedWordsTotalDesc: 'You haven\'t reviewed any flashcards in the Spaced Repetition Hub yet. Study a few words in Flashcards first, or switch to All Vocabulary to practice anyway!',
        practiceAllWordsAnyway: 'Practice All Vocabulary Anyway',
        goToFlashcards: 'Go to Spaced Repetition',
        studiedBadge: 'Studied',
        allWordsBadge: 'All Words',
        studiedCount: '{{count}} studied',
        studiedRatio: '{{studied}} / {{total}} studied',
      },
      packs: {
        greetingsCourtesy: 'Greetings & Courtesy',
        foodDrink: 'Food, Coffee & Trattoria',
        dailySurvival: 'Daily Survival',
        keyVerbs: 'Key Verbs',
        italianSlang: 'Street Italian & Slang (18+)',
        slangBadge: '18+ Slang',
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
        dailyHubSubtitle: 'Smart spaced repetition engine. Reviews due cards first, then introduces new words.',
        startDaily: 'Start Daily Session',
        dueBadge: 'Due',
        learnBadge: 'Learning',
        newBadge: 'New',
        allCaughtUp: "You're all caught up for today!",
        allCaughtUpDesc: 'Great work! No more cards due right now. Rest or increase your daily goal.',
        dailyGoal: 'Daily Goal',
        editGoal: 'Edit',
        customGoal: 'Custom Goal',
        wordsUnit: 'words',
        settingsTitle: 'Daily Study Goals',
        settingsSubtitle: 'Configure daily word intake and scheduling rules.',
        newCardsPerDay: 'New Words / Day',
        maxReviewsPerDay: 'Max Reviews / Day',
        dayCutoffHour: 'Day Rollover Hour',
        dayCutoffDesc: 'Hour of day when new daily quotas begin (default 4:00 AM).',
        presets: 'Presets',
        casual: 'Casual (5 words · ~5 min)',
        standard: 'Standard (15 words · ~15 min)',
        intensive: 'Intensive (25 words · ~25 min)',
        saveSettings: 'Save Goals',
        savedSuccess: 'Goals updated!',
        sessionCompleteToast: 'Daily session complete! Great work!',
        shortcutHint: 'Keys: 1=Again, 2=Hard, 3=Good, 4=Easy, Space=Flip',
        srsModeActive: 'Spaced Repetition Active',
        queueTooltip: 'In Spaced Repetition, new words require 2 practice steps before graduating to tomorrow.',
        studySource: 'Study Source Packs',
        studySourceDesc: 'Choose which packs feed into your global daily study goal.',
        allPacksRandom: 'All Packs (Random Mix)',
        randomizeOrder: 'Randomize Intake Order',
        randomizeOrderDesc: 'Shuffle new words randomly across selected packs instead of alphabetical order.',
        packFilterTitle: 'Study Source',
        mixAllPacksHint: 'Words will be drawn at random across all vocabulary packs.',
        singlePackHint: 'Words will be drawn exclusively from {{pack}}.',
        multiPackHint: 'Words will be drawn at random from {{count}} selected packs.',
        includeInDaily: 'Include in Daily SRS',
      },
      settings: {
        title: 'Settings & Data',
        subtitle: 'Manage your study quotas, SRS spaced repetition intervals, audio preferences, and study records.',
        backToDashboard: 'Back to Dashboard',
        profileSection: 'Active User Profile',
        studySection: 'Spaced Repetition (SRS) Engine Goals',
        statsSection: 'Learning Progress & SRS Records',
        appearanceSection: 'Preferences & Audio',
        dangerZone: 'Danger Zone',
        dangerZoneDesc: 'Irreversible data actions. You can reset all studied vocabulary progress back to 0.',
        resetProgressBtn: 'Reset All Study Progress to 0',
        resetModalTitle: '⚠️ Confirm Permanent Progress Reset',
        resetModalWarning1: 'This will permanently wipe all SRS intervals, review history, card mastery levels, and daily streaks.',
        resetModalWarning2: 'All {{total}} vocabulary words will be reset to "Unseen" (0 progress). Your user account will stay logged in.',
        resetModalTypeConfirm: 'To confirm this irreversible reset, type RESET below:',
        resetModalPlaceholder: 'Type RESET here...',
        resetModalCancel: 'Cancel, Keep My Progress',
        resetModalConfirmBtn: 'I Understand, Erase All Progress',
        resetSuccessToast: '✓ All study progress has been reset to 0! All words are now Unseen.',
        statsTotalWords: 'Total Library Words',
        statsMastered: 'Mastered Words',
        statsLearning: 'In Learning Pool',
        statsUnseen: 'Unseen (New)',
        statsStreak: 'Day Streak',
        statsTotalReviews: 'Total Reviews',
        languageLabel: 'Interface Language',
        themeLabel: 'Display Theme',
        sfxLabel: 'Sound Effects (SFX)',
        themeLight: 'Light Mode',
        themeDark: 'Dark Mode',
        sfxOn: 'Enabled',
        sfxOff: 'Muted',
        syncSection: 'Cloud Synchronization & Backup',
        syncSubtitle: 'Automatic multi-device synchronization via Supabase BaaS.',
        syncNow: 'Sync Now',
        syncSuccess: 'Synced successfully with cloud!',
        advancedSync: 'Advanced & Backup',
        guestSyncWarning: 'Guest accounts save data locally in browser storage. Sign in to automatically sync to cloud across all devices.',
      },
      auth: {
        brandTagline: 'Italiano · Spaced Repetition',
        cloudConnected: 'Cloud Sync Connected · Supabase',
        localMode: 'Local Offline Storage Mode',
        welcomeBack: 'Welcome Back',
        createAccount: 'Create Account',
        signInSubtitle: 'Sign in to access your saved progress and multi-device cloud backups.',
        signUpSubtitle: 'Sign up to auto-sync your SRS intervals, review streaks, and mastery to the cloud.',
        tabSignIn: 'Sign In',
        tabSignUp: 'Sign Up',
        usernameLabel: 'Display Name / Username',
        usernamePlaceholder: 'e.g. Marco',
        emailLabel: 'Email Address',
        emailPlaceholder: 'name@example.com',
        passwordLabel: 'Password (min. 6 characters)',
        passwordPlaceholder: '••••••••',
        confirmPasswordLabel: 'Confirm Password',
        signInBtn: 'Sign In to Cloud Account',
        signingInBtn: 'Signing in...',
        signUpBtn: 'Create Account & Sync',
        signingUpBtn: 'Creating account...',
        orDivider: 'Or Experience Instantly',
        guestBtnTitle: 'Continue as Guest',
        guestBtnSubtitle: 'Local only · No cloud save',
        guestNoticeTitle: 'Guest Mode Notice',
        guestNoticeSubtitle: 'Progress will NOT be saved to cloud',
        guestNoticeIntro: 'When entering as a guest:',
        guestNoticeP1: 'All flashcard reviews, SRS intervals, and streak days are saved only on this browser.',
        guestNoticeP2: 'Clearing browser cache, using incognito mode, or switching devices will permanently erase all data.',
        guestNoticeP3: 'To ensure your study journey is safe, we strongly recommend signing up for free.',
        guestNoticeBack: 'Go Back to Sign In',
        guestNoticeConfirm: 'I Understand, Continue as Guest',
        guestNoticeLoading: 'Entering...',
        passwordMismatch: 'Passwords do not match. Please re-enter.',
        passwordMinLength: 'Password must be at least 6 characters.',
        emailConfirmSent: 'Confirmation email sent to {{email}}. Please check your inbox and confirm your address before signing in.',
        guestFailed: 'Guest access failed. Please try again.',
        authFailedFallback: 'Authentication failed. Please check your credentials.',
        footerDesc: 'Modern Italian Vocabulary & Spaced Repetition',
      },
    },
  },
  'zh-CN': {
    translation: {
      app: {
        title: 'ItaLink (意大利语闪卡)',
        subtitle: '现代智能意大利语词汇学习引擎',
        tagline: '通过双语释义、原声发音与间隔重复闪卡算法，高效攻克地道意大利语。',
      },
      nav: {
        dashboard: '仪表盘',
        flashcards: '单词卡片',
        fallingWords: '雨下词汇',
        wordFill: '词境工坊',
        quiz: '词境工坊',
        settings: '系统设置',
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
        welcomeTitle: '欢迎使用 ItaLink · 意语闪卡',
        welcomeSubtitle: '专为多语言学习者打造，结合地道原声发音、双语释义与科学记忆曲线，快速建立口语词汇反应。',
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
          fallingWords: {
            title: '雨下词汇街机',
            nativeTitle: '下落单词',
            desc: '敏捷反应挑战：在意大利语单词掉落到底部之前，快速选出或输入匹配含义！',
            action: '进入街机挑战',
          },
          wordFill: {
            title: '词境工坊 (Word Forge)',
            nativeTitle: '工坊',
            desc: '沉浸式语境填词挑战：补全缺失音节与动词变位，在真实语境中全方位巩固拼写与记忆。',
            action: '即将推出',
          },
          quiz: {
            title: '词境工坊 (Word Forge)',
            nativeTitle: '工坊',
            desc: '沉浸式语境填词挑战：补全缺失音节与动词变位，在真实语境中全方位巩固拼写与记忆。',
            action: '即将推出',
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
      wordFill: {
        title: '词境工坊 (Word Forge)',
        nativeTitle: '词境工坊',
        subtitle: '沉浸式语境填空与意大利语缺失音节拼写挑战。',
        underConstruction: '功能施工中',
        statusBadge: '施工开发中 (In Sviluppo)',
        catMemeTop: '无法提交代码',
        catMemeBottom: '因为猫咪在键盘上睡着了 🐾',
        message: '【词境工坊 (Word Forge)】功能正在紧锣密鼓地筹备中，将在后续更新中正式推出！敬请期待。',
        backToDashboard: '返回仪表盘',
        playFallingWords: '体验雨下词汇街机',
        practiceFlashcards: '练习智能闪卡',
      },
      quiz: {
        title: '词境工坊 (Word Forge)',
        subtitle: '功能正在施工中，敬请期待！',
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
        subtitle: '敏捷反应挑战：在意大利语单词掉落到底部之前，快速选出对应的中文含义！',
        startGame: '开始挑战',
        gameOver: '挑战结束',
        highScore: '最高纪录: {{score}}',
        currentScore: '当前得分: {{score}}',
        combo: '{{count}} 连击!',
        lives: '生命值',
        typeOrSelect: '选择匹配的正确释义...',
        congratulations: '反应太迅捷了！',
        playAgain: '再玩一次',
        selectPack: '挑战词库选择',
        allPacks: '全部词汇包 (混合挑战)',
        howToPlay: '意大利语单词自上方缓缓坠落。在触底前快速点击正确释义或敲击数字键 1 - 4！',
        keyboardHint: '快捷键: 1 - 4 选择, 空格 / Esc 暂停',
        pausedTitle: '挑战暂停中',
        resume: '继续挑战',
        quit: '返回菜单',
        statsSummary: '战绩总结',
        wordsCleared: '成功消除',
        maxCombo: '最高连击',
        finalScore: '最终得分',
        newHighScore: '🎉 刷新历史最高纪录！',
        missedWords: '失误词汇巩固',
        noMissedWords: '完美通关！零失误！',
        soundEffects: '游戏音效',
        autoPronounce: '自动发音',
        showPinyin: '拼音提示',
        speedRamp: '掉落速度',
        missedAlert: '触底失误!',
        wrongAlert: '选择错误!',
        scoreBonus: '+{{points}} 分',
        difficultyLabel: '掉落节奏与难度',
        difficultyRelaxed: '轻松漫步 (初学推荐)',
        difficultyRelaxedDesc: '10秒下落 · 节奏从容，留足时间听发音与辨析中文释义',
        difficultyStandard: '标准节奏',
        difficultyStandardDesc: '7.5秒下落 · 适度挑战',
        difficultyFast: '极速街机',
        difficultyFastDesc: '5.5秒下落 · 挑战极限反应与肌肉记忆',
        poolScopeLabel: '挑战词库来源',
        poolScopeStudied: '仅限已学词汇 (SRS 复习)',
        poolScopeStudiedDesc: '仅抽取已在智能复习 (SRS) 中学习或复习过的单词，温故知新',
        poolScopeAll: '全部词库 (自由练习)',
        poolScopeAllDesc: '练习词包内所有词汇，包含未学新词，适合自由挑战',
        noStudiedWordsInPack: '该分类下暂无已学词汇',
        noStudiedWordsInPackDesc: '你尚未在智能复习中学习「{{pack}}」的卡片。可切换其他词包、开启全部词库练习，或先前往闪卡中心学习。',
        noStudiedWordsTotal: 'SRS 记忆库中暂无已学词汇',
        noStudiedWordsTotalDesc: '你尚未开始每日智能复习。建议先在闪卡中心学习新词，或者直接切换为“全部词库”进行自由街机练习！',
        practiceAllWordsAnyway: '开启全部词库自由练习',
        goToFlashcards: '前往智能复习中心',
        studiedBadge: '已学词库',
        allWordsBadge: '全部词库',
        studiedCount: '已学 {{count}} 词',
        studiedRatio: '已学 {{studied}} / {{total}} 词',
      },
      packs: {
        greetingsCourtesy: '问候与礼貌表达',
        foodDrink: '美食、咖啡与餐厅',
        dailySurvival: '日常生活与生存应急',
        keyVerbs: '核心高频动词',
        italianSlang: '地道街头俚语与俗语 (18+)',
        slangBadge: '18+ 俚语',
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
        dailyHubTitle: '今日智能复习 (间隔重复)',
        dailyHubSubtitle: '基于记忆遗忘曲线。先复习到期卡片，再掌握今日新词配额。',
        startDaily: '开始今日复习',
        dueBadge: '待复习',
        learnBadge: '学习中',
        newBadge: '新词',
        allCaughtUp: '今日计划已全部完成！',
        allCaughtUpDesc: '干得漂亮！当前没有待复习的卡片。可稍作休息或上调每日目标。',
        dailyGoal: '每日目标',
        editGoal: '修改',
        customGoal: '自定义目标',
        wordsUnit: '词',
        settingsTitle: '每日学习目标设置',
        settingsSubtitle: '个性化设定每日新词配额与复习上限。',
        newCardsPerDay: '每日新学单词数',
        maxReviewsPerDay: '每日复习上限',
        dayCutoffHour: '跨日计算时间点',
        dayCutoffDesc: '判定新一天学习配额的时间点（默认凌晨 4:00，夜猫子无忧）。',
        presets: '快捷预设',
        casual: '轻松日常 (5词 · 约5分钟)',
        standard: '稳步进阶 (15词 · 约15分钟)',
        intensive: '高阶攻坚 (25词 · 约25分钟)',
        saveSettings: '保存设置',
        savedSuccess: '学习目标已更新！',
        sessionCompleteToast: '太棒了！今日复习任务已圆满完成！',
        shortcutHint: '快捷键: 1=重来, 2=困难, 3=良好, 4=简单, 空格=翻转',
        srsModeActive: '智能复习模式已激活',
        queueTooltip: '在间隔重复算法中，新单词需完成 2 次成功记忆巩固后方可毕业移至明日复习。',
        studySource: '每日学习词库来源',
        studySourceDesc: '选择纳入全局每日学习目标的词库。',
        allPacksRandom: '全部词库 (随机混合)',
        randomizeOrder: '随机打乱每日新词',
        randomizeOrderDesc: '打乱所选词库的新词顺序，避免死板按序学习。',
        packFilterTitle: '词库来源',
        mixAllPacksHint: '新词将从所有词汇包中随机混合抽取。',
        singlePackHint: '新词将仅从「{{pack}}」词库中抽取。',
        multiPackHint: '新词将从已勾选的 {{count}} 个词库中随机混合抽取。',
        includeInDaily: '纳入每日智能复习',
      },
      settings: {
        title: '偏好与数据设置',
        subtitle: '管理每日学习配额、SRS 记忆曲线、音效与全量学习数据。',
        backToDashboard: '返回仪表盘',
        profileSection: '当前登录账户',
        studySection: '每日学习与智能记忆 (SRS) 配额',
        statsSection: '词汇掌握度与记忆数据概览',
        appearanceSection: '界面外观与音效',
        dangerZone: '危险操作区域',
        dangerZoneDesc: '不可逆的数据清除操作。可将所有已学单词进度完全归零。',
        resetProgressBtn: '重置所有学习进度为 0',
        resetModalTitle: '⚠️ 确认永久重置所有学习进度',
        resetModalWarning1: '此操作将永久清空所有词汇的 SRS 复习间隔、熟练度等级、打卡连胜及记忆历史。',
        resetModalWarning2: '全库 {{total}} 个单词将重新恢复为“未学习”（进度归零）。你的账户登录状态仍将保留。',
        resetModalTypeConfirm: '若确认执行此不可逆操作，请在下方输入 RESET：',
        resetModalPlaceholder: '在此输入 RESET 确认...',
        resetModalCancel: '取消，保留我的进度',
        resetModalConfirmBtn: '我已知晓，清除所有进度并归零',
        resetSuccessToast: '✓ 已成功将所有学习进度重置为 0！所有词汇已恢复为未学习状态。',
        statsTotalWords: '词库总词数',
        statsMastered: '已完全掌握',
        statsLearning: '巩固记忆中',
        statsUnseen: '未学习 (新词)',
        statsStreak: '连续打卡天数',
        statsTotalReviews: '累计复习次数',
        languageLabel: '系统语言',
        themeLabel: '界面主题',
        sfxLabel: '游戏与反馈音效',
        themeLight: '明亮模式',
        themeDark: '深色模式',
        sfxOn: '已开启',
        sfxOff: '已静音',
        syncSection: '云端同步与数据备份',
        syncSubtitle: '通过 Supabase BaaS 实现多设备自动实时同步。',
        syncNow: '立即同步',
        syncSuccess: '已成功同步最新学习数据至云端！',
        advancedSync: '高级与导入导出',
        guestSyncWarning: '访客账户数据仅保存在当前浏览器本地。注册或登录后即可跨设备自动同步到云端。',
      },
      auth: {
        brandTagline: '智能意语学习',
        cloudConnected: '云端同步已连接 · Supabase',
        localMode: '本地离线存储模式',
        welcomeBack: '欢迎回来 · 登录账号',
        createAccount: '创建云端学习档案',
        signInSubtitle: '登录账号以即时同步您的多端学习记录与复习排程。',
        signUpSubtitle: '注册账号以自动将学习进度、艾宾浩斯复习曲线与打卡数据漫游至云端。',
        tabSignIn: '账号登录',
        tabSignUp: '新用户注册',
        usernameLabel: '用户昵称',
        usernamePlaceholder: '例如：Marco',
        emailLabel: '电子邮箱',
        emailPlaceholder: 'name@example.com',
        passwordLabel: '密码 (最少 6 位)',
        passwordPlaceholder: '••••••••',
        confirmPasswordLabel: '确认密码',
        signInBtn: '登录云端账号',
        signingInBtn: '登录中...',
        signUpBtn: '注册并开启云端同步',
        signingUpBtn: '创建中...',
        orDivider: '免注册体验',
        guestBtnTitle: '以访客身份继续',
        guestBtnSubtitle: '仅存本地 · 无云端同步',
        guestNoticeTitle: '访客模式警告',
        guestNoticeSubtitle: '学习进度将 不会 保存到云端',
        guestNoticeIntro: '以访客身份进入系统时：',
        guestNoticeP1: '所有词汇熟练度、艾宾浩斯复习计划与连续打卡记录仅保存在此浏览器中。',
        guestNoticeP2: '清理浏览器缓存、在无痕模式下浏览或更换设备，数据将永久丢失且无法恢复。',
        guestNoticeP3: '若需长期学习，强烈建议注册免费账号开启自动云端保存。',
        guestNoticeBack: '返回登录 / 注册',
        guestNoticeConfirm: '我已知晓，以访客继续',
        guestNoticeLoading: '进入中...',
        passwordMismatch: '两次输入的密码不一致，请重新输入。',
        passwordMinLength: '密码长度不能少于 6 位。',
        emailConfirmSent: '注册确认邮件已发送至 {{email}}。请查收邮件完成验证后登录。',
        guestFailed: '访客登录失败，请重试。',
        authFailedFallback: '身份验证失败，请检查账号和密码。',
        footerDesc: '现代智能意语闪卡与艾宾浩斯复习系统',
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

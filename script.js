const wordListInput = document.querySelector("#word-list");
const languageSelect = document.querySelector("#language-select");
const setupTitle = document.querySelector("#setup-title");
const subtitle = document.querySelector("#subtitle");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const submitButton = document.querySelector("#submit-button");
const reviewButton = document.querySelector("#review-button");
const collectRecentButton = document.querySelector("#collect-recent-button");
const startRecentButton = document.querySelector("#start-recent-button");
const startSelectedVocabButton = document.querySelector("#start-selected-vocab-button");
const answerInput = document.querySelector("#answer-input");
const parseMessage = document.querySelector("#parse-message");
const progress = document.querySelector("#progress");
const currentWord = document.querySelector("#current-word");
const feedback = document.querySelector("#feedback");
const answerLabel = document.querySelector("#answer-label");
const playAudioButton = document.querySelector("#play-audio-button");
const meaningActions = document.querySelector("#meaning-actions");
const heardMeaningButton = document.querySelector("#heard-meaning-button");
const missedMeaningButton = document.querySelector("#missed-meaning-button");
const resultPanel = document.querySelector("#result-panel");
const summary = document.querySelector("#summary");
const mistakeList = document.querySelector("#mistake-list");
const recentFolderCount = document.querySelector("#recent-folder-count");
const recentFolderList = document.querySelector("#recent-folder-list");
const vocabularyCount = document.querySelector("#vocabulary-count");
const vocabularyList = document.querySelector("#vocabulary-list");
const reviewModal = document.querySelector("#review-modal");
const closeReviewButton = document.querySelector("#close-review-button");
const continueReviewButton = document.querySelector("#continue-review-button");
const reviewCount = document.querySelector("#review-count");
const reviewList = document.querySelector("#review-list");

const RECENT_MISTAKE_THRESHOLD = 3;
const LANGUAGE_CONFIGS = {
  ja: {
    appTitle: "日语单词读音测验",
    subtitle: "每行输入一个词：汉字,平假名读音",
    sampleWords: `経験,けいけん
姿勢,しせい
農園,のうえん
収穫,しゅうかく
巣箱,すばこ
鼠,ねずみ
被害,ひがい
設置,せっち
共同,きょうどう
成功,せいこう`,
    emptyListMessage: "请至少输入一行有效词条，例如：経験,けいけん",
    writtenAnswerLabel: "输入平假名读音",
    listeningQuestionText: "听音频后输入读音",
    listeningAnswerLabel: "输入听到的平假名读音",
    meaningQuestionText: "听音频后判断是否听出单词",
    speechLang: "ja-JP",
    speechRate: 0.85,
    normalizeAnswer: normalizeJapaneseAnswer,
  },
  en: {
    appTitle: "英语单词听写测验",
    subtitle: "每行输入一个词：英文单词,正确拼写",
    sampleWords: `experience,experience
posture,posture
farm,farm
harvest,harvest
damage,damage
install,install
cooperate,cooperate
success,success
improve,improve
remember,remember`,
    emptyListMessage: "请至少输入一行有效词条，例如：experience,experience",
    writtenAnswerLabel: "输入英文单词",
    listeningQuestionText: "听音频后输入单词",
    listeningAnswerLabel: "输入听到的英文单词",
    meaningQuestionText: "听音频后判断是否听出单词",
    speechLang: "en-US",
    speechRate: 0.9,
    normalizeAnswer: normalizeEnglishAnswer,
  },
};

let allWords = [];
let currentRoundWords = [];
let nextRoundWords = [];
let currentQuestion = null;
let totalMistakes = 0;
let mistakeCounts = new Map();
let currentLanguage = languageSelect.value;
let recentMistakeWords = loadRecentMistakeWords();
let vocabularyWords = loadVocabularyWords();
let isComposingText = false;
let quizMode = "kanji";

languageSelect.addEventListener("change", changeLanguage);
startButton.addEventListener("click", startQuiz);
restartButton.addEventListener("click", startQuiz);
submitButton.addEventListener("click", submitAnswer);
reviewButton.addEventListener("click", openReviewModal);
collectRecentButton.addEventListener("click", collectHighMistakeWords);
startRecentButton.addEventListener("click", startRecentMistakeQuiz);
startSelectedVocabButton.addEventListener("click", startSelectedVocabularyQuiz);
playAudioButton.addEventListener("click", playCurrentQuestionAudio);
heardMeaningButton.addEventListener("click", markMeaningHeard);
missedMeaningButton.addEventListener("click", markMeaningMissed);
closeReviewButton.addEventListener("click", closeReviewModal);
continueReviewButton.addEventListener("click", continueQuizWithUnpassedWords);

document.querySelectorAll('input[name="quiz-mode"]').forEach((modeInput) => {
  modeInput.addEventListener("change", changeQuizMode);
});

answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing && !isComposingText) {
    submitAnswer();
  }
});

answerInput.addEventListener("compositionstart", () => {
  isComposingText = true;
});

answerInput.addEventListener("compositionend", () => {
  isComposingText = false;
});

applyLanguageConfig(false);
renderRecentMistakeFolder();
renderVocabularyLibrary();

function startQuiz() {
  const parsedWords = parseWordList(wordListInput.value);

  if (parsedWords.length === 0) {
    parseMessage.textContent = getLanguageConfig().emptyListMessage;
    return;
  }

  startQuizWithWords(parsedWords, "测验开始");
}

function startQuizWithWords(words, message) {
  mergeWordsIntoVocabulary(words);
  allWords = [...words];
  currentRoundWords = [...words];
  nextRoundWords = [];
  currentQuestion = null;
  totalMistakes = 0;
  mistakeCounts = new Map(words.map((word) => [word.kanji, 0]));

  parseMessage.textContent = "";
  reviewModal.classList.add("hidden");
  resultPanel.classList.add("hidden");
  mistakeList.innerHTML = "";
  summary.textContent = "";
  answerInput.disabled = false;
  submitButton.disabled = false;
  reviewButton.disabled = false;

  setFeedback("neutral", message);
  updateCollectRecentButton();
  pickNextQuestion();
}

function parseWordList(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kanji, reading] = line.split(",").map((part) => part?.trim());
      return { kanji, reading };
    })
    .filter((word) => word.kanji && word.reading);
}

function pickNextQuestion() {
  if (currentRoundWords.length === 0 && nextRoundWords.length > 0) {
    currentRoundWords = [...nextRoundWords];
    nextRoundWords = [];
  }

  if (currentRoundWords.length === 0) {
    finishQuiz();
    return;
  }

  const randomIndex = Math.floor(Math.random() * currentRoundWords.length);
  currentQuestion = currentRoundWords.splice(randomIndex, 1)[0];
  renderCurrentQuestion();
  clearAnswerInput();
  updateProgress();
  updateReviewButton();
  answerInput.focus();
}

function submitAnswer() {
  if (!currentQuestion || quizMode === "meaning") {
    return;
  }

  const rawUserAnswer = answerInput.value.trim();
  const normalizeAnswer = getLanguageConfig().normalizeAnswer;
  const userAnswer = normalizeAnswer(rawUserAnswer);
  const correctAnswer = normalizeAnswer(currentQuestion.reading);
  const isCorrectReading = userAnswer === correctAnswer;
  const isCorrectKanji = rawUserAnswer === currentQuestion.kanji;

  if (isCorrectReading || isCorrectKanji) {
    markCurrentQuestionCorrect("正确");
    return;
  }

  markCurrentQuestionWrong(`错误。正确读音：${currentQuestion.reading}`);
}

function normalizeJapaneseAnswer(text) {
  const trimmedText = text.trim();

  // 片假名 Unicode 范围大多比对应平假名大 0x60，逐字转换后再比较。
  return Array.from(trimmedText)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }
      return char;
    })
    .join("");
}

function normalizeEnglishAnswer(text) {
  return text.trim().toLowerCase();
}

function updateProgress() {
  const currentCount = currentQuestion ? 1 : 0;
  const remainingCount = currentRoundWords.length + nextRoundWords.length + currentCount;
  progress.textContent = `剩余 ${remainingCount} / 总共 ${allWords.length}`;
}

function finishQuiz() {
  currentQuestion = null;
  window.speechSynthesis?.cancel();
  currentWord.textContent = "全部完成";
  clearAnswerInput();
  answerInput.disabled = true;
  submitButton.disabled = true;
  playAudioButton.disabled = true;
  heardMeaningButton.disabled = true;
  missedMeaningButton.disabled = true;
  meaningActions.classList.add("hidden");
  reviewButton.disabled = true;
  updateProgress();
  setFeedback("correct", "全部完成");
  renderResults();
}

function renderResults() {
  resultPanel.classList.remove("hidden");
  summary.textContent = `总词数：${allWords.length}，答错总次数：${totalMistakes}`;

  mistakeList.innerHTML = "";
  allWords.forEach((word) => {
    const item = document.createElement("div");
    const wordText = document.createElement("span");
    const countText = document.createElement("strong");

    item.className = "mistake-item";
    wordText.textContent = `${word.kanji}（${word.reading}）`;
    countText.textContent = `${mistakeCounts.get(word.kanji) || 0} 次`;
    item.append(wordText, countText);
    mistakeList.appendChild(item);
  });
  updateCollectRecentButton();
}

function setFeedback(type, text) {
  feedback.className = `feedback ${type}`;
  feedback.textContent = text;
}

function changeLanguage() {
  window.speechSynthesis?.cancel();
  currentLanguage = languageSelect.value;
  recentMistakeWords = loadRecentMistakeWords();
  vocabularyWords = loadVocabularyWords();
  allWords = [];
  currentRoundWords = [];
  nextRoundWords = [];
  currentQuestion = null;
  totalMistakes = 0;
  mistakeCounts = new Map();
  applyLanguageConfig(true);
  renderRecentMistakeFolder();
  renderVocabularyLibrary();
}

function applyLanguageConfig(shouldReplaceWordList) {
  const config = getLanguageConfig();

  document.title = config.appTitle;
  setupTitle.textContent = config.appTitle;
  subtitle.textContent = config.subtitle;
  answerLabel.textContent = config.writtenAnswerLabel;
  currentWord.textContent = "请先开始测验";
  progress.textContent = "剩余 0 / 总共 0";
  setFeedback("neutral", "等待开始");
  resultPanel.classList.add("hidden");
  meaningActions.classList.add("hidden");
  answerInput.parentElement.classList.remove("hidden");
  answerInput.disabled = true;
  submitButton.disabled = true;
  playAudioButton.disabled = true;
  heardMeaningButton.disabled = true;
  missedMeaningButton.disabled = true;
  reviewButton.disabled = true;
  collectRecentButton.disabled = true;

  if (shouldReplaceWordList) {
    wordListInput.value = config.sampleWords;
  }
}

function getLanguageConfig() {
  return LANGUAGE_CONFIGS[currentLanguage];
}

function getStorageKey(name) {
  return `${currentLanguage}-${name}`;
}

function changeQuizMode(event) {
  quizMode = event.target.value;
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (!currentQuestion) {
    currentWord.textContent = "请先开始测验";
    answerLabel.textContent = getLanguageConfig().writtenAnswerLabel;
    playAudioButton.disabled = true;
    setAnswerModeControls(false);
    setMeaningModeControls(false);
    return;
  }

  if (quizMode === "listening") {
    currentWord.textContent = getLanguageConfig().listeningQuestionText;
    answerLabel.textContent = getLanguageConfig().listeningAnswerLabel;
    playAudioButton.disabled = false;
    setAnswerModeControls(true);
    setMeaningModeControls(false);
    playCurrentQuestionAudio();
    return;
  }

  if (quizMode === "meaning") {
    currentWord.textContent = getLanguageConfig().meaningQuestionText;
    answerLabel.textContent = "是否听出来";
    playAudioButton.disabled = false;
    setAnswerModeControls(false);
    setMeaningModeControls(true);
    playCurrentQuestionAudio();
    return;
  }

  window.speechSynthesis?.cancel();
  currentWord.textContent = currentQuestion.kanji;
  answerLabel.textContent = getLanguageConfig().writtenAnswerLabel;
  playAudioButton.disabled = true;
  setAnswerModeControls(true);
  setMeaningModeControls(false);
}

function playCurrentQuestionAudio() {
  if (!currentQuestion || !["listening", "meaning"].includes(quizMode) || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(currentQuestion.reading);
  utterance.lang = getLanguageConfig().speechLang;
  utterance.rate = getLanguageConfig().speechRate;
  window.speechSynthesis.speak(utterance);
}

function markMeaningHeard() {
  if (!currentQuestion || quizMode !== "meaning") {
    return;
  }

  markCurrentQuestionCorrect(`听出来。单词：${currentQuestion.kanji}（${currentQuestion.reading}）`);
}

function markMeaningMissed() {
  if (!currentQuestion || quizMode !== "meaning") {
    return;
  }

  markCurrentQuestionWrong(`没听出来。单词：${currentQuestion.kanji}（${currentQuestion.reading}）`);
}

function markCurrentQuestionCorrect(message) {
  setFeedback("correct", message);
  currentQuestion = null;
  clearAnswerInput();
  updateReviewButton();
  pickNextQuestion();
}

function markCurrentQuestionWrong(message) {
  totalMistakes += 1;
  mistakeCounts.set(currentQuestion.kanji, (mistakeCounts.get(currentQuestion.kanji) || 0) + 1);
  addVocabularyMistake(currentQuestion);
  setFeedback("wrong", message);
  nextRoundWords.push(currentQuestion);
  currentQuestion = null;
  clearAnswerInput();
  updateReviewButton();
  updateCollectRecentButton();
  pickNextQuestion();
}

function setAnswerModeControls(isVisible) {
  answerInput.disabled = !isVisible;
  submitButton.disabled = !isVisible;
  answerInput.parentElement.classList.toggle("hidden", !isVisible);
}

function setMeaningModeControls(isVisible) {
  heardMeaningButton.disabled = !isVisible;
  missedMeaningButton.disabled = !isVisible;
  meaningActions.classList.toggle("hidden", !isVisible);
}

function openReviewModal() {
  const unpassedWords = getUnpassedWords();

  if (unpassedWords.length === 0) {
    return;
  }

  reviewCount.textContent = `当前未通过：${unpassedWords.length} 个`;
  reviewList.innerHTML = "";
  unpassedWords.forEach((word) => {
    const item = document.createElement("div");
    const kanjiText = document.createElement("span");
    const readingText = document.createElement("span");

    item.className = "review-item";
    kanjiText.className = "review-kanji";
    readingText.className = "review-reading";
    kanjiText.textContent = word.kanji;
    readingText.textContent = word.reading;
    item.append(kanjiText, readingText);
    reviewList.appendChild(item);
  });

  reviewModal.classList.remove("hidden");
  continueReviewButton.focus();
}

function closeReviewModal() {
  reviewModal.classList.add("hidden");
  answerInput.focus();
}

function continueQuizWithUnpassedWords() {
  const unpassedWords = getUnpassedWords();
  closeReviewModal();

  if (unpassedWords.length === 0) {
    finishQuiz();
    return;
  }

  currentQuestion = null;
  currentRoundWords = [...unpassedWords];
  nextRoundWords = [];
  setFeedback("neutral", "继续测验");
  pickNextQuestion();
}

function collectHighMistakeWords() {
  const wordsToCollect = getHighMistakeWords();

  if (wordsToCollect.length === 0) {
    parseMessage.textContent = `当前还没有错误次数大于 ${RECENT_MISTAKE_THRESHOLD} 的词。`;
    return;
  }

  recentMistakeWords = getUniqueWords([...recentMistakeWords, ...wordsToCollect]);
  saveRecentMistakeWords();
  renderRecentMistakeFolder();
  parseMessage.textContent = `已加入 ${wordsToCollect.length} 个近期错误词。`;
}

function startRecentMistakeQuiz() {
  if (recentMistakeWords.length === 0) {
    parseMessage.textContent = "近期错误收藏夹还是空的。";
    return;
  }

  startQuizWithWords(recentMistakeWords, "近期错误测验开始");
}

function startSelectedVocabularyQuiz() {
  const selectedWords = getSelectedVocabularyWords();

  if (selectedWords.length === 0) {
    parseMessage.textContent = "请先在词汇库里勾选要测验的词。";
    return;
  }

  startQuizWithWords(selectedWords, "词汇库选中词测验开始");
}

function getHighMistakeWords() {
  return allWords.filter((word) => (mistakeCounts.get(word.kanji) || 0) > RECENT_MISTAKE_THRESHOLD);
}

function loadRecentMistakeWords() {
  const savedValue =
    localStorage.getItem(getStorageKey("reading-quiz-recent-mistakes")) ||
    (currentLanguage === "ja" ? localStorage.getItem("jp-reading-quiz-recent-mistakes") : null);

  if (!savedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(savedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return getUniqueWords(parsedValue.filter((word) => word?.kanji && word?.reading));
  } catch {
    return [];
  }
}

function saveRecentMistakeWords() {
  localStorage.setItem(getStorageKey("reading-quiz-recent-mistakes"), JSON.stringify(recentMistakeWords));
}

function renderRecentMistakeFolder() {
  recentFolderCount.textContent = `${recentMistakeWords.length} 个`;
  startRecentButton.disabled = recentMistakeWords.length === 0;
  recentFolderList.innerHTML = "";

  recentMistakeWords.forEach((word) => {
    const chip = document.createElement("span");
    chip.className = "folder-chip";
    chip.textContent = `${word.kanji} / ${word.reading}`;
    recentFolderList.appendChild(chip);
  });

  updateCollectRecentButton();
}

function mergeWordsIntoVocabulary(words) {
  const vocabularyMap = new Map(vocabularyWords.map((word) => [getWordKey(word), word]));

  words.forEach((word) => {
    const key = getWordKey(word);
    if (!vocabularyMap.has(key)) {
      vocabularyMap.set(key, {
        kanji: word.kanji,
        reading: word.reading,
        mistakes: 0,
      });
    }
  });

  vocabularyWords = Array.from(vocabularyMap.values());
  saveVocabularyWords();
  renderVocabularyLibrary();
}

function addVocabularyMistake(word) {
  mergeWordsIntoVocabulary([word]);

  const key = getWordKey(word);
  vocabularyWords = vocabularyWords.map((vocabularyWord) => {
    if (getWordKey(vocabularyWord) !== key) {
      return vocabularyWord;
    }

    return {
      ...vocabularyWord,
      mistakes: (vocabularyWord.mistakes || 0) + 1,
    };
  });

  saveVocabularyWords();
  renderVocabularyLibrary();
}

function loadVocabularyWords() {
  const savedValue =
    localStorage.getItem(getStorageKey("reading-quiz-vocabulary")) ||
    (currentLanguage === "ja" ? localStorage.getItem("jp-reading-quiz-vocabulary") : null);

  if (!savedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(savedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return getUniqueVocabularyWords(
      parsedValue
        .filter((word) => word?.kanji && word?.reading)
        .map((word) => ({
          kanji: word.kanji,
          reading: word.reading,
          mistakes: Number.isFinite(Number(word.mistakes)) ? Number(word.mistakes) : 0,
        })),
    );
  } catch {
    return [];
  }
}

function saveVocabularyWords() {
  localStorage.setItem(getStorageKey("reading-quiz-vocabulary"), JSON.stringify(vocabularyWords));
}

function renderVocabularyLibrary() {
  const sortedWords = getSortedVocabularyWords();
  vocabularyCount.textContent = `${sortedWords.length} 个`;
  vocabularyList.innerHTML = "";

  sortedWords.forEach((word) => {
    const item = document.createElement("label");
    const checkbox = document.createElement("input");
    const wordBox = document.createElement("span");
    const kanjiText = document.createElement("span");
    const readingText = document.createElement("span");
    const mistakesText = document.createElement("span");

    item.className = "vocabulary-item";
    checkbox.type = "checkbox";
    checkbox.className = "vocabulary-checkbox";
    checkbox.value = getWordKey(word);
    checkbox.addEventListener("change", updateSelectedVocabularyButton);

    wordBox.className = "vocabulary-word";
    kanjiText.className = "vocabulary-kanji";
    readingText.className = "vocabulary-reading";
    mistakesText.className = "vocabulary-mistakes";

    kanjiText.textContent = word.kanji;
    readingText.textContent = word.reading;
    mistakesText.textContent = `${word.mistakes || 0} 错`;

    wordBox.append(kanjiText, readingText);
    item.append(checkbox, wordBox, mistakesText);
    vocabularyList.appendChild(item);
  });

  updateSelectedVocabularyButton();
}

function getSelectedVocabularyWords() {
  const selectedKeys = Array.from(document.querySelectorAll(".vocabulary-checkbox:checked")).map(
    (checkbox) => checkbox.value,
  );
  const selectedKeySet = new Set(selectedKeys);

  return vocabularyWords
    .filter((word) => selectedKeySet.has(getWordKey(word)))
    .map((word) => ({
      kanji: word.kanji,
      reading: word.reading,
    }));
}

function getSortedVocabularyWords() {
  return [...vocabularyWords].sort((firstWord, secondWord) => {
    const mistakeDiff = (secondWord.mistakes || 0) - (firstWord.mistakes || 0);
    if (mistakeDiff !== 0) {
      return mistakeDiff;
    }

    return firstWord.kanji.localeCompare(secondWord.kanji, "ja");
  });
}

function getUniqueVocabularyWords(words) {
  const vocabularyMap = new Map();

  words.forEach((word) => {
    const key = getWordKey(word);
    const existingWord = vocabularyMap.get(key);

    if (!existingWord) {
      vocabularyMap.set(key, word);
      return;
    }

    vocabularyMap.set(key, {
      ...existingWord,
      mistakes: Math.max(existingWord.mistakes || 0, word.mistakes || 0),
    });
  });

  return Array.from(vocabularyMap.values());
}

function getUnpassedWords() {
  const words = [];

  if (currentQuestion) {
    words.push(currentQuestion);
  }

  words.push(...currentRoundWords, ...nextRoundWords);
  return getUniqueWords(words);
}

function getUniqueWords(words) {
  const seen = new Set();

  return words.filter((word) => {
    const key = `${word.kanji}::${word.reading}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getWordKey(word) {
  return `${word.kanji}::${word.reading}`;
}

function updateReviewButton() {
  reviewButton.disabled = getUnpassedWords().length === 0;
}

function updateCollectRecentButton() {
  collectRecentButton.disabled = getHighMistakeWords().length === 0;
}

function updateSelectedVocabularyButton() {
  startSelectedVocabButton.disabled = getSelectedVocabularyWords().length === 0;
}

function clearAnswerInput() {
  answerInput.value = "";

  // 有些中文/日文输入法会在 Enter 事件后才把组合文字写回输入框。
  // 下一帧再清一次，可以避免答对换题后旧答案残留。
  requestAnimationFrame(() => {
    answerInput.value = "";
  });
}

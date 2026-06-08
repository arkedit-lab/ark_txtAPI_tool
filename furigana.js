'use strict';

const [
  grade, org, separated, annotatedWithRuby, annotatedWithParen,
  replaced, toSeparate, copyAnnotatedWithParen, copyReplaced, copySeparated,
  fileInput, fileName, loadingIndicator, clearBtn, inputCard,
  exportAnnotatedWithParen, exportReplaced, exportSeparated,
  replacedRow, separatedRow, rubyLegend
] = [
  'grade', 'org', 'separated', 'annotatedWithRuby', 'annotatedWithParen',
  'replaced', 'toSeparate', 'copyAnnotatedWithParen', 'copyReplaced', 'copySeparated',
  'fileInput', 'fileName', 'loadingIndicator', 'clearBtn', 'inputCard',
  'exportAnnotatedWithParen', 'exportReplaced', 'exportSeparated',
  'replacedRow', 'separatedRow', 'rubyLegend'
].map(id => document.getElementById(id));

const isKatakanaWord = s => /^[ァ-ヶー]+$/.test(s);
const katakanaToHiragana = s => s.replace(/[ァ-ヶ]/g, c =>
  String.fromCharCode(c.charCodeAt(0) - 0x60)
);
const addKatakanaFurigana = words => words.map(w => {
  const fill = t => (!t.furigana && isKatakanaWord(t.surface))
    ? { ...t, furigana: katakanaToHiragana(t.surface) } : t;
  return w.subword ? { ...w, subword: w.subword.map(fill) } : fill(w);
});

const putParen = (base, rubyText) => `${base}(${rubyText})`;

const putRuby = (base, rubyText, isFixed = false) => {
  const annotated = document.createElement('ruby');
  const op = document.createElement('rp'); op.append('(');
  const rt = document.createElement('rt');
  rt.append(rubyText);
  if (isFixed) rt.classList.add('fixed-ruby');
  const cp = document.createElement('rp'); cp.append(')');
  annotated.append(base, op, rt, cp);
  return annotated;
};

const fetchWords = async (text, gradeNum) => {
  const res = await fetch('/api/furigana', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: '1',
      jsonrpc: '2.0',
      method: 'jlp.furiganaservice.furigana',
      params: { q: text, grade: gradeNum },
    }),
  });
  return (await res.json())?.result?.word;
};

const buildFixedSet = (words8) => {
  const set = new Set();
  if (!Array.isArray(words8)) return set;
  words8.forEach(w => {
    if (w.furigana && w.surface !== w.furigana) set.add(w.surface);
    if (w.subword) w.subword.forEach(s => {
      if (s.furigana && s.surface !== s.furigana) set.add(s.surface);
    });
  });
  return set;
};

const clearAll = () => {
  org.value = '';
  annotatedWithRuby.innerHTML = '';
  annotatedWithParen.value = replaced.value = separated.value = '';
  fileName.textContent = 'TXT';
  rubyLegend.style.display = 'none';
};

const applyFurigana = async () => {
  if (!org.value.trim()) {
    annotatedWithRuby.innerHTML = '';
    annotatedWithParen.value = replaced.value = separated.value = '';
    rubyLegend.style.display = 'none';
    return;
  }
  loadingIndicator.style.display = 'inline';
  try {
    const gradeVal = Number(grade.value);
    const apiGrade = gradeVal === 0 ? 1 : gradeVal;

    // grade=8未満の場合のみ grade=8 と並行取得して固定ルビを検出
    const [words, words8] = apiGrade < 8
      ? await Promise.all([fetchWords(org.value, apiGrade), fetchWords(org.value, 8)])
      : [await fetchWords(org.value, apiGrade), null];

    let processedWords = Array.isArray(words) ? [...words] : words;
    if (Array.isArray(processedWords) && gradeVal === 0) {
      processedWords = addKatakanaFurigana(processedWords);
    }

    const fixedSet = buildFixedSet(words8);
    annotatedWithRuby.innerHTML = '';
    rubyLegend.style.display = fixedSet.size > 0 ? 'flex' : 'none';

    if (Array.isArray(processedWords)) {
      const replacedWords = processedWords.map(w => w.furigana || w.surface);
      replaced.value = replacedWords.join('');

      separated.value = replacedWords.reduce((acc, token) => {
        return acc + ((acc.match(/\s$/) || token.match(/\s/)) ? '' : ' ') + token;
      }, '');

      annotatedWithParen.value = processedWords.map(w => {
        if (w.subword) {
          return w.subword.map(s =>
            (!s.furigana || s.surface === s.furigana) ? s.surface : putParen(s.surface, s.furigana)
          ).join('');
        }
        return (!w.furigana || w.surface === w.furigana) ? w.surface : putParen(w.surface, w.furigana);
      }).join('');

      processedWords.reduce((paragraphs, w) => {
        if (w.surface === '\n') {
          paragraphs.push(document.createElement('p'));
        } else {
          const p = paragraphs[paragraphs.length - 1];
          if (w.subword) {
            w.subword.forEach(s => {
              const isFixed = fixedSet.has(s.surface);
              p.append((!s.furigana || s.surface === s.furigana) ? s.surface : putRuby(s.surface, s.furigana, isFixed));
            });
          } else {
            const isFixed = fixedSet.has(w.surface);
            p.append((!w.furigana || w.surface === w.furigana) ? w.surface : putRuby(w.surface, w.furigana, isFixed));
          }
        }
        return paragraphs;
      }, [document.createElement('p')]).forEach(p => annotatedWithRuby.append(p));

    } else {
      annotatedWithParen.value = replaced.value = separated.value = '';
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    loadingIndicator.style.display = 'none';
  }
};

toSeparate.addEventListener('change', () => {
  const show = toSeparate.checked;
  replacedRow.style.display  = show ? 'none' : '';
  separatedRow.style.display = show ? '' : 'none';
});
toSeparate.dispatchEvent(new Event('change'));

[grade, org].forEach(el => {
  el.addEventListener('input', applyFurigana);
});

clearBtn.addEventListener('click', clearAll);

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const tmp = document.createElement('textarea');
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    document.body.removeChild(tmp);
  }
};

copyAnnotatedWithParen.addEventListener('click', () => copyText(annotatedWithParen.value));
copyReplaced.addEventListener('click',           () => copyText(replaced.value));
copySeparated.addEventListener('click',          () => copyText(separated.value));

// File handling
const handleFile = async (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'txt') {
    fileName.textContent = '非対応形式（TXTのみ）';
    return;
  }
  fileName.textContent = '読み込み中...';
  try {
    org.value = await file.text();
    fileName.textContent = file.name;
    await applyFurigana();
  } catch (err) {
    fileName.textContent = '読み込みエラー';
    console.error(err);
  }
};

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await handleFile(file);
  fileInput.value = '';
});

// Drag and drop
inputCard.addEventListener('dragover', (e) => {
  e.preventDefault();
  inputCard.classList.add('drop-active');
});

inputCard.addEventListener('dragleave', (e) => {
  if (!inputCard.contains(e.relatedTarget)) {
    inputCard.classList.remove('drop-active');
  }
});

inputCard.addEventListener('drop', async (e) => {
  e.preventDefault();
  inputCard.classList.remove('drop-active');
  const file = e.dataTransfer.files[0];
  if (file) await handleFile(file);
});

// TXT export
const saveTxt = (content, suffix) => {
  if (!content) return;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `furigana_${suffix}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

exportAnnotatedWithParen.addEventListener('click', () => saveTxt(annotatedWithParen.value, 'paren'));
exportReplaced.addEventListener('click',           () => saveTxt(replaced.value, 'hiragana'));
exportSeparated.addEventListener('click',          () => saveTxt(separated.value, 'wakati'));

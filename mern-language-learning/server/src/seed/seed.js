// Demo seed data for LinguaLeap. All lesson content is beginner vocabulary
// written for this seed — greetings, numbers 1-10, common verbs, food and
// colours — with translations the author is certain of. Japanese words show
// kana with a romaji reading in brackets; listening uses the kana form so
// the browser speech synthesis pronounces it correctly. Everything here is
// labelled sample content for trying the app locally.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Language = require('../models/Language');
const Lesson = require('../models/Lesson');
const XpEvent = require('../models/XpEvent');
const { levelForXp } = require('../utils/gamify');

// Each word: w = word as shown, r = romaji reading (Japanese only),
// t = English translation, ex / exEn = example sentence.
const WORDS = {
  es: {
    greetings: [
      { w: 'Hola', t: 'Hello', ex: 'Hola, ¿cómo estás?', exEn: 'Hello, how are you?' },
      { w: 'Gracias', t: 'Thank you', ex: 'Gracias por tu ayuda.', exEn: 'Thank you for your help.' },
      { w: 'Por favor', t: 'Please', ex: 'Un café, por favor.', exEn: 'A coffee, please.' },
      { w: 'Adiós', t: 'Goodbye', ex: 'Adiós, hasta mañana.', exEn: 'Goodbye, see you tomorrow.' },
      { w: 'Buenos días', t: 'Good morning', ex: 'Buenos días, señora.', exEn: 'Good morning, madam.' },
      { w: 'Buenas noches', t: 'Good night', ex: 'Buenas noches, hasta mañana.', exEn: 'Good night, see you tomorrow.' },
    ],
    numbers: [
      { w: 'uno', t: 'one', ex: 'Tengo uno.', exEn: 'I have one.' },
      { w: 'dos', t: 'two', ex: 'Dos cafés, por favor.', exEn: 'Two coffees, please.' },
      { w: 'tres', t: 'three', ex: 'Tres manzanas.', exEn: 'Three apples.' },
      { w: 'cuatro', t: 'four', ex: 'Cuatro libros.', exEn: 'Four books.' },
      { w: 'cinco', t: 'five', ex: 'Cinco días.', exEn: 'Five days.' },
      { w: 'seis', t: 'six', ex: 'Seis euros.', exEn: 'Six euros.' },
      { w: 'siete', t: 'seven', ex: 'Siete horas.', exEn: 'Seven hours.' },
      { w: 'ocho', t: 'eight', ex: 'Ocho personas.', exEn: 'Eight people.' },
      { w: 'nueve', t: 'nine', ex: 'Nueve meses.', exEn: 'Nine months.' },
      { w: 'diez', t: 'ten', ex: 'Diez minutos.', exEn: 'Ten minutes.' },
    ],
    verbs: [
      { w: 'hablar', t: 'to speak', ex: 'Yo hablo español.', exEn: 'I speak Spanish.' },
      { w: 'comer', t: 'to eat', ex: 'Yo como pan.', exEn: 'I eat bread.' },
      { w: 'beber', t: 'to drink', ex: 'Yo bebo agua.', exEn: 'I drink water.' },
      { w: 'leer', t: 'to read', ex: 'Yo leo un libro.', exEn: 'I read a book.' },
      { w: 'escribir', t: 'to write', ex: 'Yo escribo una carta.', exEn: 'I write a letter.' },
      { w: 'vivir', t: 'to live', ex: 'Yo vivo en Madrid.', exEn: 'I live in Madrid.' },
    ],
    food: [
      { w: 'pan', t: 'bread', ex: 'Quiero pan.', exEn: 'I want bread.' },
      { w: 'agua', t: 'water', ex: 'Bebo agua.', exEn: 'I drink water.' },
      { w: 'leche', t: 'milk', ex: 'La leche es blanca.', exEn: 'The milk is white.' },
      { w: 'manzana', t: 'apple', ex: 'La manzana es roja.', exEn: 'The apple is red.' },
      { w: 'arroz', t: 'rice', ex: 'El arroz es blanco.', exEn: 'The rice is white.' },
      { w: 'queso', t: 'cheese', ex: 'El queso es amarillo.', exEn: 'The cheese is yellow.' },
    ],
    colours: [
      { w: 'rojo', t: 'red', ex: 'El coche es rojo.', exEn: 'The car is red.' },
      { w: 'azul', t: 'blue', ex: 'El cielo es azul.', exEn: 'The sky is blue.' },
      { w: 'verde', t: 'green', ex: 'La hierba es verde.', exEn: 'The grass is green.' },
      { w: 'amarillo', t: 'yellow', ex: 'El sol es amarillo.', exEn: 'The sun is yellow.' },
      { w: 'negro', t: 'black', ex: 'El gato es negro.', exEn: 'The cat is black.' },
      { w: 'blanco', t: 'white', ex: 'La nieve es blanca.', exEn: 'The snow is white.' },
    ],
  },
  fr: {
    greetings: [
      { w: 'Bonjour', t: 'Hello', ex: 'Bonjour, comment allez-vous ?', exEn: 'Hello, how are you?' },
      { w: 'Merci', t: 'Thank you', ex: 'Merci pour votre aide.', exEn: 'Thank you for your help.' },
      { w: 'S’il vous plaît', t: 'Please', ex: 'Un café, s’il vous plaît.', exEn: 'A coffee, please.' },
      { w: 'Au revoir', t: 'Goodbye', ex: 'Au revoir, à demain.', exEn: 'Goodbye, see you tomorrow.' },
      { w: 'Bonsoir', t: 'Good evening', ex: 'Bonsoir, madame.', exEn: 'Good evening, madam.' },
      { w: 'Bonne nuit', t: 'Good night', ex: 'Bonne nuit, à demain.', exEn: 'Good night, see you tomorrow.' },
    ],
    numbers: [
      { w: 'un', t: 'one', ex: 'J’ai un livre.', exEn: 'I have one book.' },
      { w: 'deux', t: 'two', ex: 'Deux cafés, s’il vous plaît.', exEn: 'Two coffees, please.' },
      { w: 'trois', t: 'three', ex: 'Trois pommes.', exEn: 'Three apples.' },
      { w: 'quatre', t: 'four', ex: 'Quatre livres.', exEn: 'Four books.' },
      { w: 'cinq', t: 'five', ex: 'Cinq jours.', exEn: 'Five days.' },
      { w: 'six', t: 'six', ex: 'Six euros.', exEn: 'Six euros.' },
      { w: 'sept', t: 'seven', ex: 'Sept heures.', exEn: 'Seven hours.' },
      { w: 'huit', t: 'eight', ex: 'Huit personnes.', exEn: 'Eight people.' },
      { w: 'neuf', t: 'nine', ex: 'Neuf mois.', exEn: 'Nine months.' },
      { w: 'dix', t: 'ten', ex: 'Dix minutes.', exEn: 'Ten minutes.' },
    ],
    verbs: [
      { w: 'parler', t: 'to speak', ex: 'Je parle français.', exEn: 'I speak French.' },
      { w: 'manger', t: 'to eat', ex: 'Je mange du pain.', exEn: 'I eat bread.' },
      { w: 'boire', t: 'to drink', ex: 'Je bois de l’eau.', exEn: 'I drink water.' },
      { w: 'lire', t: 'to read', ex: 'Je lis un livre.', exEn: 'I read a book.' },
      { w: 'écrire', t: 'to write', ex: 'J’écris une lettre.', exEn: 'I write a letter.' },
      { w: 'vivre', t: 'to live', ex: 'Je vis à Paris.', exEn: 'I live in Paris.' },
    ],
    food: [
      { w: 'pain', t: 'bread', ex: 'Je veux du pain.', exEn: 'I want bread.' },
      { w: 'eau', t: 'water', ex: 'Je bois de l’eau.', exEn: 'I drink water.' },
      { w: 'lait', t: 'milk', ex: 'Le lait est blanc.', exEn: 'The milk is white.' },
      { w: 'pomme', t: 'apple', ex: 'La pomme est rouge.', exEn: 'The apple is red.' },
      { w: 'riz', t: 'rice', ex: 'Le riz est blanc.', exEn: 'The rice is white.' },
      { w: 'fromage', t: 'cheese', ex: 'Le fromage est jaune.', exEn: 'The cheese is yellow.' },
    ],
    colours: [
      { w: 'rouge', t: 'red', ex: 'La voiture est rouge.', exEn: 'The car is red.' },
      { w: 'bleu', t: 'blue', ex: 'Le ciel est bleu.', exEn: 'The sky is blue.' },
      { w: 'vert', t: 'green', ex: 'L’herbe est verte.', exEn: 'The grass is green.' },
      { w: 'jaune', t: 'yellow', ex: 'Le soleil est jaune.', exEn: 'The sun is yellow.' },
      { w: 'noir', t: 'black', ex: 'Le chat est noir.', exEn: 'The cat is black.' },
      { w: 'blanc', t: 'white', ex: 'La neige est blanche.', exEn: 'The snow is white.' },
    ],
  },
  de: {
    greetings: [
      { w: 'Hallo', t: 'Hello', ex: 'Hallo, wie geht es dir?', exEn: 'Hello, how are you?' },
      { w: 'Danke', t: 'Thank you', ex: 'Danke für deine Hilfe.', exEn: 'Thank you for your help.' },
      { w: 'Bitte', t: 'Please', ex: 'Einen Kaffee, bitte.', exEn: 'A coffee, please.' },
      { w: 'Tschüss', t: 'Goodbye', ex: 'Tschüss, bis morgen.', exEn: 'Goodbye, see you tomorrow.' },
      { w: 'Guten Morgen', t: 'Good morning', ex: 'Guten Morgen, Frau Müller.', exEn: 'Good morning, Mrs Müller.' },
      { w: 'Gute Nacht', t: 'Good night', ex: 'Gute Nacht, bis morgen.', exEn: 'Good night, see you tomorrow.' },
    ],
    numbers: [
      { w: 'eins', t: 'one', ex: 'Ich habe eins.', exEn: 'I have one.' },
      { w: 'zwei', t: 'two', ex: 'Zwei Kaffees, bitte.', exEn: 'Two coffees, please.' },
      { w: 'drei', t: 'three', ex: 'Drei Äpfel.', exEn: 'Three apples.' },
      { w: 'vier', t: 'four', ex: 'Vier Bücher.', exEn: 'Four books.' },
      { w: 'fünf', t: 'five', ex: 'Fünf Tage.', exEn: 'Five days.' },
      { w: 'sechs', t: 'six', ex: 'Sechs Euro.', exEn: 'Six euros.' },
      { w: 'sieben', t: 'seven', ex: 'Sieben Stunden.', exEn: 'Seven hours.' },
      { w: 'acht', t: 'eight', ex: 'Acht Personen.', exEn: 'Eight people.' },
      { w: 'neun', t: 'nine', ex: 'Neun Monate.', exEn: 'Nine months.' },
      { w: 'zehn', t: 'ten', ex: 'Zehn Minuten.', exEn: 'Ten minutes.' },
    ],
    verbs: [
      { w: 'sprechen', t: 'to speak', ex: 'Ich spreche Deutsch.', exEn: 'I speak German.' },
      { w: 'essen', t: 'to eat', ex: 'Ich esse Brot.', exEn: 'I eat bread.' },
      { w: 'trinken', t: 'to drink', ex: 'Ich trinke Wasser.', exEn: 'I drink water.' },
      { w: 'lesen', t: 'to read', ex: 'Ich lese ein Buch.', exEn: 'I read a book.' },
      { w: 'schreiben', t: 'to write', ex: 'Ich schreibe einen Brief.', exEn: 'I write a letter.' },
      { w: 'leben', t: 'to live', ex: 'Ich lebe in Berlin.', exEn: 'I live in Berlin.' },
    ],
    food: [
      { w: 'Brot', t: 'bread', ex: 'Ich möchte Brot.', exEn: 'I want bread.' },
      { w: 'Wasser', t: 'water', ex: 'Ich trinke Wasser.', exEn: 'I drink water.' },
      { w: 'Milch', t: 'milk', ex: 'Die Milch ist weiß.', exEn: 'The milk is white.' },
      { w: 'Apfel', t: 'apple', ex: 'Der Apfel ist rot.', exEn: 'The apple is red.' },
      { w: 'Reis', t: 'rice', ex: 'Der Reis ist weiß.', exEn: 'The rice is white.' },
      { w: 'Käse', t: 'cheese', ex: 'Der Käse ist gelb.', exEn: 'The cheese is yellow.' },
    ],
    colours: [
      { w: 'rot', t: 'red', ex: 'Das Auto ist rot.', exEn: 'The car is red.' },
      { w: 'blau', t: 'blue', ex: 'Der Himmel ist blau.', exEn: 'The sky is blue.' },
      { w: 'grün', t: 'green', ex: 'Das Gras ist grün.', exEn: 'The grass is green.' },
      { w: 'gelb', t: 'yellow', ex: 'Die Sonne ist gelb.', exEn: 'The sun is yellow.' },
      { w: 'schwarz', t: 'black', ex: 'Die Katze ist schwarz.', exEn: 'The cat is black.' },
      { w: 'weiß', t: 'white', ex: 'Der Schnee ist weiß.', exEn: 'The snow is white.' },
    ],
  },
  ja: {
    greetings: [
      { w: 'こんにちは', r: 'konnichiwa', t: 'Hello', ex: 'こんにちは、元気ですか。', exEn: 'Hello, how are you?' },
      { w: 'ありがとう', r: 'arigatou', t: 'Thank you', ex: 'ありがとうございます。', exEn: 'Thank you very much.' },
      { w: 'すみません', r: 'sumimasen', t: 'Excuse me', ex: 'すみません、トイレはどこですか。', exEn: 'Excuse me, where is the toilet?' },
      { w: 'さようなら', r: 'sayounara', t: 'Goodbye', ex: 'さようなら、また明日。', exEn: 'Goodbye, see you tomorrow.' },
      { w: 'おはよう', r: 'ohayou', t: 'Good morning', ex: 'おはようございます。', exEn: 'Good morning.' },
      { w: 'おやすみ', r: 'oyasumi', t: 'Good night', ex: 'おやすみなさい。', exEn: 'Good night.' },
    ],
    numbers: [
      { w: 'いち', r: 'ichi', t: 'one', ex: 'いち、に、さん、よん、ご。', exEn: 'Counting: one, two, three, four, five.' },
      { w: 'に', r: 'ni', t: 'two', ex: 'に、さん、よん、ご、ろく。', exEn: 'Counting: two, three, four, five, six.' },
      { w: 'さん', r: 'san', t: 'three', ex: 'さん、よん、ご、ろく、なな。', exEn: 'Counting: three, four, five, six, seven.' },
      { w: 'よん', r: 'yon', t: 'four', ex: 'よん、ご、ろく、なな、はち。', exEn: 'Counting: four, five, six, seven, eight.' },
      { w: 'ご', r: 'go', t: 'five', ex: 'ご、ろく、なな、はち、きゅう。', exEn: 'Counting: five, six, seven, eight, nine.' },
      { w: 'ろく', r: 'roku', t: 'six', ex: 'ろく、なな、はち、きゅう、じゅう。', exEn: 'Counting: six, seven, eight, nine, ten.' },
      { w: 'なな', r: 'nana', t: 'seven', ex: 'なな、はち、きゅう、じゅう。', exEn: 'Counting: seven, eight, nine, ten.' },
      { w: 'はち', r: 'hachi', t: 'eight', ex: 'はち、きゅう、じゅう。', exEn: 'Counting: eight, nine, ten.' },
      { w: 'きゅう', r: 'kyuu', t: 'nine', ex: 'きゅう、じゅう。', exEn: 'Counting: nine, ten.' },
      { w: 'じゅう', r: 'juu', t: 'ten', ex: 'いち、に、さん、よん、ご、ろく、なな、はち、きゅう、じゅう。', exEn: 'Counting: one to ten.' },
    ],
    verbs: [
      { w: 'はなす', r: 'hanasu', t: 'to speak', ex: 'わたしは日本語をはなします。', exEn: 'I speak Japanese.' },
      { w: 'たべる', r: 'taberu', t: 'to eat', ex: 'わたしはパンをたべます。', exEn: 'I eat bread.' },
      { w: 'のむ', r: 'nomu', t: 'to drink', ex: 'わたしはみずをのみます。', exEn: 'I drink water.' },
      { w: 'よむ', r: 'yomu', t: 'to read', ex: 'わたしは本をよみます。', exEn: 'I read a book.' },
      { w: 'かく', r: 'kaku', t: 'to write', ex: 'わたしは手紙をかきます。', exEn: 'I write a letter.' },
      { w: 'すむ', r: 'sumu', t: 'to live', ex: 'わたしは東京にすみます。', exEn: 'I live in Tokyo.' },
    ],
    food: [
      { w: 'パン', r: 'pan', t: 'bread', ex: 'パンをたべます。', exEn: 'I eat bread.' },
      { w: 'みず', r: 'mizu', t: 'water', ex: 'みずをのみます。', exEn: 'I drink water.' },
      { w: 'ミルク', r: 'miruku', t: 'milk', ex: 'ミルクをのみます。', exEn: 'I drink milk.' },
      { w: 'りんご', r: 'ringo', t: 'apple', ex: 'りんごはあかいです。', exEn: 'The apple is red.' },
      { w: 'ごはん', r: 'gohan', t: 'rice', ex: 'ごはんをたべます。', exEn: 'I eat rice.' },
      { w: 'チーズ', r: 'chiizu', t: 'cheese', ex: 'チーズはきいろいです。', exEn: 'The cheese is yellow.' },
    ],
    colours: [
      { w: 'あか', r: 'aka', t: 'red', ex: 'りんごはあかいです。', exEn: 'The apple is red.' },
      { w: 'あお', r: 'ao', t: 'blue', ex: 'そらはあおいです。', exEn: 'The sky is blue.' },
      { w: 'みどり', r: 'midori', t: 'green', ex: 'くさはみどりです。', exEn: 'The grass is green.' },
      { w: 'きいろ', r: 'kiiro', t: 'yellow', ex: 'たいようはきいろいです。', exEn: 'The sun is yellow.' },
      { w: 'くろ', r: 'kuro', t: 'black', ex: 'ねこはくろいです。', exEn: 'The cat is black.' },
      { w: 'しろ', r: 'shiro', t: 'white', ex: 'ゆきはしろいです。', exEn: 'The snow is white.' },
    ],
  },
};

const LANGUAGES = [
  {
    code: 'es', name: 'Spanish', nativeName: 'Español', speechLang: 'es-ES',
    tagline: 'Start with the words you will actually use.',
    description: 'Spanish is spoken across Spain and Latin America. This course starts with greetings, numbers and everyday words, with listening practice in every lesson.',
    difficulty: 'Easy start',
  },
  {
    code: 'fr', name: 'French', nativeName: 'Français', speechLang: 'fr-FR',
    tagline: 'Polite, precise, and very good for travellers.',
    description: 'French is spoken across France, Canada and parts of Africa. This course starts with greetings, numbers and everyday words, with listening practice in every lesson.',
    difficulty: 'Easy start',
  },
  {
    code: 'de', name: 'German', nativeName: 'Deutsch', speechLang: 'de-DE',
    tagline: 'Clear rules, honest words, steady progress.',
    description: 'German is spoken in Germany, Austria and Switzerland. This course starts with greetings, numbers and everyday words, with listening practice in every lesson.',
    difficulty: 'Moderate',
  },
  {
    code: 'ja', name: 'Japanese', nativeName: '日本語', speechLang: 'ja-JP',
    tagline: 'A new script, taught one small step at a time.',
    description: 'Japanese uses kana alongside romaji in this course, so you can read and listen from the first lesson. It starts with greetings, numbers and everyday words.',
    difficulty: 'New script',
  },
];

const LESSON_PLAN = [
  { unit: 1, unitTitle: 'First words', order: 1, title: 'Say hello', description: 'Greetings you will use every day.', words: (w) => w.greetings },
  { unit: 1, unitTitle: 'First words', order: 2, title: 'Count to six', description: 'Numbers one to six, with listening.', words: (w) => w.numbers.slice(0, 6) },
  { unit: 1, unitTitle: 'First words', order: 3, title: 'Count to ten', description: 'Numbers seven to ten, plus a greeting review.', words: (w) => [...w.numbers.slice(6, 10), w.greetings[0], w.greetings[1]] },
  { unit: 2, unitTitle: 'Everyday life', order: 1, title: 'Action verbs', description: 'Six verbs for the things you do daily.', words: (w) => w.verbs },
  { unit: 2, unitTitle: 'Everyday life', order: 2, title: 'At the table', description: 'Food and drink words.', words: (w) => w.food },
  { unit: 2, unitTitle: 'Everyday life', order: 3, title: 'Colours & review', description: 'Six colours, plus a verb and a food word to review.', words: (w) => [...w.colours, w.verbs[0], w.food[0]] },
];

// Deterministic shuffle (mulberry32) so the seed is reproducible.
function seededShuffle(arr, seed) {
  const out = [...arr];
  let s = seed;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function displayWord(word) {
  return word.r ? `${word.w} (${word.r})` : word.w;
}

// The typed answer for a fill exercise: romaji for Japanese (learners type
// in Latin letters), the word itself for the other languages.
function fillAnswer(word) {
  return word.r || word.w;
}

function pickDistractors(pool, correct, count, getValue) {
  const others = pool.filter((x) => getValue(x) !== correct);
  return seededShuffle(others, correct.length * 31 + getValue.length).slice(0, count);
}

function buildExercises(words, pool, code, seedBase) {
  const display = words.map(displayWord);
  const ex = [];
  // 1 — multiple choice: word -> translation.
  ex.push({
    type: 'mc',
    prompt: `What does “${display[0]}” mean?`,
    question: display[0],
    options: seededShuffle(
      [words[0].t, ...pickDistractors(pool, words[0].t, 3, (x) => x.t).map((x) => x.t)],
      seedBase + 1
    ),
    answer: words[0].t,
    word: display[0],
    translation: words[0].t,
  });
  // 2 — multiple choice: translation -> word.
  ex.push({
    type: 'mc',
    prompt: `How do you say “${words[1].t}” in ${code === 'ja' ? 'Japanese' : code === 'es' ? 'Spanish' : code === 'fr' ? 'French' : 'German'}?`,
    question: words[1].t,
    options: seededShuffle(
      [display[1], ...pickDistractors(pool, display[1], 3, (x) => displayWord(x)).map((x) => displayWord(x))],
      seedBase + 2
    ),
    answer: display[1],
    word: display[1],
    translation: words[1].t,
  });
  // 3 — fill in the blank: type the word from memory.
  ex.push({
    type: 'fill',
    prompt: `Type the word for “${words[2].t}”.${code === 'ja' ? ' (Type the romaji.)' : ''}`,
    question: words[2].t,
    answer: fillAnswer(words[2]),
    word: display[2],
    translation: words[2].t,
  });
  // 4 — matching pairs.
  ex.push({
    type: 'match',
    prompt: 'Match each word with its meaning.',
    pairs: words.slice(0, 4).map((wd) => ({ a: displayWord(wd), b: wd.t })),
    word: display[0],
    translation: words[0].t,
  });
  // 5 — listening: hear the word, pick it out.
  ex.push({
    type: 'listen',
    prompt: 'Listen and choose the word you hear.',
    options: seededShuffle(
      [display[3], ...pickDistractors(pool, display[3], 3, (x) => displayWord(x)).map((x) => displayWord(x))],
      seedBase + 5
    ),
    answer: display[3],
    audioText: words[3].w,
    word: display[3],
    translation: words[3].t,
  });
  // 6 — multiple choice again, a different word.
  ex.push({
    type: 'mc',
    prompt: `What does “${display[4]}” mean?`,
    question: display[4],
    options: seededShuffle(
      [words[4].t, ...pickDistractors(pool, words[4].t, 3, (x) => x.t).map((x) => x.t)],
      seedBase + 6
    ),
    answer: words[4].t,
    word: display[4],
    translation: words[4].t,
  });
  return ex;
}

// Sample learners so the weekly leaderboard is not empty on first run.
// Their XP events are spread across the last few days.
const SAMPLE_LEARNERS = [
  { name: 'Aarav (sample learner)', email: 'aarav@lingualeap.example', xp: 320, streak: 6, daysAgo: [0, 1, 2, 4] },
  { name: 'Meera (sample learner)', email: 'meera@lingualeap.example', xp: 240, streak: 4, daysAgo: [0, 1, 3] },
  { name: 'Rohan (sample learner)', email: 'rohan@lingualeap.example', xp: 180, streak: 3, daysAgo: [0, 2] },
  { name: 'Sara (sample learner)', email: 'sara@lingualeap.example', xp: 90, streak: 2, daysAgo: [1] },
];

async function seed() {
  const existing = await Language.countDocuments();
  if (existing > 0) return;

  const hash = await bcrypt.hash('LinguaLeap123!', 10);
  await User.create([
    { name: 'Demo Learner', email: 'demo@lingualeap.example', passwordHash: hash, role: 'learner' },
    { name: 'Demo Instructor', email: 'demo-instructor@lingualeap.example', passwordHash: hash, role: 'instructor' },
    { name: 'Admin', email: 'admin@lingualeap.example', passwordHash: hash, role: 'admin' },
  ]);

  // Sample learners with a week of XP history for the leaderboard.
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  for (const s of SAMPLE_LEARNERS) {
    const user = await User.create({
      name: s.name,
      email: s.email,
      passwordHash: hash,
      role: 'learner',
      xp: s.xp,
      level: levelForXp(s.xp),
      streak: s.streak,
      lastActiveDate: new Date(now).toISOString().slice(0, 10),
      lessonsCompleted: Math.floor(s.xp / 60),
    });
    const perDay = Math.floor(s.xp / s.daysAgo.length);
    for (let i = 0; i < s.daysAgo.length; i += 1) {
      await XpEvent.create({
        user: user._id,
        xp: i === s.daysAgo.length - 1 ? s.xp - perDay * (s.daysAgo.length - 1) : perDay,
        source: 'lesson',
        createdAt: new Date(now - s.daysAgo[i] * DAY),
      });
    }
  }

  for (const lang of LANGUAGES) {
    const language = await Language.create(lang);
    const pool = Object.values(WORDS[lang.code]).flat();
    LESSON_PLAN.forEach((plan, idx) => {
      const words = plan.words(WORDS[lang.code]);
      // Build the lesson document synchronously into an array; created below.
      plan._doc = {
        language: language._id,
        languageCode: lang.code,
        unit: plan.unit,
        unitTitle: plan.unitTitle,
        order: plan.order,
        title: plan.title,
        description: plan.description,
        xpReward: 20,
        words: words.map((wd) => ({
          word: displayWord(wd),
          reading: wd.r || '',
          translation: wd.t,
          example: wd.ex,
          exampleEn: wd.exEn,
        })),
        exercises: buildExercises(words, pool, lang.code, (idx + 1) * 17 + lang.code.charCodeAt(0)),
      };
    });
    await Lesson.create(LESSON_PLAN.map((p) => p._doc));
  }
  console.log('Seeded demo users, sample learners and 4 languages with 24 lessons');
}

module.exports = seed;

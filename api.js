const BASE = 'https://opentdb.com';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decode = (s) => decodeURIComponent(s);

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

async function getJson(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(5500);
      continue;
    }
    const data = await res.json();
    // response_code 5 = rate limited (one request per 5 seconds per IP)
    if (data.response_code === 5 && attempt < retries) {
      await sleep(5500);
      continue;
    }
    return data;
  }
  throw new Error('rate_limited');
}

export async function fetchCategories() {
  const data = await getJson(`${BASE}/api_category.php`);
  return data.trivia_categories;
}

export async function fetchQuestions({ amount = 10, category, difficulty }) {
  const params = new URLSearchParams({ amount: String(amount), encode: 'url3986' });
  if (category) params.set('category', String(category));
  if (difficulty) params.set('difficulty', difficulty);

  const data = await getJson(`${BASE}/api.php?${params}`);
  if (data.response_code === 1) throw new Error('no_results');
  if (data.response_code !== 0) throw new Error(`api_error_${data.response_code}`);

  return data.results.map((q) => {
    const correct = decode(q.correct_answer);
    const answers = shuffle([correct, ...q.incorrect_answers.map(decode)]);
    return {
      question: decode(q.question),
      category: decode(q.category),
      difficulty: q.difficulty,
      correct,
      answers,
    };
  });
}

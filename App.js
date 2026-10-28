import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchCategories, fetchQuestions } from './api';

const QUESTION_COUNT = 5;
const SECONDS_PER_QUESTION = 20;
const DIFFICULTIES = [
  { value: undefined, label: 'أي مستوى' },
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'صعب' },
];

export default function App() {
  const [screen, setScreen] = useState('menu'); // menu | loading | quiz | result
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(undefined);
  const [difficulty, setDifficulty] = useState(undefined);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [error, setError] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  function loadCategories() {
    setCategoriesLoading(true);
    setError(null);
    fetchCategories()
      .then(setCategories)
      .catch(() => setError('تعذر تحميل الفئات، تأكد من الاتصال بالإنترنت'))
      .finally(() => setCategoriesLoading(false));
  }

  useEffect(loadCategories, []);

  const question = questions[index];
  const answered = selected !== null;

  // countdown per question
  useEffect(() => {
    if (screen !== 'quiz' || answered) return;
    if (timeLeft <= 0) {
      setSelected('__timeout__');
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, answered, timeLeft]);

  async function start() {
    setError(null);
    setScreen('loading');
    try {
      const qs = await fetchQuestions({ amount: QUESTION_COUNT, category, difficulty });
      setQuestions(qs);
      setIndex(0);
      setScore(0);
      setSelected(null);
      setTimeLeft(SECONDS_PER_QUESTION);
      setScreen('quiz');
    } catch (e) {
      if (e.message === 'no_results') {
        setScreen('empty');
        return;
      }
      setError(
        e.message === 'rate_limited'
          ? 'طلبات كثيرة، انتظر ثواني وجرب مرة ثانية'
          : 'تعذر تحميل الأسئلة، تأكد من الاتصال بالإنترنت'
      );
      setScreen('error');
    }
  }

  function choose(answer) {
    if (answered) return;
    setSelected(answer);
    if (answer === question.correct) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setScreen('result');
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setTimeLeft(SECONDS_PER_QUESTION);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      {screen === 'menu' && (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>لعبة الأسئلة</Text>
          {error && (
            <>
              <Text style={styles.error}>{error}</Text>
              <Pressable style={styles.secondary} onPress={loadCategories}>
                <Text style={styles.primaryText}>إعادة المحاولة</Text>
              </Pressable>
            </>
          )}

          <Text style={styles.label}>الفئة</Text>
          {categoriesLoading && <ActivityIndicator color="#fff" />}
          <View style={styles.chips}>
            <Chip label="الكل" active={category === undefined} onPress={() => setCategory(undefined)} />
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                active={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </View>

          <Text style={styles.label}>المستوى</Text>
          <View style={styles.chips}>
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.label}
                label={d.label}
                active={difficulty === d.value}
                onPress={() => setDifficulty(d.value)}
              />
            ))}
          </View>

          <Pressable style={styles.primary} onPress={start}>
            <Text style={styles.primaryText}>ابدأ</Text>
          </Pressable>
        </ScrollView>
      )}

      {screen === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.muted}>جاري تحميل الأسئلة...</Text>
        </View>
      )}

      {screen === 'error' && (
        <StateView
          icon="⚠️"
          title="صار خطأ"
          message={error}
          primaryLabel="إعادة المحاولة"
          onPrimary={start}
          secondaryLabel="القائمة"
          onSecondary={() => setScreen('menu')}
        />
      )}

      {screen === 'empty' && (
        <StateView
          icon="📭"
          title="ما فيه أسئلة"
          message="ما فيه أسئلة كافية لهذه الفئة والمستوى، جرب فئة أو مستوى ثاني"
          primaryLabel="رجوع للقائمة"
          onPrimary={() => setScreen('menu')}
        />
      )}

      {screen === 'quiz' && question && (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.row}>
            <Text style={styles.muted}>
              {index + 1} / {questions.length}
            </Text>
            <Text style={[styles.timer, timeLeft <= 5 && { color: '#ff6b6b' }]}>{timeLeft}s</Text>
            <Text style={styles.muted}>النقاط: {score}</Text>
          </View>
          <Text style={styles.category}>{question.category}</Text>
          <Text style={styles.question}>{question.question}</Text>

          {question.answers.map((a) => {
            const isCorrect = a === question.correct;
            const isPicked = a === selected;
            return (
              <Pressable
                key={a}
                onPress={() => choose(a)}
                style={[
                  styles.answer,
                  answered && isCorrect && styles.correct,
                  answered && isPicked && !isCorrect && styles.wrong,
                ]}
              >
                <Text style={styles.answerText}>{a}</Text>
              </Pressable>
            );
          })}

          {answered && (
            <>
              {selected === '__timeout__' && <Text style={styles.error}>انتهى الوقت!</Text>}
              <Pressable style={styles.primary} onPress={next}>
                <Text style={styles.primaryText}>
                  {index + 1 >= questions.length ? 'النتيجة' : 'التالي'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}

      {screen === 'result' && (
        <View style={styles.center}>
          <Text style={styles.title}>النتيجة</Text>
          <Text style={styles.score}>
            {score} / {questions.length}
          </Text>
          <Pressable style={styles.primary} onPress={start}>
            <Text style={styles.primaryText}>العب مرة ثانية</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => setScreen('menu')}>
            <Text style={styles.primaryText}>القائمة</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function StateView({ icon, title, message, primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  return (
    <View style={styles.center}>
      <Text style={styles.stateIcon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      <Pressable style={styles.primary} onPress={onPrimary}>
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </Pressable>
      {secondaryLabel && (
        <Pressable style={styles.secondary} onPress={onSecondary}>
          <Text style={styles.primaryText}>{secondaryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#14142b' },
  container: { padding: 20, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700', textAlign: 'center', marginVertical: 12 },
  label: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 8 },
  muted: { color: '#a0a0c0', fontSize: 16 },
  error: { color: '#ff6b6b', fontSize: 16, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#26264a' },
  chipActive: { backgroundColor: '#6c5ce7' },
  chipText: { color: '#fff' },
  primary: { backgroundColor: '#6c5ce7', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  secondary: { backgroundColor: '#26264a', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { color: '#fff', fontSize: 24, fontWeight: '700' },
  category: { color: '#a29bfe', textAlign: 'center' },
  question: { color: '#fff', fontSize: 22, fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  answer: { backgroundColor: '#26264a', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  answerText: { color: '#fff', fontSize: 17, textAlign: 'center' },
  correct: { borderColor: '#00b894', backgroundColor: '#0a4d3f' },
  wrong: { borderColor: '#ff6b6b', backgroundColor: '#5a2230' },
  stateIcon: { fontSize: 56 },
  stateMessage: { color: '#a0a0c0', fontSize: 16, textAlign: 'center' },
  score: { color: '#fff', fontSize: 56, fontWeight: '800' },
});

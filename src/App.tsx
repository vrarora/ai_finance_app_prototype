import { useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Check,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Goal,
  Home,
  Landmark,
  Mic,
  ReceiptText,
  Signal,
  Sparkles,
  Square,
  Ellipsis,
  UserCircle2,
  Utensils,
  BatteryFull,
  WalletCards,
  Wifi,
  X,
} from 'lucide-react';
import SparklesIcon from './components/sparkles/SparklesIcon';
import type { AnimatedIconHandle } from './components/sparkles/types';

type Screen = 'home' | 'advice' | 'adviceChat';
type TopLevelMode = 'presentation' | 'prototype';

const HOME_FINANCIALS = {
  monthlyBudget: 55000,
  spentSoFar: 40600,
  projectedMonthEndSpend: 60300,
  daysLeft: 10,
  monthlyIncome: 88000,
} as const;

const HOME_DERIVED = {
  budgetUsedPercent: (HOME_FINANCIALS.spentSoFar / HOME_FINANCIALS.monthlyBudget) * 100,
  remainingBudget: HOME_FINANCIALS.monthlyBudget - HOME_FINANCIALS.spentSoFar,
  projectedOverspend: HOME_FINANCIALS.projectedMonthEndSpend - HOME_FINANCIALS.monthlyBudget,
  projectedOverspendPercent: ((HOME_FINANCIALS.projectedMonthEndSpend - HOME_FINANCIALS.monthlyBudget) / HOME_FINANCIALS.monthlyBudget) * 100,
  safeDailySpend: (HOME_FINANCIALS.monthlyBudget - HOME_FINANCIALS.spentSoFar) / HOME_FINANCIALS.daysLeft,
  currentRemainingPace: (HOME_FINANCIALS.projectedMonthEndSpend - HOME_FINANCIALS.spentSoFar) / HOME_FINANCIALS.daysLeft,
  dailyReductionNeeded:
    ((HOME_FINANCIALS.projectedMonthEndSpend - HOME_FINANCIALS.spentSoFar) / HOME_FINANCIALS.daysLeft)
    - ((HOME_FINANCIALS.monthlyBudget - HOME_FINANCIALS.spentSoFar) / HOME_FINANCIALS.daysLeft),
} as const;

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatInrCompact = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
};

const VOICE_BAR_COUNT = 26;
const VOICE_BAR_MIN_HEIGHT = 6;
const VOICE_BAR_MAX_HEIGHT = 24;
const VOICE_ACTIVITY_FLOOR = 0.015;
const VOICE_ACTIVITY_CEILING = 0.16;
const VOICE_ACTIVITY_THRESHOLD = 0.085;
const VOICE_ACTIVITY_HOLD_MS = 180;
const VOICE_BAR_STREAM_INTERVAL_MS = 88;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeVoiceLevel = (value: number, floor: number, ceiling: number) =>
  clampNumber((value - floor) / (ceiling - floor), 0, 1);

const createVoiceBars = () =>
  Array.from({ length: VOICE_BAR_COUNT }, () => 0);

const spendingProjectionTrend = [
  { day: 'May 03', actual: 8200, predicted: null },
  { day: 'May 08', actual: 14100, predicted: null },
  { day: 'May 12', actual: 19800, predicted: null },
  { day: 'May 16', actual: 24700, predicted: null },
  { day: 'May 20', actual: HOME_FINANCIALS.spentSoFar, predicted: HOME_FINANCIALS.spentSoFar },
  { day: 'May 24', actual: null, predicted: 49200 },
  { day: 'May 29', actual: null, predicted: HOME_FINANCIALS.projectedMonthEndSpend },
];

const SPENDING_PREDICTION_POINTS = spendingProjectionTrend
  .map((item) => item.predicted)
  .filter((value): value is number => value !== null);
const SPENDING_ACTUAL_POINTS = spendingProjectionTrend
  .map((item) => item.actual)
  .filter((value): value is number => value !== null);
const SPENDING_CHART_DOMAIN_MAX = Math.max(
  65000,
  Math.ceil((Math.max(...SPENDING_PREDICTION_POINTS, ...SPENDING_ACTUAL_POINTS, HOME_FINANCIALS.monthlyBudget) * 1.04) / 1000) * 1000,
);
const SPENDING_LATEST_ACTUAL_DAY = (() => {
  for (let index = spendingProjectionTrend.length - 1; index >= 0; index -= 1) {
    if (spendingProjectionTrend[index].actual !== null) {
      return spendingProjectionTrend[index]?.day ?? null;
    }
  }
  return null;
})();
const SPENDING_Y_TICKS = [0, HOME_FINANCIALS.monthlyBudget, 65000];

const transactions = [
  { icon: Utensils, label: 'Zomato + Swiggy', meta: '18 orders this month · Higher than usual', amount: -12800, tone: 'ochre' },
  { icon: CreditCard, label: 'Netflix, Spotify, Cult', meta: '5 recurring charges · Review this week', amount: -4200, tone: 'coral' },
  { icon: Landmark, label: 'Salary credited', meta: 'HDFC Bank UPI · Buffer restored', amount: HOME_FINANCIALS.monthlyIncome, tone: 'green' },
];

const highlightedCategories = [
  {
    name: 'Food & dining',
    subtext: '18 orders this month',
    value: '₹12,800',
    context: '32% above usual',
    color: '#efb356',
    railColor: '#f7e8cf',
    fillPercent: 72,
    icon: Utensils,
  },
  {
    name: 'Subscriptions',
    subtext: '5 recurring charges',
    value: '₹4,200',
    context: 'Review this week',
    color: '#ff7a55',
    railColor: '#ffe8e1',
    fillPercent: 56,
    icon: CreditCard,
  },
  {
    name: 'Cabs & commute',
    subtext: 'Weekend rides increased',
    value: '₹5,200',
    context: '18% above usual',
    color: '#6ca9d8',
    railColor: '#e3eff8',
    fillPercent: 48,
    icon: Landmark,
  },
] as const;

const advicePrompts = [
  'Should I start a will or a trust?',
  'What do I spend on food?',
  'How is my emergency fund looking?',
  'Can I afford a vacation?',
  "What's my cash flow trend?",
  'How much should I invest this month?',
  'Can I increase SIPs safely?',
  'How much rent can I afford?',
  'What can I cut this week?',
  'Should I prepay my card bill?',
  'How is my savings rate trending?',
  'Can I plan a debt payoff schedule?',
];

const planCards = [
  {
    label: 'Emergency fund',
    title: 'Analyze your accounts to build a tailored emergency fund with a detailed plan to reach your target fund amount.',
  },
  {
    label: 'Retirement',
    title: 'See how a small SIP increase now changes your retirement runway and monthly confidence later.',
  },
];

const recommendationItems = [
  { icon: ChartPie, label: 'Increase monthly savings by ₹6,000' },
  { icon: ReceiptText, label: 'Build an estate plan' },
];

const chatHistory = [
  { icon: WalletCards, label: 'What do I spend on dining?' },
  { icon: Home, label: 'Can I afford a home?' },
];

function SpendingChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { actual: number | null; predicted: number | null } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const isAiPrediction = point.actual === null && point.predicted !== null;
  const value = isAiPrediction ? point.predicted : (point.actual ?? point.predicted);
  if (value === null) return null;

  return (
    <div className={`chart-tooltip ${isAiPrediction ? 'is-ai' : ''}`}>
      {isAiPrediction ? (
        <strong className="chart-tooltip__ai-heading">
          <Sparkles size={12} />
          PULSE Prediction
        </strong>
      ) : (
        <span>{label}</span>
      )}
      <strong>{formatInr(value)}</strong>
    </div>
  );
}

function MonthlySpendCard({
  chartIdPrefix,
  onPlanClick,
  showInsight = true,
}: {
  chartIdPrefix: string;
  onPlanClick?: () => void;
  showInsight?: boolean;
}) {
  const budgetGoal = HOME_FINANCIALS.monthlyBudget;

  return (
    <section className="spending-fold">
      <div className="spending-fold__header">
        <span className="eyebrow">Monthly spend so far</span>
      </div>
      <div className="spending-fold__separator" aria-hidden="true" />
      <h2>{formatInr(HOME_FINANCIALS.spentSoFar)}</h2>
      <p className="spending-fold__subtext">Spending is accelerating after mid-month.</p>
      <div className="spending-fold__chart" aria-label="Spending versus AI projection">
        <ResponsiveContainer width="100%" height={248}>
          <AreaChart data={spendingProjectionTrend} margin={{ top: 20, right: 0, left: 0, bottom: 16 }}>
            <defs>
              <linearGradient id={`${chartIdPrefix}-projection-gradient`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f0a08d" />
                <stop offset="100%" stopColor="#f0a08d" />
              </linearGradient>
              <linearGradient id={`${chartIdPrefix}-projection-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0a08d" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f0a08d" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`${chartIdPrefix}-actual-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5d63" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#ff5d63" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6f6a75' }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6f6a75' }}
              domain={[0, SPENDING_CHART_DOMAIN_MAX]}
              ticks={SPENDING_Y_TICKS}
              tickFormatter={(value) => formatInrCompact(Number(value))}
              width={44}
            />
            <Tooltip cursor={false} content={<SpendingChartTooltip />} wrapperStyle={{ outline: 'none' }} />
            <ReferenceLine
              y={budgetGoal}
              stroke="transparent"
              label={({ viewBox }) => {
                if (!viewBox) return null;
                const label = `${formatInr(budgetGoal)} Budget`;
                const left = (viewBox as { x: number }).x;
                const y = (viewBox as { y: number }).y;
                const width = (viewBox as { width: number }).width;
                const pillWidth = 118;
                const lineStart = left + pillWidth + 6;
                const lineEnd = left + width;
                return (
                  <g>
                    <line
                      x1={lineStart}
                      x2={lineEnd}
                      y1={y}
                      y2={y}
                      stroke="#8b8794"
                      strokeDasharray="6 8"
                      strokeWidth={1.5}
                    />
                    <g transform={`translate(${left + 2}, ${y - 12})`}>
                      <rect width={pillWidth} height={24} rx={7} fill="#e8e6ed" />
                      <text x={pillWidth / 2} y={16} textAnchor="middle" fill="#686273" fontSize={11} fontWeight={600}>
                        {label}
                      </text>
                    </g>
                  </g>
                );
              }}
            />
            <Area
              type="linear"
              dataKey="predicted"
              stroke={`url(#${chartIdPrefix}-projection-gradient)`}
              strokeWidth={3}
              strokeDasharray="5 7"
              fill={`url(#${chartIdPrefix}-projection-fill)`}
            />
            <Area
              type="linear"
              dataKey="actual"
              stroke="#ff5d63"
              strokeWidth={4}
              fill={`url(#${chartIdPrefix}-actual-fill)`}
              dot={(props: { cx?: number; cy?: number; payload?: { day?: string } }) => {
                if (props.payload?.day !== SPENDING_LATEST_ACTUAL_DAY || props.cx === undefined || props.cy === undefined) {
                  return null;
                }

                return (
                  <g className="chart-dot-svg" transform={`translate(${props.cx}, ${props.cy})`} aria-hidden="true">
                    <circle className="chart-dot-svg__pulse" r="17">
                      <animate attributeName="r" values="11;17;11" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.75;0.2;0.75" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                    <circle className="chart-dot-svg__core" r="9" />
                  </g>
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="spending-fold__legend" aria-label="Spending chart legend">
        <span><i className="legend-line solid-red" />Spent so far</span>
        <span><i className="legend-line dotted-projection" />Projected</span>
        <span><i className="legend-line dashed-budget" />Budget</span>
      </div>
      {showInsight && (
        <section className="spending-insight-card" aria-label="Pulse spend insight">
          <h3 className="spending-insight-card__title">
            <Sparkles size={14} />
            PULSE CHECK
          </h3>
          <p className="spending-ai-text">If you keep spending like this, you are projected to spend ₹5,300 over your budget.</p>
          <button className="alert-action" type="button" onClick={onPlanClick} aria-label="Create a plan with Pulse">
            <span>CREATE A PLAN WITH PULSE</span>
            <ChevronRight size={18} />
          </button>
        </section>
      )}
    </section>
  );
}

function ConversationPlanChartPreview() {
  const chartWeeks = ['W1', 'W2', 'W3', 'W4'];
  const currentPaceSeries = [40600, 48000, 54800, HOME_FINANCIALS.projectedMonthEndSpend];
  const planSeries = [40600, 46800, 51200, HOME_FINANCIALS.monthlyBudget];
  const budgetLimit = HOME_FINANCIALS.monthlyBudget;
  const chartMin = 38000;
  const chartMax = 62000;
  const chartHeight = 144;
  const chartWidth = 300;
  const chartPadding = { top: 10, right: 10, bottom: 24, left: 10 };
  const drawableWidth = chartWidth - chartPadding.left - chartPadding.right;
  const drawableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const xStep = drawableWidth / (chartWeeks.length - 1);
  const toChartY = (value: number) => {
    const normalized = (value - chartMin) / (chartMax - chartMin);
    return chartPadding.top + drawableHeight - (normalized * drawableHeight);
  };
  const buildPolylinePoints = (values: number[]) =>
    values
      .map((value, index) => `${chartPadding.left + (index * xStep)},${toChartY(value)}`)
      .join(' ');
  const buildAreaPath = (values: number[]) => {
    const chartBaseY = chartPadding.top + drawableHeight;
    const linePoints = values.map((value, index) => `${chartPadding.left + (index * xStep)},${toChartY(value)}`);
    const startX = chartPadding.left;
    const endX = chartPadding.left + ((values.length - 1) * xStep);
    return `M ${startX} ${chartBaseY} L ${linePoints.join(' L ')} L ${endX} ${chartBaseY} Z`;
  };

  const currentLinePoints = buildPolylinePoints(currentPaceSeries);
  const planLinePoints = buildPolylinePoints(planSeries);
  const currentAreaPath = buildAreaPath(currentPaceSeries);
  const planAreaPath = buildAreaPath(planSeries);
  const budgetLineY = toChartY(budgetLimit);

  return (
    <>
      <div className="chat-plan-card__chart">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} role="img" aria-label="Budget recovery projection chart">
          <defs>
            <linearGradient id="presentationCurrentPaceAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef8c6a" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ef8c6a" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="presentationPulsePlanAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f6b64" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#0f6b64" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path d={currentAreaPath} fill="url(#presentationCurrentPaceAreaFill)" />
          <path d={planAreaPath} fill="url(#presentationPulsePlanAreaFill)" />
          <line
            x1={chartPadding.left + 92}
            x2={chartPadding.left + drawableWidth}
            y1={budgetLineY}
            y2={budgetLineY}
            stroke="#8f889a"
            strokeDasharray="4 5"
            strokeWidth="1.5"
          />
          <g transform={`translate(${chartPadding.left + 2}, ${budgetLineY - 10})`}>
            <rect width={88} height={20} rx={7} fill="#e8e6ed" />
            <text x={44} y={14} textAnchor="middle" fill="#686273" fontSize={10} fontWeight={700}>
              {formatInr(budgetLimit)} Budget
            </text>
          </g>
          <polyline fill="none" stroke="#ef8c6a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={currentLinePoints} />
          <polyline fill="none" stroke="#0f6b64" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={planLinePoints} />
          {chartWeeks.map((week, index) => (
            <text
              key={week}
              x={chartPadding.left + (index * xStep)}
              y={chartHeight - 4}
              textAnchor="middle"
              fill="#756f7d"
              fontSize="10"
              fontWeight="600"
            >
              {week}
            </text>
          ))}
        </svg>
      </div>
      <div className="chat-plan-card__legend" aria-hidden="true">
        <span><i className="legend-dot current" />Current pace</span>
        <span><i className="legend-dot plan" />With Pulse plan</span>
        <span><i className="legend-dot limit" />Budget limit</span>
      </div>
    </>
  );
}

function BudgetBreakdownCard({ showInsightCta = true }: { showInsightCta?: boolean }) {
  const budgetTotal = HOME_FINANCIALS.monthlyBudget;
  const budgetSpent = HOME_FINANCIALS.spentSoFar;
  const budgetUsed = HOME_DERIVED.budgetUsedPercent;

  return (
    <section className="card budget-card">
      <div className="section-heading bordered stacked">
        <span className="eyebrow">Budget Breakdown</span>
      </div>
      <div className="budget-summary-row">
        <h3>Monthly budget used</h3>
        <p>
          {formatInr(budgetSpent)} of {formatInr(budgetTotal)}
        </p>
      </div>
      <div className="budget-progress-row">
        <div className="budget-progress-line" role="presentation">
          <ResponsiveContainer width="100%" height={19}>
            <BarChart data={[{ name: 'Budget', used: Math.min(budgetUsed, 100) }]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="0%">
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" hide />
              <Bar dataKey="used" fill="#74a243" radius={[2, 2, 2, 2]} background={{ fill: '#eff3ec', radius: 2 }} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="budget-progress-value">{budgetUsed.toFixed(1)}% used</div>
      </div>
      <div className="budget-breakdown-list">
        {highlightedCategories.map((item) => (
          <article className="budget-line-item" key={item.name}>
            <div className="budget-line-item__head">
              <span className="budget-line-item__icon" style={{ color: '#ffffff', background: item.color }}>
                <item.icon size={18} />
              </span>
              <div className="budget-line-item__copy">
                <h4>{item.name}</h4>
                <p>{item.subtext}</p>
              </div>
              <strong className="budget-line-item__value">{item.value}</strong>
            </div>
            <div className="budget-line-item__meter">
              <div className="budget-line-item__track">
                <ResponsiveContainer width="100%" height={6}>
                  <BarChart data={[{ name: item.name, value: item.fillPercent }]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="0%">
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Bar dataKey="value" fill={item.color} radius={[2, 2, 2, 2]} background={{ fill: item.railColor, radius: 2 }} isAnimationActive animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <strong>{item.context}</strong>
            </div>
          </article>
        ))}
      </div>
      <div className="budget-insight-card" aria-label="Budget insight">
        <h3 className="budget-insight-card__title">
          <Sparkles size={14} />
          PULSE CHECK
        </h3>
        <p>Dining, subscriptions, and cabs are creating a projected ₹5,300 overspend risk.</p>
        {showInsightCta && (
          <div className="budget-insight-card__actions">
            <button className="safe-spend-insight__cta" type="button">
              ASK PULSE TO EXPLAIN
            </button>
          </div>
        )}
      </div>
      <button className="transaction-see-all" type="button">See all</button>
    </section>
  );
}

function TransactionsCard({ onPlanClick, showPlanCta = true }: { onPlanClick?: () => void; showPlanCta?: boolean }) {
  return (
    <section className="card transactions-card">
      <div className="section-heading bordered">
        <span className="eyebrow">Transactions behind this</span>
      </div>
      {transactions.map((item) => (
        <div className="transaction-row" key={item.label}>
          <span className={`transaction-icon ${item.tone}`}>
            <item.icon size={18} />
          </span>
          <div>
            <h3>{item.label}</h3>
            <p>{item.meta}</p>
          </div>
          <strong className={item.amount > 0 ? 'positive' : ''}>{item.amount > 0 ? '+' : ''}{formatInr(item.amount)}</strong>
        </div>
      ))}
      <div className="safe-spend-insight" role="region" aria-label="Safe to spend summary">
        <h3 className="safe-spend-insight__title">
          <Sparkles size={14} />
          PULSE CHECK
        </h3>
        <div className="safe-spend-insight__copy">
          <p>You can spend about ₹1,440/day to stay within budget till month-end.</p>
        </div>
        {showPlanCta && (
          <div className="safe-spend-insight__actions">
            <button className="safe-spend-insight__cta" type="button" onClick={onPlanClick}>
              CREATE A PLAN WITH PULSE
            </button>
          </div>
        )}
      </div>
      <button className="transaction-see-all" type="button">See all</button>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState<TopLevelMode>('presentation');

  return (
    <main className="stage">
      <div className="app-shell">
        <div className="mode-tabs" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'presentation'}
            className={`mode-tab chat-plan-card__tab ${mode === 'presentation' ? 'is-active' : ''}`}
            onClick={() => setMode('presentation')}
          >
            Presentation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'prototype'}
            className={`mode-tab chat-plan-card__tab ${mode === 'prototype' ? 'is-active' : ''}`}
            onClick={() => setMode('prototype')}
          >
            Prototype
          </button>
        </div>
        <section className="phone" aria-label="Pulse mobile app viewport">
          <StatusBar />
          {mode === 'presentation' ? (
            <PresentationView switchToPrototype={() => setMode('prototype')} />
          ) : (
            <PrototypeView />
          )}
        </section>
      </div>
    </main>
  );
}

function PrototypeView() {
  const [screen, setScreen] = useState<Screen>('home');
  const [adviceChatPrompt, setAdviceChatPrompt] = useState('');

  return (
    <>
      {screen === 'home' && <HomeScreen openAdvice={() => setScreen('advice')} />}
      {screen === 'advice' && (
        <AdviceScreen
          openChatFromAdvice={(prompt) => {
            setAdviceChatPrompt(prompt);
            setScreen('adviceChat');
          }}
        />
      )}
      {screen === 'adviceChat' && (
        <AdviceChatScreen
          initialPrompt={adviceChatPrompt || 'Help me stay within budget this month and avoid overspending.'}
          goBack={() => setScreen('advice')}
        />
      )}
      {screen !== 'adviceChat' && <BottomNav screen={screen} setScreen={setScreen} />}
    </>
  );
}

function PresentationView({ switchToPrototype }: { switchToPrototype: () => void }) {
  const slides = [
    {
      label: 'DESIGN BRIEF',
      title: 'AI-powered personal finance app',
      body: [
        'Create an AI-powered personal finance mobile app where users can manage their finances and converse with AI to understand their financial wellbeing, spending patterns, and goals.',
        <>The expected output was two mobile screens: a <strong>home</strong> screen and a <strong>conversational</strong> screen with interactive data visualization.</>,
      ],
      visual: (
        <div className="presentation-visual mini-phone-grid">
          <div className="mini-phone-slot">
            <div className="mini-phone-tile mini-phone-tile--home" aria-label="Home screen skeleton">
              <div className="mini-phone-skel__header" />
              <div className="mini-phone-skel__cards">
                <div className="mini-phone-skel__card is-lg" />
                <div className="mini-phone-skel__card" />
                <div className="mini-phone-skel__card" />
              </div>
            </div>
            <span className="mini-phone-label">Home</span>
          </div>
          <div className="mini-phone-slot">
            <div className="mini-phone-tile mini-phone-tile--chat" aria-label="Chat screen skeleton">
              <div className="mini-phone-skel__header" />
              <div className="mini-phone-skel__bubble is-user" />
              <div className="mini-phone-skel__bubble is-ai" />
              <div className="mini-phone-skel__bubble is-ai is-wide" />
              <div className="mini-phone-skel__composer" />
            </div>
            <span className="mini-phone-label">AI Conversation</span>
          </div>
        </div>
      ),
    },
    {
      label: 'USER LENS',
      title: 'A financially anxious young earner',
      body: [
        'I approached the brief through a young salaried user who wants quick answers before detailed analysis.',
        'They want to know: Am I on track? What changed? What should I do next?',
      ],
      visual: (
        <div className="presentation-visual">
          <div className="user-lens-card">
            <p className="user-lens-row"><UserCircle2 size={14} />Young salaried user</p>
            <p className="user-lens-row"><WalletCards size={14} />Monthly income cycle</p>
            <p className="user-lens-row"><ChartPie size={14} />Concerned about overspending before month-end</p>
            <p className="user-lens-row"><Sparkles size={14} />Needs clarity and a next step</p>
          </div>
        </div>
      ),
    },
    {
      label: 'PRODUCT NARRATIVE',
      title: 'Understand the month, then act',
      body: [
        'The home screen follows the way a user checks their money.',
        'First, they see how much they have spent and whether they are likely to go over budget.',
        'Then they see where the money is going through category breakdowns and recent transactions.',
        'Once the situation is clear, Pulse helps them create a recovery plan with AI.',
      ],
      visual: (
        <div className="presentation-visual story-flow">
          <div>
            <strong><ChartPie size={14} />Month status</strong>
            <span>₹40,600 spent so far</span>
            <span>Projected ₹5,300 over budget</span>
          </div>
          <div>
            <strong><Landmark size={14} />Where money went</strong>
            <span>Food, subscriptions, cabs</span>
          </div>
          <div>
            <strong><ReceiptText size={14} />Recent transactions</strong>
            <span>Zomato, subscriptions, salary</span>
          </div>
          <div>
            <strong><Sparkles size={14} />Plan with Pulse</strong>
            <span>Create a recovery plan</span>
          </div>
        </div>
      ),
    },
    {
      label: 'MAIN SIGNAL',
      title: 'Start with monthly spend',
      body: [
        'The first card shows ₹40,600 spent so far against a ₹55,000 monthly budget.',
        'It also shows a projected month-end spend of ₹60,300. This makes the risk visible before the user reads the explanation.',
      ],
      visual: (
        <MonthlySpendCard chartIdPrefix="presentation-spend" onPlanClick={switchToPrototype} showInsight={false} />
      ),
    },
    {
      label: 'PULSE CHECK',
      title: 'Turning data into plain language',
      body: [
        'Pulse Check translates the chart into a clear explanation.',
        'It tells the user that they are projected to spend ₹5,300 over your ₹55,000 budget, and gives them a direct way to create a plan with Pulse.',
      ],
      visual: (
        <section className="spending-insight-card" aria-label="Pulse spend insight">
          <h3 className="spending-insight-card__title">
            <Sparkles size={14} />
            PULSE CHECK
          </h3>
          <p className="spending-ai-text">If you keep spending like this, you are projected to spend ₹5,300 over your budget.</p>
          <button className="alert-action" type="button" onClick={switchToPrototype} aria-label="Create a plan with Pulse">
            <span>CREATE A PLAN WITH PULSE</span>
            <ChevronRight size={18} />
          </button>
        </section>
      ),
    },
    {
      label: 'EVIDENCE',
      title: 'Make the insight traceable',
      body: [
        'Budget Breakdown and Transactions Behind This make the warning easier to trust.',
        'The breakdown shows categories like food and dining, subscriptions, and cabs. The transaction rows show examples like 18 food orders and 5 recurring charges.',
      ],
      visual: (
        <div className="presentation-visual presentation-evidence-stack">
          <BudgetBreakdownCard showInsightCta={false} />
          <TransactionsCard onPlanClick={switchToPrototype} showPlanCta={false} />
        </div>
      ),
    },
    {
      label: 'VISUAL DIRECTION',
      title: 'Warm, quiet, and finance-led',
      body: [
        'I kept the interface warm and quiet because the user is dealing with money anxiety.',
        'Off-white surfaces reduce visual harshness. Deep ink gives the app weight. Coral is used for spend risk. Green is reserved for recovery and safe direction. Muted borders keep the cards structured without making the screen feel heavy.',
      ],
      visual: (
        <div className="presentation-visual palette-grid">
          <span className="palette-swatch"><i style={{ background: '#17141d' }} />Ink #17141d</span>
          <span className="palette-swatch"><i style={{ background: '#f7f4ee' }} />Off-white shell</span>
          <span className="palette-swatch"><i style={{ background: '#ff7a55' }} />Coral risk</span>
          <span className="palette-swatch"><i style={{ background: '#08705c' }} />Green recovery</span>
          <span className="palette-swatch"><i style={{ background: '#e9e4dc' }} />Muted border</span>
        </div>
      ),
    },
    {
      label: 'CONVERSATION MODE',
      title: 'From diagnosis to planning',
      body: [
        'The conversational screen takes the user from understanding the risk to comparing recovery options.',
        'Pulse shows conservative, balanced, and flexible plans so the user can choose how strict they want the recovery plan to be.',
        'Switch to Prototype to try the flow.',
      ],
      visual: (
        <div className="presentation-visual conversation-mini">
          <strong>Budget Plan with Pulse</strong>
          <div className="conversation-mini__tabs"><span>Conservative</span><span>Balanced</span><span>Flexible</span></div>
          <ConversationPlanChartPreview />
          <div className="conversation-mini__chips"><span>Food delivery</span><span>Subscriptions</span><span>Cabs</span></div>
        </div>
      ),
    },
  ] as const;
  const [slideIndex, setSlideIndex] = useState(0);
  const isLast = slideIndex === slides.length - 1;
  const slide = slides[slideIndex];

  return (
    <div className="screen presentation-screen">
      <header className="presentation-hero">
        <h1>Pulse</h1>
        <p>Design rationale</p>
        <span className="presentation-step">{slideIndex + 1} / {slides.length}</span>
      </header>
      <div className="presentation-slide-shell">
        <article className="presentation-slide presentation-slide-content">
          <span className="presentation-label">{slide.label}</span>
          <h2 className="presentation-title">{slide.title}</h2>
          {slide.body.map((copy, index) => (
            <p className="presentation-copy" key={`${slide.label}-${index}`}>{copy}</p>
          ))}
          {slide.visual}
          {isLast && (
            <button type="button" className="presentation-switch-button" onClick={switchToPrototype}>
              Switch to Prototype
            </button>
          )}
        </article>
      </div>
      <div className="presentation-nav" aria-label="Presentation navigation">
        <button
          type="button"
          className="presentation-nav__button"
          onClick={() => setSlideIndex((value) => Math.max(0, value - 1))}
          disabled={slideIndex === 0}
        >
          Back
        </button>
        <div className="presentation-dots" aria-hidden="true">
          {slides.map((item, index) => (
            <span key={item.label} className={`presentation-dot ${index === slideIndex ? 'is-active' : ''}`} />
          ))}
        </div>
        {isLast ? (
          <button type="button" className="presentation-nav__button is-cta" onClick={switchToPrototype}>
            Prototype
          </button>
        ) : (
          <button
            type="button"
            className="presentation-nav__button is-cta"
            onClick={() => setSlideIndex((value) => Math.min(slides.length - 1, value + 1))}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <span className="status-bar__time">9:41</span>
      <div className="status-bar__icons">
        <Signal className="status-bar__signal" strokeWidth={2.6} />
        <Wifi className="status-bar__wifi" strokeWidth={2.6} />
        <BatteryFull className="status-bar__battery" strokeWidth={2.6} />
      </div>
    </div>
  );
}

function PulseLogo() {
  return (
    <svg className="brand-mark__svg" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <path
        d="M10 74H34L46 52L58 84L73 26L89 104L103 56L114 74H118"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M93 28L95.8 35.2L103 38L95.8 40.8L93 48L90.2 40.8L83 38L90.2 35.2L93 28Z" fill="currentColor" />
      <path d="M109 61L111 66L116 68L111 70L109 75L107 70L102 68L107 66L109 61Z" fill="currentColor" />
      <path d="M100 15L101.6 19.4L106 21L101.6 22.6L100 27L98.4 22.6L94 21L98.4 19.4L100 15Z" fill="currentColor" />
    </svg>
  );
}

function Header({
  title,
  action,
  leading,
  titleVariant = 'default',
}: {
  title: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
  titleVariant?: 'default' | 'chat';
}) {
  return (
    <header className="app-header">
      <div className="brand-mark" aria-hidden={leading ? undefined : true}>
        {leading ?? <PulseLogo />}
      </div>
      <h1 className={titleVariant === 'chat' ? 'app-header__title app-header__title--chat' : 'app-header__title'}>
        {title}
      </h1>
      <div className="header-action">{action}</div>
    </header>
  );
}

function VoiceActivityTrack({ voiceBars }: { voiceBars: number[] }) {
  return (
    <div className="voice-input__track" aria-hidden="true">
      {voiceBars.map((height, index) => {
        const isBar = height > 0;
        return (
          <span
            key={`voice-slot-${index}`}
            className={`voice-input__slot ${isBar ? 'is-bar' : 'is-dot'}`}
            style={isBar ? { height: `${height}px` } : undefined}
          />
        );
      })}
    </div>
  );
}

function HomeScreen({ openAdvice }: { openAdvice: () => void }) {
  const [isChatSheetOpen, setIsChatSheetOpen] = useState(false);
  const [isChatSheetVisible, setIsChatSheetVisible] = useState(false);
  const [isChatSheetClosing, setIsChatSheetClosing] = useState(false);
  const [chatPhase, setChatPhase] = useState<'idle' | 'loading' | 'typing' | 'done'>('idle');
  const [generatedAnswer, setGeneratedAnswer] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [planPhase, setPlanPhase] = useState<'hidden' | 'loading' | 'ready'>('hidden');
  const [selectedScenarioId, setSelectedScenarioId] = useState<'conservative' | 'balanced' | 'flexible'>('balanced');
  const [animatedPlanSeries, setAnimatedPlanSeries] = useState<number[]>([9000, 19800, 30800, 42700]);
  const [activeImpactIds, setActiveImpactIds] = useState<string[]>([]);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voicePhase, setVoicePhase] = useState<'dots' | 'waves'>('dots');
  const [voiceBars, setVoiceBars] = useState<number[]>(createVoiceBars);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatSparkleRef = useRef<AnimatedIconHandle>(null);
  const chatInputSparkleRef = useRef<AnimatedIconHandle>(null);
  const closeTimerRef = useRef<number | null>(null);
  const loadingTimerRef = useRef<number | null>(null);
  const typingFrameRef = useRef<number | null>(null);
  const planRevealTimerRef = useRef<number | null>(null);
  const scenarioAnimationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef('');
  const isVoiceConfirmingRef = useRef(false);
  const isVoiceSessionActiveRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceMeterFrameRef = useRef<number | null>(null);
  const voiceActivityHoldUntilRef = useRef(0);
  const voiceBarSampleAtRef = useRef(0);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const budgetTotal = HOME_FINANCIALS.monthlyBudget;
  const budgetSpent = HOME_FINANCIALS.spentSoFar;
  const budgetUsed = HOME_DERIVED.budgetUsedPercent;
  const initialPrompt = 'Help me stay within budget this month and avoid overspending.';
  const aiResponsesByPrompt: Record<string, string> = {
    [initialPrompt]: 'You are projected to overshoot by ₹5,300 at your current pace. Start by keeping daily spending near ₹1,440, pausing one subscription, and reducing food delivery this week. That closes the projected ₹5,300 gap.',
    'What should I cut first this week?': 'Start with the highest swing categories first: reduce food delivery by about ₹2,400 and pause one subscription worth roughly ₹1,200. Combined with tighter cab usage, this closes most of the ₹5,300 projected gap.',
    'Show a stricter ₹1,440/day plan': 'At this pace you are trending near ₹1,970/day for the remaining days. Bringing that down toward ₹1,440/day keeps you on track for budget by month-end.',
  };
  const diveDeeperPrompts = [
    'What should I cut first this week?',
    'Show a stricter ₹1,440/day plan',
  ];
  const recoveryScenarios: Array<{
    id: 'conservative' | 'balanced' | 'flexible';
    label: string;
    dailyGuardrail: number;
    outcome: string;
    projectedOverspend: number;
    description: string;
    planSeries: number[];
  }> = [
    {
      id: 'conservative',
      label: 'Conservative',
      dailyGuardrail: 1400,
      outcome: '₹2,400 under budget',
      projectedOverspend: -2400,
      description: 'Strongest cuts, fastest recovery.',
      planSeries: [40600, 45500, 49200, 52600],
    },
    {
      id: 'balanced',
      label: 'Balanced',
      dailyGuardrail: 1440,
      outcome: 'On budget',
      projectedOverspend: 0,
      description: 'Most realistic plan to avoid overspending.',
      planSeries: [40600, 46800, 51200, 55000],
    },
    {
      id: 'flexible',
      label: 'Flexible',
      dailyGuardrail: 1650,
      outcome: '₹2,100 over budget',
      projectedOverspend: 2100,
      description: 'Easier to follow, but some overspend remains.',
      planSeries: [40600, 47600, 52800, 57100],
    },
  ];
  const selectedScenario = recoveryScenarios.find((item) => item.id === selectedScenarioId) ?? recoveryScenarios[1];
  const impactChips = [
    { id: 'food', label: 'Food delivery -₹2,400', savings: 2400 },
    { id: 'subscriptions', label: 'Subscriptions -₹1,200', savings: 1200 },
    { id: 'cabs', label: 'Cabs -₹1,700', savings: 1700 },
  ];
  const selectedSavings = impactChips
    .filter((item) => activeImpactIds.includes(item.id))
    .reduce((sum, item) => sum + item.savings, 0);
  const adjustedOverspend = selectedScenario.projectedOverspend - selectedSavings;
  const adjustedOutcome = adjustedOverspend === 0
    ? 'On budget'
    : adjustedOverspend > 0
      ? `${formatInr(adjustedOverspend)} over budget`
      : `${formatInr(Math.abs(adjustedOverspend))} under budget`;
  const chartWeeks = ['W1', 'W2', 'W3', 'W4'];
  const currentPaceSeries = [40600, 48000, 54800, HOME_FINANCIALS.projectedMonthEndSpend];
  const adjustedPlanSeries = selectedScenario.planSeries.map((point, index) => {
    const progressFactor = (index + 1) / selectedScenario.planSeries.length;
    return point - (selectedSavings * progressFactor);
  });
  const budgetLimit = HOME_FINANCIALS.monthlyBudget;
  const chartMin = 38000;
  const chartMax = 62000;
  const chartHeight = 144;
  const chartWidth = 300;
  const chartPadding = { top: 10, right: 10, bottom: 24, left: 10 };
  const drawableWidth = chartWidth - chartPadding.left - chartPadding.right;
  const drawableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const xStep = drawableWidth / (chartWeeks.length - 1);
  const toChartY = (value: number) => {
    const normalized = (value - chartMin) / (chartMax - chartMin);
    return chartPadding.top + drawableHeight - (normalized * drawableHeight);
  };
  const buildPolylinePoints = (values: number[]) =>
    values
      .map((value, index) => `${chartPadding.left + (index * xStep)},${toChartY(value)}`)
      .join(' ');
  const currentLinePoints = buildPolylinePoints(currentPaceSeries);
  const planLinePoints = buildPolylinePoints(animatedPlanSeries);
  const budgetLineY = toChartY(budgetLimit);
  const chartBaseY = chartPadding.top + drawableHeight;
  const buildAreaPath = (values: number[]) => {
    const linePoints = values.map((value, index) => `${chartPadding.left + (index * xStep)},${toChartY(value)}`);
    const startX = chartPadding.left;
    const endX = chartPadding.left + ((values.length - 1) * xStep);
    return `M ${startX} ${chartBaseY} L ${linePoints.join(' L ')} L ${endX} ${chartBaseY} Z`;
  };
  const currentAreaPath = buildAreaPath(currentPaceSeries);
  const planAreaPath = buildAreaPath(animatedPlanSeries);

  useEffect(() => {
    const targetSeries = adjustedPlanSeries;
    if (scenarioAnimationFrameRef.current) {
      window.cancelAnimationFrame(scenarioAnimationFrameRef.current);
      scenarioAnimationFrameRef.current = null;
    }

    const fromSeries = [...animatedPlanSeries];
    const start = performance.now();
    const duration = 520;
    const easeInOut = (t: number) => 0.5 - (Math.cos(Math.PI * t) / 2);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = easeInOut(progress);
      const nextSeries = fromSeries.map((value, index) => {
        const target = targetSeries[index] ?? value;
        return value + ((target - value) * eased);
      });
      setAnimatedPlanSeries(nextSeries);

      if (progress < 1) {
        scenarioAnimationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      setAnimatedPlanSeries(targetSeries);
      scenarioAnimationFrameRef.current = null;
    };

    scenarioAnimationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (scenarioAnimationFrameRef.current) {
        window.cancelAnimationFrame(scenarioAnimationFrameRef.current);
        scenarioAnimationFrameRef.current = null;
      }
    };
  }, [selectedScenarioId, selectedSavings]);

  const toggleImpactChip = (chipId: string) => {
    setActiveImpactIds((previous) =>
      previous.includes(chipId) ? previous.filter((id) => id !== chipId) : [...previous, chipId],
    );
  };

  const clearChatGeneration = () => {
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (typingFrameRef.current) {
      window.cancelAnimationFrame(typingFrameRef.current);
      typingFrameRef.current = null;
    }
    if (planRevealTimerRef.current) {
      window.clearTimeout(planRevealTimerRef.current);
      planRevealTimerRef.current = null;
    }
  };

  const runAiGeneration = (prompt: string) => {
    clearChatGeneration();
    setActivePrompt(prompt);
    setChatPhase('loading');
    setGeneratedAnswer('');
    setPlanPhase('hidden');
    const aiDraftResponse = aiResponsesByPrompt[prompt] ?? aiResponsesByPrompt[initialPrompt];

    loadingTimerRef.current = window.setTimeout(() => {
      setChatPhase('typing');
      const start = performance.now();
      const duration = 6800;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - progress) ** 3;
        const length = Math.floor(eased * aiDraftResponse.length);
        setGeneratedAnswer(aiDraftResponse.slice(0, length));

        if (progress < 1) {
          typingFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        setGeneratedAnswer(aiDraftResponse);
        setChatPhase('done');
        typingFrameRef.current = null;
        setPlanPhase('loading');
        planRevealTimerRef.current = window.setTimeout(() => {
          setPlanPhase('ready');
          planRevealTimerRef.current = null;
        }, 3000);
      };

      typingFrameRef.current = window.requestAnimationFrame(tick);
      loadingTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    if (!isChatSheetOpen) return;
    runAiGeneration(initialPrompt);
  }, [isChatSheetOpen]);

  const handleDiveDeeperPrompt = (prompt: string) => {
    if (chatPhase === 'loading' || chatPhase === 'typing') return;
    setChatInputValue('');
    runAiGeneration(prompt);
  };

  useEffect(() => {
    if (!isChatSheetOpen) return;
    const focusTimer = window.setTimeout(() => {
      chatInputRef.current?.focus();
    }, 280);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [isChatSheetOpen]);

  const openChatSheet = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsChatSheetVisible(true);
    setIsChatSheetOpen(true);
    setIsChatSheetClosing(false);
    setSheetDragY(0);
    setIsSheetDragging(false);
    setDragStartY(null);
  };

  const closeChatSheet = () => {
    if (isChatSheetClosing) return;
    setIsChatSheetClosing(true);
    setSheetDragY(0);
    setIsSheetDragging(false);
    setDragStartY(null);

    closeTimerRef.current = window.setTimeout(() => {
      setIsChatSheetOpen(false);
      setIsChatSheetVisible(false);
      setIsChatSheetClosing(false);
      setChatPhase('idle');
      setGeneratedAnswer('');
      setActivePrompt('');
      setPlanPhase('hidden');
      setSelectedScenarioId('balanced');
      setAnimatedPlanSeries([40600, 46800, 51200, 55000]);
      setActiveImpactIds([]);
      setChatInputValue('');
      setIsChatInputFocused(false);
      closeTimerRef.current = null;
    }, 360);
  };
  const handleSheetDragStart = (clientY: number) => {
    if (isChatSheetClosing) return;
    setIsSheetDragging(true);
    setDragStartY(clientY);
  };

  const handleSheetDragMove = (clientY: number) => {
    if (!isSheetDragging || dragStartY === null) return;
    const delta = Math.max(0, clientY - dragStartY);
    setSheetDragY(delta);
  };

  const handleSheetDragEnd = () => {
    if (!isSheetDragging) return;
    setIsSheetDragging(false);
    setDragStartY(null);
    if (sheetDragY > 140) {
      closeChatSheet();
      return;
    }
    setSheetDragY(0);
  };

  const stopVoiceRecognition = () => {
    isVoiceConfirmingRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const stopVoiceMonitoring = () => {
    if (voiceMeterFrameRef.current) {
      window.cancelAnimationFrame(voiceMeterFrameRef.current);
      voiceMeterFrameRef.current = null;
    }
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    audioAnalyserRef.current?.disconnect();
    audioAnalyserRef.current = null;
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      void context.close().catch(() => {});
    }
    voiceActivityHoldUntilRef.current = 0;
    voiceBarSampleAtRef.current = 0;
    setVoiceBars(createVoiceBars());
    setVoicePhase('dots');
  };

  const startVoiceMonitoring = async () => {
    const AudioContextImpl =
      window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextImpl || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioContext = new AudioContextImpl();
      if (!isVoiceSessionActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close().catch(() => {});
        return false;
      }
      void audioContext.resume();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioStreamRef.current = stream;
      audioContextRef.current = audioContext;
      audioSourceRef.current = source;
      audioAnalyserRef.current = analyser;

      const timeDomainData = new Uint8Array(analyser.fftSize);
      voiceBarSampleAtRef.current = performance.now();

      const tick = () => {
        analyser.getByteTimeDomainData(timeDomainData);

        let sumSquares = 0;
        for (let index = 0; index < timeDomainData.length; index += 1) {
          const centeredSample = (timeDomainData[index] - 128) / 128;
          sumSquares += centeredSample * centeredSample;
        }

        const rms = Math.sqrt(sumSquares / timeDomainData.length);
        const speechLevel = normalizeVoiceLevel(rms, VOICE_ACTIVITY_FLOOR, VOICE_ACTIVITY_CEILING);
        const now = performance.now();

        if (speechLevel > VOICE_ACTIVITY_THRESHOLD) {
          voiceActivityHoldUntilRef.current = now + VOICE_ACTIVITY_HOLD_MS;
        }

        const showWaves = voiceActivityHoldUntilRef.current > now;
        const shapedLevel = clampNumber(speechLevel ** 0.82, 0, 1);
        const nextBarHeight = showWaves
          ? VOICE_BAR_MIN_HEIGHT + (shapedLevel * (VOICE_BAR_MAX_HEIGHT - VOICE_BAR_MIN_HEIGHT))
          : 0;

        setVoicePhase(showWaves ? 'waves' : 'dots');
        if (now >= voiceBarSampleAtRef.current) {
          voiceBarSampleAtRef.current = now + VOICE_BAR_STREAM_INTERVAL_MS;
          setVoiceBars((previous) => [
            ...previous.slice(1),
            Math.round(nextBarHeight * 10) / 10,
          ]);
        }

        voiceMeterFrameRef.current = window.requestAnimationFrame(tick);
      };

      voiceMeterFrameRef.current = window.requestAnimationFrame(tick);
      return true;
    } catch {
      stopVoiceMonitoring();
      return false;
    }
  };

  const commitVoiceTranscript = () => {
    const finalizedTranscript = voiceTranscriptRef.current.trim();
    isVoiceSessionActiveRef.current = false;
    stopVoiceMonitoring();
    setIsVoiceMode(false);
    setVoicePhase('dots');
    if (finalizedTranscript.length > 0) {
      setChatInputValue(finalizedTranscript);
    }
    window.setTimeout(() => chatInputRef.current?.focus(), 40);
  };

  const startVoiceMode = () => {
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setIsVoiceMode(false);
      setVoicePhase('dots');
      setVoiceTranscript('');
      return;
    }

    setIsVoiceMode(true);
    setVoicePhase('dots');
    setVoiceBars(createVoiceBars());
    setVoiceTranscript('');
    voiceTranscriptRef.current = '';
    isVoiceConfirmingRef.current = false;
    isVoiceSessionActiveRef.current = true;
    setIsChatInputFocused(false);
    void startVoiceMonitoring();

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-IN';

    recognition.onspeechstart = () => {
      setVoicePhase('waves');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? '';
      }
      const normalized = transcript.trim();
      if (!normalized) return;
      voiceTranscriptRef.current = normalized;
      setVoiceTranscript(normalized);
      setVoicePhase('waves');
    };

    recognition.onerror = (event: any) => {
      recognitionRef.current = null;
      if (isVoiceConfirmingRef.current) {
        isVoiceConfirmingRef.current = false;
        commitVoiceTranscript();
        return;
      }
      if (isVoiceSessionActiveRef.current && (event?.error === 'no-speech' || event?.error === 'aborted')) {
        return;
      }
      isVoiceSessionActiveRef.current = false;
      stopVoiceMonitoring();
      setIsVoiceMode(false);
      setVoicePhase('dots');
      setVoiceTranscript('');
      window.setTimeout(() => chatInputRef.current?.focus(), 40);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (isVoiceConfirmingRef.current) {
        isVoiceConfirmingRef.current = false;
        commitVoiceTranscript();
        return;
      }
      if (isVoiceSessionActiveRef.current) {
        try {
          recognition.start();
          recognitionRef.current = recognition;
          return;
        } catch {
          isVoiceSessionActiveRef.current = false;
        }
      }
      stopVoiceMonitoring();
      setIsVoiceMode(false);
      setVoicePhase('dots');
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
      setIsVoiceMode(false);
      setVoicePhase('dots');
      setVoiceTranscript('');
    }
  };

  const cancelVoiceMode = () => {
    isVoiceSessionActiveRef.current = false;
    stopVoiceRecognition();
    stopVoiceMonitoring();
    setIsVoiceMode(false);
    setVoicePhase('dots');
    setVoiceTranscript('');
    window.setTimeout(() => chatInputRef.current?.focus(), 40);
  };

  const confirmVoiceMode = () => {
    const activeRecognition = recognitionRef.current;
    if (activeRecognition) {
      isVoiceConfirmingRef.current = true;
      isVoiceSessionActiveRef.current = false;
      activeRecognition.stop();
      return;
    }
    commitVoiceTranscript();
  };

  useEffect(() => {
    return () => {
      clearChatGeneration();
      isVoiceSessionActiveRef.current = false;
      stopVoiceRecognition();
      stopVoiceMonitoring();
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (scenarioAnimationFrameRef.current) {
        window.cancelAnimationFrame(scenarioAnimationFrameRef.current);
      }
    };
  }, []);

  const hasChatInputText = chatInputValue.trim().length > 0;
  const isAiResponding = chatPhase === 'loading' || chatPhase === 'typing';
  const handleStopAiResponse = () => {
    if (!isAiResponding) return;
    clearChatGeneration();
    setChatPhase('done');
    setPlanPhase('hidden');
  };

  useEffect(() => {
    if (isAiResponding) {
      chatSparkleRef.current?.startAnimation();
      chatInputSparkleRef.current?.startAnimation();
      return;
    }
    chatSparkleRef.current?.stopAnimation();
    chatInputSparkleRef.current?.stopAnimation();
  }, [isAiResponding]);

  return (
    <div className="screen home-screen">
      <Header
        title="Pulse"
        action={
          <button className="icon-button" type="button" aria-label="Profile" onClick={openAdvice}>
            <UserCircle2 size={22} />
          </button>
        }
      />

      <div className="spending-stack reveal delay-1">
        <MonthlySpendCard chartIdPrefix="home-spend" onPlanClick={openChatSheet} />
      </div>

      <div className="budget-stack reveal delay-2">
        <BudgetBreakdownCard showInsightCta={false} />
      </div>

      <div className="reveal delay-4">
        <TransactionsCard onPlanClick={openChatSheet} showPlanCta={false} />
      </div>

      {isChatSheetVisible && (
        <div className="chat-sheet-overlay" role="dialog" aria-modal="true" aria-label="Budget planning chat sheet">
          <button
            className={`chat-sheet-backdrop ${isChatSheetClosing ? 'is-closing' : ''}`}
            type="button"
            onClick={closeChatSheet}
            aria-label="Close chat sheet"
          />
          <section
            className={`chat-sheet ${isSheetDragging ? 'is-dragging' : ''} ${isChatSheetClosing ? 'is-closing' : ''}`}
            style={sheetDragY > 0 ? { transform: `translateY(${sheetDragY}px)` } : undefined}
          >
            <div
              className="chat-sheet__drag-zone"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                handleSheetDragStart(event.clientY);
              }}
              onPointerMove={(event) => handleSheetDragMove(event.clientY)}
              onPointerUp={handleSheetDragEnd}
              onPointerCancel={handleSheetDragEnd}
            >
              <div className="chat-sheet__handle" />
            </div>
            <div className="chat-sheet__head">
              <h3>Budget Plan with Pulse</h3>
              <button type="button" onClick={closeChatSheet} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="chat-sheet__separator" aria-hidden="true" />

            <div className="chat-sheet__body">
              <div className="chat-msg chat-msg--user">
                {activePrompt || initialPrompt}
              </div>
              {(chatPhase === 'loading' || chatPhase === 'typing' || chatPhase === 'done') && (
                <div className="chat-msg chat-msg--ai">
                  <span className="chat-msg__ai-mark" aria-hidden="true">
                    <SparklesIcon ref={chatSparkleRef} size={14} />
                  </span>
                  <div className="chat-msg__ai-content">
                    {chatPhase === 'loading' ? (
                      <div className="chat-thinking" aria-hidden="true">
                        <strong>Thinking</strong>
                      </div>
                    ) : (
                      <p>{generatedAnswer}</p>
                    )}
                  </div>
                </div>
              )}

              {chatPhase === 'done' && planPhase === 'loading' && (
                <div className="chat-plan-skeleton" aria-hidden="true">
                  <span className="chat-plan-skeleton__line" />
                  <span className="chat-plan-skeleton__line short" />
                  <div className="chat-plan-skeleton__chart" />
                </div>
              )}

              {chatPhase === 'done' && planPhase === 'ready' && (
                <div className="chat-plan-card is-generating">
                  <div className="chat-plan-card__title">Budget Recovery Projection</div>
                  <div className="chat-plan-card__row">
                    <span>Current pace</span>
                    <strong>{formatInr(HOME_DERIVED.currentRemainingPace)}/day</strong>
                  </div>
                  <div className="chat-plan-card__row">
                    <span>Projected month-end spend</span>
                    <strong>{formatInr(HOME_FINANCIALS.projectedMonthEndSpend)}</strong>
                  </div>
                  <div className="chat-plan-card__row">
                    <span>Current pace outcome</span>
                    <strong>{formatInr(HOME_DERIVED.projectedOverspend)} over budget</strong>
                  </div>
                  <div className="chat-plan-card__row">
                    <span>Daily guardrail</span>
                    <strong>{formatInr(selectedScenario.dailyGuardrail)}/day</strong>
                  </div>
                  <div className="chat-plan-card__row">
                    <span>Month-end outcome</span>
                    <strong>{adjustedOutcome}</strong>
                  </div>
                  <div className="chat-plan-card__tabs" role="tablist" aria-label="Budget recovery scenarios">
                    {recoveryScenarios.map((scenario) => (
                      <button
                        key={scenario.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedScenarioId === scenario.id}
                        className={`chat-plan-card__tab ${selectedScenarioId === scenario.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedScenarioId(scenario.id)}
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>
                  <p className="chat-plan-card__helper">{selectedScenario.description}</p>
                  <div className="chat-plan-card__chart">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} role="img" aria-label="Budget recovery projection chart">
                      <defs>
                        <linearGradient id="currentPaceAreaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef8c6a" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#ef8c6a" stopOpacity="0.03" />
                        </linearGradient>
                        <linearGradient id="pulsePlanAreaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0f6b64" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="#0f6b64" stopOpacity="0.03" />
                        </linearGradient>
                      </defs>
                      <path d={currentAreaPath} fill="url(#currentPaceAreaFill)" />
                      <path d={planAreaPath} fill="url(#pulsePlanAreaFill)" />
                      <line
                        x1={chartPadding.left + 92}
                        x2={chartPadding.left + drawableWidth}
                        y1={budgetLineY}
                        y2={budgetLineY}
                        stroke="#8f889a"
                        strokeDasharray="4 5"
                        strokeWidth="1.5"
                      />
                      <g transform={`translate(${chartPadding.left + 2}, ${budgetLineY - 10})`}>
                        <rect width={88} height={20} rx={7} fill="#e8e6ed" />
                        <text x={44} y={14} textAnchor="middle" fill="#686273" fontSize={10} fontWeight={700}>
                          {formatInr(budgetLimit)} Budget
                        </text>
                      </g>
                      <polyline fill="none" stroke="#ef8c6a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={currentLinePoints} />
                      <polyline fill="none" stroke="#0f6b64" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={planLinePoints} />
                      {chartWeeks.map((week, index) => (
                        <text
                          key={week}
                          x={chartPadding.left + (index * xStep)}
                          y={chartHeight - 4}
                          textAnchor="middle"
                          fill="#756f7d"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {week}
                        </text>
                      ))}
                    </svg>
                  </div>
                  <div className="chat-plan-card__legend" aria-hidden="true">
                    <span><i className="legend-dot current" />Current pace</span>
                    <span><i className="legend-dot plan" />With Pulse plan</span>
                    <span><i className="legend-dot limit" />Budget limit</span>
                  </div>
                  <div className="chat-plan-card__impact-chips">
                    {impactChips.map((chip) => {
                      const isActive = activeImpactIds.includes(chip.id);
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          className={`chat-plan-card__impact-chip ${isActive ? 'is-active' : ''}`}
                          aria-pressed={isActive}
                          onClick={() => toggleImpactChip(chip.id)}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {chatPhase === 'done' && planPhase === 'ready' && (
                <div className="dive-deeper">
                  <span className="dive-deeper__label">Dive Deeper</span>
                  <div className="dive-deeper__chips">
                    {diveDeeperPrompts.map((prompt) => (
                      <button key={prompt} type="button" className="dive-deeper__chip" onClick={() => handleDiveDeeperPrompt(prompt)}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isVoiceMode ? (
              <div className="chat-sheet__input voice-input-shell is-active" role="group" aria-label="Voice input mode">
                <span className="chat-sheet__input-icon" aria-hidden="true">
                  <SparklesIcon size={16} />
                </span>
                <VoiceActivityTrack voiceBars={voiceBars} />
                <button type="button" className="voice-input__action" aria-label="Cancel voice input" onClick={cancelVoiceMode}>
                  <X size={22} />
                </button>
                <button type="button" className="voice-input__action" aria-label="Use transcribed text" onClick={confirmVoiceMode}>
                  <Check size={22} />
                </button>
              </div>
            ) : (
              <div className={`chat-sheet__input chat-sheet__input--dual ${isChatInputFocused || hasChatInputText ? 'is-active' : ''}`}>
                <span className="chat-sheet__input-icon" aria-hidden="true">
                  <SparklesIcon ref={chatInputSparkleRef} size={16} />
                </span>
                <input
                  ref={chatInputRef}
                  value={chatInputValue}
                  onChange={(event) => setChatInputValue(event.target.value)}
                  onFocus={() => setIsChatInputFocused(true)}
                  onBlur={() => setIsChatInputFocused(false)}
                  placeholder="Ask Sidekick"
                  aria-label="Ask Sidekick"
                  inputMode="text"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                />
                <button type="button" className="chat-sheet__input-mic" aria-label="Voice input" onClick={startVoiceMode} disabled={isAiResponding}>
                  <Mic size={16} />
                </button>
                <button
                  type="button"
                  aria-label={isAiResponding ? 'Stop response' : 'Send prompt'}
                  className={isAiResponding ? 'is-stop' : ''}
                  disabled={!isAiResponding && !hasChatInputText}
                  onClick={isAiResponding ? handleStopAiResponse : undefined}
                >
                  {isAiResponding ? <Square size={14} fill="currentColor" strokeWidth={1.6} /> : <ArrowRight size={16} />}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function AdviceScreen({ openChatFromAdvice }: { openChatFromAdvice: (prompt: string) => void }) {
  const promptSplitIndex = Math.ceil(advicePrompts.length / 2);
  const promptRows = [advicePrompts.slice(0, promptSplitIndex), advicePrompts.slice(promptSplitIndex)];
  const [adviceInput, setAdviceInput] = useState('');
  const [isAdviceInputFocused, setIsAdviceInputFocused] = useState(false);
  const hasAdviceInputText = adviceInput.trim().length > 0;

  return (
    <div className="screen advice-screen">
      <Header
        title="Pulse"
        action={(
          <button className="icon-button" type="button" aria-label="Profile">
            <UserCircle2 size={22} />
          </button>
        )}
      />

      <section className="advice-hero reveal delay-1">
        <h2>Financial guidance at your fingertips.</h2>
        <form
          className={`ask-shell ${isAdviceInputFocused || hasAdviceInputText ? 'is-active' : ''}`}
          onSubmit={(event) => {
            event.preventDefault();
            const prompt = adviceInput.trim();
            if (!prompt) return;
            openChatFromAdvice(prompt);
          }}
        >
          <Sparkles size={18} />
          <input
            aria-label="Ask Pulse"
            placeholder="Ask Pulse"
            value={adviceInput}
            onChange={(event) => setAdviceInput(event.target.value)}
            onFocus={() => setIsAdviceInputFocused(true)}
            onBlur={() => setIsAdviceInputFocused(false)}
          />
          <button type="submit" aria-label="Send prompt" disabled={!hasAdviceInputText}>
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="prompt-rail advice-prompt-rail" aria-label="Suggested advice prompts">
          {promptRows.map((row, rowIndex) => (
            <div className="advice-prompt-row" key={`prompt-row-${rowIndex}`}>
              {row.map((prompt) => (
                <button className="prompt-chip advice-prompt-chip" key={prompt} type="button">
                  {prompt}
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>



      <section className="advice-panel reveal delay-3">
        <div className="section-heading bordered advice-heading">
          <span className="eyebrow">Plan with AI</span>
        </div>
        <h3 className="editorial-title compact">Real-time analysis with AI.</h3>
        <p className="panel-copy narrow">
          Instant insights from Pulse AI, your AI-powered financial assistant.
        </p>
        <div className="plan-rail" aria-label="Plan with AI options">
          {planCards.map((plan) => (
            <article className="plan-card" key={plan.label}>
              <div className="plan-card__label">
                <Landmark size={18} />
                <span className="eyebrow">{plan.label}</span>
              </div>
              <p>{plan.title}</p>
              <button className="outline-button" type="button">Get started</button>
            </article>
          ))}
        </div>
      </section>

      <section className="advice-panel recommendations-panel reveal delay-4">
        <div className="section-heading bordered advice-heading split">
          <span className="eyebrow">Recommendations</span>
          <button className="outline-pill" type="button">ASK PULSE</button>
        </div>
        <h3 className="support-title">
          Unlock actionable recommendations from a financial advisor or our AI-powered guidance
        </h3>
        <div className="soft-well">
          <div className="inner-list-card">
            {recommendationItems.map((item) => (
              <div className="list-row muted" key={item.label}>
                <span className="list-row__icon">
                  <item.icon size={23} />
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="advice-panel latest-panel">
        <div className="section-heading bordered advice-heading split">
          <span className="eyebrow">Latest chats</span>
          <button className="outline-pill" type="button">New chat</button>
        </div>
        <h3 className="support-title">Start a conversation to see your Pulse chat history.</h3>
        <div className="soft-well">
          <div className="inner-list-card">
            {chatHistory.map((item) => (
              <div className="list-row muted" key={item.label}>
                <span className="list-row__icon">
                  <item.icon size={23} />
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdviceChatScreen({ initialPrompt, goBack }: { initialPrompt: string; goBack: () => void }) {
  const [chatPhase, setChatPhase] = useState<'idle' | 'loading' | 'typing' | 'done'>('idle');
  const [generatedAnswer, setGeneratedAnswer] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [planPhase, setPlanPhase] = useState<'hidden' | 'loading' | 'ready'>('hidden');
  const [selectedScenarioId, setSelectedScenarioId] = useState<'conservative' | 'balanced' | 'flexible'>('balanced');
  const [animatedPlanSeries, setAnimatedPlanSeries] = useState<number[]>([9000, 19800, 30800, 42700]);
  const [activeImpactIds, setActiveImpactIds] = useState<string[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voicePhase, setVoicePhase] = useState<'dots' | 'waves'>('dots');
  const [voiceBars, setVoiceBars] = useState<number[]>(createVoiceBars);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatSparkleRef = useRef<AnimatedIconHandle>(null);
  const chatInputSparkleRef = useRef<AnimatedIconHandle>(null);
  const loadingTimerRef = useRef<number | null>(null);
  const typingFrameRef = useRef<number | null>(null);
  const planRevealTimerRef = useRef<number | null>(null);
  const scenarioAnimationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef('');
  const isVoiceConfirmingRef = useRef(false);
  const isVoiceSessionActiveRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceMeterFrameRef = useRef<number | null>(null);
  const voiceActivityHoldUntilRef = useRef(0);
  const voiceBarSampleAtRef = useRef(0);
  const aiResponsesByPrompt: Record<string, string> = {
    'Help me stay within budget this month and avoid overspending.': 'You are projected to overshoot by ₹5,300 at your current pace. Start by keeping daily spending near ₹1,440, pausing one subscription, and reducing food delivery this week. That closes the projected ₹5,300 gap.',
    'What should I cut first this week?': 'Start with the highest swing categories first: reduce food delivery by about ₹2,400 and pause one subscription worth roughly ₹1,200. Combined with tighter cab usage, this closes most of the ₹5,300 projected gap.',
    'Show a stricter ₹1,440/day plan': 'At this pace you are trending near ₹1,970/day for the remaining days. Bringing that down toward ₹1,440/day keeps you on track for budget by month-end.',
  };
  const diveDeeperPrompts = [
    'What should I cut first this week?',
    'Show a stricter ₹1,440/day plan',
  ];
  const recoveryScenarios: Array<{
    id: 'conservative' | 'balanced' | 'flexible';
    label: string;
    dailyGuardrail: number;
    outcome: string;
    projectedOverspend: number;
    description: string;
    planSeries: number[];
  }> = [
    {
      id: 'conservative',
      label: 'Conservative',
      dailyGuardrail: 1400,
      outcome: '₹2,400 under budget',
      projectedOverspend: -2400,
      description: 'Strongest cuts, fastest recovery.',
      planSeries: [40600, 45500, 49200, 52600],
    },
    {
      id: 'balanced',
      label: 'Balanced',
      dailyGuardrail: 1440,
      outcome: 'On budget',
      projectedOverspend: 0,
      description: 'Most realistic plan to avoid overspending.',
      planSeries: [40600, 46800, 51200, 55000],
    },
    {
      id: 'flexible',
      label: 'Flexible',
      dailyGuardrail: 1650,
      outcome: '₹2,100 over budget',
      projectedOverspend: 2100,
      description: 'Easier to follow, but some overspend remains.',
      planSeries: [40600, 47600, 52800, 57100],
    },
  ];
  const selectedScenario = recoveryScenarios.find((item) => item.id === selectedScenarioId) ?? recoveryScenarios[1];
  const impactChips = [
    { id: 'food', label: 'Food delivery -₹2,400', savings: 2400 },
    { id: 'subscriptions', label: 'Subscriptions -₹1,200', savings: 1200 },
    { id: 'cabs', label: 'Cabs -₹1,700', savings: 1700 },
  ];
  const selectedSavings = impactChips
    .filter((item) => activeImpactIds.includes(item.id))
    .reduce((sum, item) => sum + item.savings, 0);
  const adjustedOverspend = selectedScenario.projectedOverspend - selectedSavings;
  const adjustedOutcome = adjustedOverspend === 0
    ? 'On budget'
    : adjustedOverspend > 0
      ? `${formatInr(adjustedOverspend)} over budget`
      : `${formatInr(Math.abs(adjustedOverspend))} under budget`;
  const chartWeeks = ['W1', 'W2', 'W3', 'W4'];
  const currentPaceSeries = [40600, 48000, 54800, HOME_FINANCIALS.projectedMonthEndSpend];
  const adjustedPlanSeries = selectedScenario.planSeries.map((point, index) => {
    const progressFactor = (index + 1) / selectedScenario.planSeries.length;
    return point - (selectedSavings * progressFactor);
  });
  const budgetLimit = HOME_FINANCIALS.monthlyBudget;
  const chartMin = 38000;
  const chartMax = 62000;
  const chartHeight = 144;
  const chartWidth = 300;
  const chartPadding = { top: 10, right: 10, bottom: 24, left: 10 };
  const drawableWidth = chartWidth - chartPadding.left - chartPadding.right;
  const drawableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const xStep = drawableWidth / (chartWeeks.length - 1);
  const toChartY = (value: number) => {
    const normalized = (value - chartMin) / (chartMax - chartMin);
    return chartPadding.top + drawableHeight - (normalized * drawableHeight);
  };
  const buildPolylinePoints = (values: number[]) =>
    values
      .map((value, index) => `${chartPadding.left + (index * xStep)},${toChartY(value)}`)
      .join(' ');
  const currentLinePoints = buildPolylinePoints(currentPaceSeries);
  const planLinePoints = buildPolylinePoints(animatedPlanSeries);
  const budgetLineY = toChartY(budgetLimit);
  const chartBaseY = chartPadding.top + drawableHeight;
  const buildAreaPath = (values: number[]) => {
    const linePoints = values.map((value, index) => `${chartPadding.left + (index * xStep)},${toChartY(value)}`);
    const startX = chartPadding.left;
    const endX = chartPadding.left + ((values.length - 1) * xStep);
    return `M ${startX} ${chartBaseY} L ${linePoints.join(' L ')} L ${endX} ${chartBaseY} Z`;
  };
  const currentAreaPath = buildAreaPath(currentPaceSeries);
  const planAreaPath = buildAreaPath(animatedPlanSeries);

  useEffect(() => {
    const targetSeries = adjustedPlanSeries;
    if (scenarioAnimationFrameRef.current) {
      window.cancelAnimationFrame(scenarioAnimationFrameRef.current);
      scenarioAnimationFrameRef.current = null;
    }

    const fromSeries = [...animatedPlanSeries];
    const start = performance.now();
    const duration = 520;
    const easeInOut = (t: number) => 0.5 - (Math.cos(Math.PI * t) / 2);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = easeInOut(progress);
      const nextSeries = fromSeries.map((value, index) => {
        const target = targetSeries[index] ?? value;
        return value + ((target - value) * eased);
      });
      setAnimatedPlanSeries(nextSeries);

      if (progress < 1) {
        scenarioAnimationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      setAnimatedPlanSeries(targetSeries);
      scenarioAnimationFrameRef.current = null;
    };

    scenarioAnimationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (scenarioAnimationFrameRef.current) {
        window.cancelAnimationFrame(scenarioAnimationFrameRef.current);
        scenarioAnimationFrameRef.current = null;
      }
    };
  }, [selectedScenarioId, selectedSavings]);

  const toggleImpactChip = (chipId: string) => {
    setActiveImpactIds((previous) =>
      previous.includes(chipId) ? previous.filter((id) => id !== chipId) : [...previous, chipId],
    );
  };

  const clearChatGeneration = () => {
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (typingFrameRef.current) {
      window.cancelAnimationFrame(typingFrameRef.current);
      typingFrameRef.current = null;
    }
    if (planRevealTimerRef.current) {
      window.clearTimeout(planRevealTimerRef.current);
      planRevealTimerRef.current = null;
    }
  };

  const runAiGeneration = (prompt: string) => {
    clearChatGeneration();
    setActivePrompt(prompt);
    setChatPhase('loading');
    setGeneratedAnswer('');
    setPlanPhase('hidden');
    const aiDraftResponse = aiResponsesByPrompt[prompt] ?? aiResponsesByPrompt['Help me stay within budget this month and avoid overspending.'];

    loadingTimerRef.current = window.setTimeout(() => {
      setChatPhase('typing');
      const start = performance.now();
      const duration = 6800;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - progress) ** 3;
        const length = Math.floor(eased * aiDraftResponse.length);
        setGeneratedAnswer(aiDraftResponse.slice(0, length));

        if (progress < 1) {
          typingFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        setGeneratedAnswer(aiDraftResponse);
        setChatPhase('done');
        typingFrameRef.current = null;
        setPlanPhase('loading');
        planRevealTimerRef.current = window.setTimeout(() => {
          setPlanPhase('ready');
          planRevealTimerRef.current = null;
        }, 3000);
      };

      typingFrameRef.current = window.requestAnimationFrame(tick);
      loadingTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    runAiGeneration(initialPrompt);
    return () => {
      clearChatGeneration();
      if (scenarioAnimationFrameRef.current) {
        window.cancelAnimationFrame(scenarioAnimationFrameRef.current);
      }
      isVoiceSessionActiveRef.current = false;
      stopVoiceRecognition();
      stopVoiceMonitoring();
    };
  }, [initialPrompt]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      chatInputRef.current?.focus();
    }, 280);
    return () => window.clearTimeout(focusTimer);
  }, []);

  const handleDiveDeeperPrompt = (prompt: string) => {
    if (chatPhase === 'loading' || chatPhase === 'typing') return;
    setChatInputValue('');
    runAiGeneration(prompt);
  };

  const hasChatInputText = chatInputValue.trim().length > 0;
  const isAiResponding = chatPhase === 'loading' || chatPhase === 'typing';
  const handleStopAiResponse = () => {
    if (!isAiResponding) return;
    clearChatGeneration();
    setChatPhase('done');
    setPlanPhase('hidden');
  };

  const submitChatInput = () => {
    if (!hasChatInputText || isAiResponding) return;
    runAiGeneration(chatInputValue.trim());
    setChatInputValue('');
  };

  const stopVoiceRecognition = () => {
    isVoiceConfirmingRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const stopVoiceMonitoring = () => {
    if (voiceMeterFrameRef.current) {
      window.cancelAnimationFrame(voiceMeterFrameRef.current);
      voiceMeterFrameRef.current = null;
    }
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    audioAnalyserRef.current?.disconnect();
    audioAnalyserRef.current = null;
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      void context.close().catch(() => {});
    }
    voiceActivityHoldUntilRef.current = 0;
    voiceBarSampleAtRef.current = 0;
    setVoiceBars(createVoiceBars());
    setVoicePhase('dots');
  };

  const startVoiceMonitoring = async () => {
    const AudioContextImpl =
      window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextImpl || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioContext = new AudioContextImpl();
      if (!isVoiceSessionActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close().catch(() => {});
        return false;
      }
      void audioContext.resume();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioStreamRef.current = stream;
      audioContextRef.current = audioContext;
      audioSourceRef.current = source;
      audioAnalyserRef.current = analyser;

      const timeDomainData = new Uint8Array(analyser.fftSize);
      voiceBarSampleAtRef.current = performance.now();

      const tick = () => {
        analyser.getByteTimeDomainData(timeDomainData);

        let sumSquares = 0;
        for (let index = 0; index < timeDomainData.length; index += 1) {
          const centeredSample = (timeDomainData[index] - 128) / 128;
          sumSquares += centeredSample * centeredSample;
        }

        const rms = Math.sqrt(sumSquares / timeDomainData.length);
        const speechLevel = normalizeVoiceLevel(rms, VOICE_ACTIVITY_FLOOR, VOICE_ACTIVITY_CEILING);
        const now = performance.now();

        if (speechLevel > VOICE_ACTIVITY_THRESHOLD) {
          voiceActivityHoldUntilRef.current = now + VOICE_ACTIVITY_HOLD_MS;
        }

        const showWaves = voiceActivityHoldUntilRef.current > now;
        const shapedLevel = clampNumber(speechLevel ** 0.82, 0, 1);
        const nextBarHeight = showWaves
          ? VOICE_BAR_MIN_HEIGHT + (shapedLevel * (VOICE_BAR_MAX_HEIGHT - VOICE_BAR_MIN_HEIGHT))
          : 0;

        setVoicePhase(showWaves ? 'waves' : 'dots');
        if (now >= voiceBarSampleAtRef.current) {
          voiceBarSampleAtRef.current = now + VOICE_BAR_STREAM_INTERVAL_MS;
          setVoiceBars((previous) => [
            ...previous.slice(1),
            Math.round(nextBarHeight * 10) / 10,
          ]);
        }

        voiceMeterFrameRef.current = window.requestAnimationFrame(tick);
      };

      voiceMeterFrameRef.current = window.requestAnimationFrame(tick);
      return true;
    } catch {
      stopVoiceMonitoring();
      return false;
    }
  };

  const commitVoiceTranscript = () => {
    const finalizedTranscript = voiceTranscriptRef.current.trim();
    isVoiceSessionActiveRef.current = false;
    stopVoiceMonitoring();
    setIsVoiceMode(false);
    setVoicePhase('dots');
    if (finalizedTranscript.length > 0) {
      setChatInputValue(finalizedTranscript);
    }
    window.setTimeout(() => chatInputRef.current?.focus(), 40);
  };

  const startVoiceMode = () => {
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setIsVoiceMode(false);
      setVoicePhase('dots');
      setVoiceTranscript('');
      return;
    }

    setIsVoiceMode(true);
    setVoicePhase('dots');
    setVoiceBars(createVoiceBars());
    setVoiceTranscript('');
    voiceTranscriptRef.current = '';
    isVoiceConfirmingRef.current = false;
    isVoiceSessionActiveRef.current = true;
    setIsChatInputFocused(false);
    void startVoiceMonitoring();

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-IN';

    recognition.onspeechstart = () => {
      setVoicePhase('waves');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? '';
      }
      const normalized = transcript.trim();
      if (!normalized) return;
      voiceTranscriptRef.current = normalized;
      setVoiceTranscript(normalized);
      setVoicePhase('waves');
    };

    recognition.onerror = (event: any) => {
      recognitionRef.current = null;
      if (isVoiceConfirmingRef.current) {
        isVoiceConfirmingRef.current = false;
        commitVoiceTranscript();
        return;
      }
      if (isVoiceSessionActiveRef.current && (event?.error === 'no-speech' || event?.error === 'aborted')) {
        return;
      }
      isVoiceSessionActiveRef.current = false;
      stopVoiceMonitoring();
      setIsVoiceMode(false);
      setVoicePhase('dots');
      setVoiceTranscript('');
      window.setTimeout(() => chatInputRef.current?.focus(), 40);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (isVoiceConfirmingRef.current) {
        isVoiceConfirmingRef.current = false;
        commitVoiceTranscript();
        return;
      }
      if (isVoiceSessionActiveRef.current) {
        try {
          recognition.start();
          recognitionRef.current = recognition;
          return;
        } catch {
          isVoiceSessionActiveRef.current = false;
        }
      }
      stopVoiceMonitoring();
      setIsVoiceMode(false);
      setVoicePhase('dots');
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
      setIsVoiceMode(false);
      setVoicePhase('dots');
      setVoiceTranscript('');
    }
  };

  const cancelVoiceMode = () => {
    isVoiceSessionActiveRef.current = false;
    stopVoiceRecognition();
    stopVoiceMonitoring();
    setIsVoiceMode(false);
    setVoicePhase('dots');
    setVoiceTranscript('');
    window.setTimeout(() => chatInputRef.current?.focus(), 40);
  };

  const confirmVoiceMode = () => {
    const activeRecognition = recognitionRef.current;
    if (activeRecognition) {
      isVoiceConfirmingRef.current = true;
      isVoiceSessionActiveRef.current = false;
      activeRecognition.stop();
      return;
    }
    commitVoiceTranscript();
  };

  useEffect(() => {
    if (isAiResponding) {
      chatSparkleRef.current?.startAnimation();
      chatInputSparkleRef.current?.startAnimation();
      return;
    }
    chatSparkleRef.current?.stopAnimation();
    chatInputSparkleRef.current?.stopAnimation();
  }, [isAiResponding]);

  return (
    <div className="screen advice-chat-screen">
      <Header
        title="Budget Plan with Pulse"
        titleVariant="chat"
        leading={(
          <button className="icon-button advice-chat-topbar__back" type="button" onClick={goBack} aria-label="Back to advice">
            <ChevronLeft size={22} />
          </button>
        )}
        action={(
          <button className="icon-button advice-chat-topbar__menu" type="button" aria-label="More options">
            <Ellipsis size={20} />
          </button>
        )}
      />
      <section className="advice-chat-pane">
        <div className="chat-sheet__body">
          <div className="chat-msg chat-msg--user">
            {activePrompt || initialPrompt}
          </div>
          {(chatPhase === 'loading' || chatPhase === 'typing' || chatPhase === 'done') && (
            <div className="chat-msg chat-msg--ai">
              <span className="chat-msg__ai-mark" aria-hidden="true">
                <SparklesIcon ref={chatSparkleRef} size={14} />
              </span>
              <div className="chat-msg__ai-content">
                {chatPhase === 'loading' ? (
                  <div className="chat-thinking" aria-hidden="true">
                    <strong>Thinking</strong>
                  </div>
                ) : (
                  <p>{generatedAnswer}</p>
                )}
              </div>
            </div>
          )}
          {chatPhase === 'done' && planPhase === 'loading' && (
            <div className="chat-plan-skeleton" aria-hidden="true">
              <span className="chat-plan-skeleton__line" />
              <span className="chat-plan-skeleton__line short" />
              <div className="chat-plan-skeleton__chart" />
            </div>
          )}
          {chatPhase === 'done' && planPhase === 'ready' && (
            <div className="chat-plan-card is-generating">
              <div className="chat-plan-card__title">Budget Recovery Projection</div>
              <div className="chat-plan-card__row">
                <span>Current pace</span>
                <strong>{formatInr(HOME_DERIVED.currentRemainingPace)}/day</strong>
              </div>
              <div className="chat-plan-card__row">
                <span>Projected month-end spend</span>
                <strong>{formatInr(HOME_FINANCIALS.projectedMonthEndSpend)}</strong>
              </div>
              <div className="chat-plan-card__row">
                <span>Current pace outcome</span>
                <strong>{formatInr(HOME_DERIVED.projectedOverspend)} over budget</strong>
              </div>
              <div className="chat-plan-card__row">
                <span>Daily guardrail</span>
                <strong>{formatInr(selectedScenario.dailyGuardrail)}/day</strong>
              </div>
              <div className="chat-plan-card__row">
                <span>Month-end outcome</span>
                <strong>{adjustedOutcome}</strong>
              </div>
              <div className="chat-plan-card__tabs" role="tablist" aria-label="Budget recovery scenarios">
                {recoveryScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedScenarioId === scenario.id}
                    className={`chat-plan-card__tab ${selectedScenarioId === scenario.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
              <p className="chat-plan-card__helper">{selectedScenario.description}</p>
              <div className="chat-plan-card__chart">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} role="img" aria-label="Budget recovery projection chart">
                  <defs>
                    <linearGradient id="currentPaceAreaFillAdvice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef8c6a" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#ef8c6a" stopOpacity="0.03" />
                    </linearGradient>
                    <linearGradient id="pulsePlanAreaFillAdvice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f6b64" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#0f6b64" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>
                  <path d={currentAreaPath} fill="url(#currentPaceAreaFillAdvice)" />
                  <path d={planAreaPath} fill="url(#pulsePlanAreaFillAdvice)" />
                  <line
                    x1={chartPadding.left + 92}
                    x2={chartPadding.left + drawableWidth}
                    y1={budgetLineY}
                    y2={budgetLineY}
                    stroke="#8f889a"
                    strokeDasharray="4 5"
                    strokeWidth="1.5"
                  />
                  <g transform={`translate(${chartPadding.left + 2}, ${budgetLineY - 10})`}>
                    <rect width={88} height={20} rx={7} fill="#e8e6ed" />
                    <text x={44} y={14} textAnchor="middle" fill="#686273" fontSize={10} fontWeight={700}>
                      {formatInr(budgetLimit)} Budget
                    </text>
                  </g>
                  <polyline fill="none" stroke="#ef8c6a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={currentLinePoints} />
                  <polyline fill="none" stroke="#0f6b64" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={planLinePoints} />
                  {chartWeeks.map((week, index) => (
                    <text
                      key={week}
                      x={chartPadding.left + (index * xStep)}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill="#756f7d"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {week}
                    </text>
                  ))}
                </svg>
              </div>
              <div className="chat-plan-card__legend" aria-hidden="true">
                <span><i className="legend-dot current" />Current pace</span>
                <span><i className="legend-dot plan" />With Pulse plan</span>
                <span><i className="legend-dot limit" />Budget limit</span>
              </div>
              <div className="chat-plan-card__impact-chips">
                {impactChips.map((chip) => {
                  const isActive = activeImpactIds.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`chat-plan-card__impact-chip ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => toggleImpactChip(chip.id)}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {chatPhase === 'done' && planPhase === 'ready' && (
            <div className="dive-deeper">
              <span className="dive-deeper__label">Dive Deeper</span>
              <div className="dive-deeper__chips">
                {diveDeeperPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="dive-deeper__chip" onClick={() => handleDiveDeeperPrompt(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {isVoiceMode ? (
          <div className="chat-sheet__input voice-input-shell is-active" role="group" aria-label="Voice input mode">
            <span className="chat-sheet__input-icon" aria-hidden="true">
              <SparklesIcon size={16} />
            </span>
            <VoiceActivityTrack voiceBars={voiceBars} />
            <button type="button" className="voice-input__action" aria-label="Cancel voice input" onClick={cancelVoiceMode}>
              <X size={22} />
            </button>
            <button type="button" className="voice-input__action" aria-label="Use transcribed text" onClick={confirmVoiceMode}>
              <Check size={22} />
            </button>
          </div>
        ) : (
          <form
            className={`chat-sheet__input chat-sheet__input--dual ${isChatInputFocused || hasChatInputText ? 'is-active' : ''}`}
            onSubmit={(event) => {
              event.preventDefault();
              submitChatInput();
            }}
          >
            <span className="chat-sheet__input-icon" aria-hidden="true">
              <SparklesIcon ref={chatInputSparkleRef} size={16} />
            </span>
            <input
              ref={chatInputRef}
              value={chatInputValue}
              onChange={(event) => setChatInputValue(event.target.value)}
              onFocus={() => setIsChatInputFocused(true)}
              onBlur={() => setIsChatInputFocused(false)}
              placeholder="Ask Sidekick"
              aria-label="Ask Sidekick"
            />
            <button type="button" className="chat-sheet__input-mic" aria-label="Voice input" onClick={startVoiceMode} disabled={isAiResponding}>
              <Mic size={16} />
            </button>
            <button
              type="submit"
              aria-label={isAiResponding ? 'Stop response' : 'Send prompt'}
              className={isAiResponding ? 'is-stop' : ''}
              disabled={!isAiResponding && !hasChatInputText}
              onClick={isAiResponding ? handleStopAiResponse : undefined}
            >
              {isAiResponding ? <Square size={14} fill="currentColor" strokeWidth={1.6} /> : <ArrowRight size={16} />}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button className={screen === 'home' ? 'active' : ''} type="button" onClick={() => setScreen('home')}>
        <Home size={22} />
        <span>Home</span>
      </button>
      <button className={screen === 'advice' ? 'active' : ''} type="button" onClick={() => setScreen('advice')}>
        <Goal size={22} />
        <span>Advice</span>
      </button>
    </nav>
  );
}

export default App;

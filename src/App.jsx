import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "activity-planner-dashboard-state";
const TIMEFRAMES = [
  { key: "day", label: "Last 24 hrs" },
  { key: "week", label: "Last week" },
  { key: "month", label: "Last 30 days" },
];
const CATEGORY_OPTIONS = ["All", "Skill & technique", "Physical conditioning", "Recovery & Readiness"];
const SECTION_ITEMS = [
  { key: "overview", label: "Home" },
  { key: "activities", label: "Calendar" },
  { key: "attention", label: "Stats" },
  { key: "power", label: "Power" },
];

const METRIC_SERIES = {
  day: [
    {
      title: "Avg. HRV",
      unit: "ms",
      performer: "Patrick",
      average: 150,
      series: [
        { label: "Mar 10, 12 AM", value: 54 },
        { label: "Mar 10, 2 AM", value: 48 },
        { label: "Mar 10, 4 AM", value: 77 },
        { label: "Mar 10, 6 AM", value: 66 },
        { label: "Mar 10, 8 AM", value: 72 },
        { label: "Mar 10, 10 AM", value: 69 },
        { label: "Mar 10, 12 PM", value: 61 },
        { label: "Mar 10, 2 PM", value: 64 },
        { label: "Mar 10, 4 PM", value: 68 },
      ],
    },
    {
      title: "Avg. Calories Burned",
      unit: "kcal",
      performer: "Wendy",
      average: 640,
      series: [
        { label: "Mar 10, 12 AM", value: 320 },
        { label: "Mar 10, 3 AM", value: 430 },
        { label: "Mar 10, 6 AM", value: 520 },
        { label: "Mar 10, 9 AM", value: 610 },
        { label: "Mar 10, 12 PM", value: 640 },
        { label: "Mar 10, 3 PM", value: 690 },
        { label: "Mar 10, 6 PM", value: 700 },
        { label: "Mar 10, 9 PM", value: 680 },
      ],
    },
    {
      title: "Total Activity Time",
      unit: "min",
      performer: "Yussuf",
      average: 3619,
      series: [
        { label: "Mar 10, 6 AM", value: 120 },
        { label: "Mar 10, 8 AM", value: 250 },
        { label: "Mar 10, 10 AM", value: 380 },
        { label: "Mar 10, 12 PM", value: 520 },
        { label: "Mar 10, 2 PM", value: 730 },
        { label: "Mar 10, 4 PM", value: 900 },
        { label: "Mar 10, 6 PM", value: 1100 },
        { label: "Mar 10, 8 PM", value: 1240 },
      ],
    },
  ],
  week: [
    {
      title: "Avg. HRV",
      unit: "ms",
      performer: "Patrick",
      average: 190,
      series: [
        { label: "Mar 4", value: 60 },
        { label: "Mar 5", value: 48 },
        { label: "Mar 6", value: 102 },
        { label: "Mar 7", value: 55 },
        { label: "Mar 8", value: 77 },
        { label: "Mar 9", value: 19 },
        { label: "Mar 10", value: 68 },
      ],
    },
    {
      title: "Avg. Calories Burned",
      unit: "kcal",
      performer: "Wendy",
      average: 640,
      series: [
        { label: "Mar 4", value: 500 },
        { label: "Mar 5", value: 620 },
        { label: "Mar 6", value: 730 },
        { label: "Mar 7", value: 610 },
        { label: "Mar 8", value: 700 },
        { label: "Mar 9", value: 640 },
        { label: "Mar 10", value: 700 },
      ],
    },
    {
      title: "Total Activity Time",
      unit: "min",
      performer: "Yussuf",
      average: 3619,
      series: [
        { label: "Mar 4", value: 3200 },
        { label: "Mar 5", value: 2900 },
        { label: "Mar 6", value: 3550 },
        { label: "Mar 7", value: 3720 },
        { label: "Mar 8", value: 3440 },
        { label: "Mar 9", value: 3619 },
        { label: "Mar 10", value: 3728 },
      ],
    },
  ],
  month: [
    {
      title: "Avg. HRV",
      unit: "ms",
      performer: "Patrick",
      average: 62,
      series: [
        { label: "Week 1", value: 58 },
        { label: "Week 2", value: 64 },
        { label: "Week 3", value: 61 },
        { label: "Week 4", value: 68 },
      ],
    },
    {
      title: "Avg. Calories Burned",
      unit: "kcal",
      performer: "Wendy",
      average: 640,
      series: [
        { label: "Week 1", value: 590 },
        { label: "Week 2", value: 640 },
        { label: "Week 3", value: 675 },
        { label: "Week 4", value: 700 },
      ],
    },
    {
      title: "Total Activity Time",
      unit: "min",
      performer: "Yussuf",
      average: 3619,
      series: [
        { label: "Week 1", value: 3410 },
        { label: "Week 2", value: 3505 },
        { label: "Week 3", value: 3630 },
        { label: "Week 4", value: 3728 },
      ],
    },
  ],
};

const POWER_PROFILE = {
  day: [
    { label: "5 sec", value: 860 },
    { label: "10 sec", value: 795 },
    { label: "30 sec", value: 650 },
    { label: "1 min", value: 540 },
    { label: "5 min", value: 460 },
    { label: "10 min", value: 520 },
  ],
  week: [
    { label: "5 sec", value: 120 },
    { label: "10 sec", value: 230 },
    { label: "30 sec", value: 700 },
    { label: "1 min", value: 190 },
    { label: "5 min", value: 920 },
    { label: "10 min", value: 910 },
  ],
  month: [
    { label: "5 sec", value: 980 },
    { label: "10 sec", value: 890 },
    { label: "30 sec", value: 760 },
    { label: "1 min", value: 620 },
    { label: "5 min", value: 560 },
    { label: "10 min", value: 640 },
  ],
};

const ATTENTION_BY_RANGE = {
  day: [
    { name: "Kevin", initials: "K", label: "Elevated RHR", value: 78, delta: "+15%", tone: "up" },
    { name: "Samuel", initials: "S", label: "Low HRV", value: 34, delta: "-23%", tone: "down", alt: true },
  ],
  week: [
    { name: "Kevin", initials: "K", label: "Elevated RHR", value: 76, delta: "+12%", tone: "up" },
    { name: "Samuel", initials: "S", label: "Low HRV", value: 36, delta: "-18%", tone: "down", alt: true },
  ],
  month: [
    { name: "Kevin", initials: "K", label: "Load spike", value: 81, delta: "+10%", tone: "up" },
    { name: "Samuel", initials: "S", label: "Low HRV", value: 38, delta: "-15%", tone: "down", alt: true },
  ],
};

const INITIAL_ACTIVITIES = [
  {
    id: "a1",
    title: "Long run (12km)",
    time: "06:00",
    date: "2026-03-10",
    category: "Physical conditioning",
    status: "planned",
    assignees: ["A", "R"],
    note: "Aerobic base session with low HR cap.",
  },
  {
    id: "a2",
    title: "Mobility work",
    time: "08:45",
    date: "2026-03-10",
    category: "Recovery & Readiness",
    status: "planned",
    assignees: ["L", "M", "K"],
    note: "15 minutes hip and thoracic work.",
  },
  {
    id: "a3",
    title: "Race strategy session",
    time: "10:30",
    date: "2026-03-10",
    category: "Skill & technique",
    status: "planned",
    assignees: ["P"],
    note: "Tactics review for weekend event.",
  },
  {
    id: "a4",
    title: "Sprint session",
    time: "13:15",
    date: "2026-03-10",
    category: "Physical conditioning",
    status: "planned",
    assignees: ["N", "Y"],
    note: "Short acceleration work on track.",
  },
  {
    id: "a5",
    title: "Sleep review",
    time: "18:00",
    date: "2026-03-11",
    category: "Recovery & Readiness",
    status: "planned",
    assignees: ["S"],
    note: "Check readiness and recovery notes.",
  },
];

const EMPTY_FORM = {
  id: "",
  title: "",
  date: "2026-03-10",
  time: "09:00",
  category: "Skill & technique",
  note: "",
  assignees: "AB",
};

function buildCurveData(series, width = 280, height = 130, padding = 8) {
  const values = series.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1);

  const points = series.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1);
    const normalized = (point.value - min) / span;
    const y = height - padding - normalized * (height - padding * 2);
    return { ...point, x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const handleX = previous.x + (current.x - previous.x) / 2;
    path += ` C ${handleX} ${previous.y}, ${handleX} ${current.y}, ${current.x} ${current.y}`;
  }

  return { points, path };
}

function getPolygonPoints(cx, cy, radius, count, offset = -Math.PI / 2) {
  return Array.from({ length: count }, (_, index) => {
    const angle = offset + (index * Math.PI * 2) / count;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(" ");
}

function formatTime(timeValue) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours} : ${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDate(dateValue) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isInRange(activity, timeframe) {
  const activityDate = new Date(`${activity.date}T${activity.time}:00`);
  const baseDate = new Date("2026-03-10T00:00:00");
  const diffInDays = (activityDate - baseDate) / (1000 * 60 * 60 * 24);

  if (timeframe === "day") return diffInDays >= 0 && diffInDays < 1;
  if (timeframe === "week") return diffInDays >= 0 && diffInDays < 7;
  return diffInDays >= 0 && diffInDays < 30;
}

function buildSummary(timeframe, visibleActivities, attentionItems) {
  const label =
    timeframe === "day" ? "today" : timeframe === "week" ? "this week" : "this month";
  const flagged = attentionItems.length;
  const completed = visibleActivities.filter((activity) => activity.status === "done").length;
  const planned = visibleActivities.filter((activity) => activity.status === "planned").length;

  if (!visibleActivities.length) {
    return `No activities are scheduled for ${label}. Add a session to start tracking team load and readiness.`;
  }

  return `${planned} activities are planned for ${label}. ${completed} already completed. ${flagged} athletes require attention, so keep an eye on readiness before the next block.`;
}

function buildPersistedActivities() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ACTIVITIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_ACTIVITIES;
  } catch {
    return INITIAL_ACTIVITIES;
  }
}

function App() {
  const [timeframe, setTimeframe] = useState("week");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeSection, setActiveSection] = useState("overview");
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState(EMPTY_FORM);

  useEffect(() => {
    setActivities(buildPersistedActivities());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities
      .filter((activity) => isInRange(activity, timeframe))
      .filter((activity) => category === "All" || activity.category === category)
      .filter((activity) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          activity.title.toLowerCase().includes(query) ||
          activity.category.toLowerCase().includes(query) ||
          activity.note.toLowerCase().includes(query)
        );
      })
      .sort((left, right) => {
        const leftStamp = `${left.date}T${left.time}`;
        const rightStamp = `${right.date}T${right.time}`;
        return leftStamp.localeCompare(rightStamp);
      });
  }, [activities, category, search, timeframe]);

  const summaryText = useMemo(() => {
    return buildSummary(timeframe, filteredActivities, ATTENTION_BY_RANGE[timeframe]);
  }, [filteredActivities, timeframe]);

  const openCreateModal = () => {
    setFormState(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (activity) => {
    setFormState({
      id: activity.id,
      title: activity.title,
      date: activity.date,
      time: activity.time,
      category: activity.category,
      note: activity.note,
      assignees: activity.assignees.join(""),
    });
    setModalOpen(true);
  };

  const saveActivity = (event) => {
    event.preventDefault();
    const normalizedAssignees = formState.assignees
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 4)
      .split("");

    const payload = {
      id: formState.id || crypto.randomUUID(),
      title: formState.title.trim(),
      date: formState.date,
      time: formState.time,
      category: formState.category,
      note: formState.note.trim(),
      assignees: normalizedAssignees.length ? normalizedAssignees : ["T"],
      status: "planned",
    };

    setActivities((current) => {
      const exists = current.some((activity) => activity.id === payload.id);
      if (exists) {
        return current.map((activity) => (activity.id === payload.id ? { ...activity, ...payload } : activity));
      }
      return [...current, payload];
    });
    setModalOpen(false);
  };

  const toggleStatus = (id) => {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === id
          ? { ...activity, status: activity.status === "done" ? "planned" : "done" }
          : activity,
      ),
    );
  };

  const deleteActivity = (id) => {
    setActivities((current) => current.filter((activity) => activity.id !== id));
  };

  const navigateToSection = (sectionKey) => {
    setActiveSection(sectionKey);
    document.getElementById(sectionKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <main className="dashboard-shell">
        <header className="topbar">
          <div>
            <h1>
              Hello, <span>Noah!</span>
            </h1>
            <p>Take a quick look at your teams performance here</p>
          </div>
          <div className="topbar-actions">
            <label className="search">
              <span className="icon-search" aria-hidden="true"></span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for activities"
                aria-label="Search for activities"
              />
            </label>
            <button type="button" className="accent-btn" onClick={openCreateModal}>
              Add activity
            </button>
          </div>
        </header>

        <aside className="sidebar" aria-label="Sidebar navigation">
          {SECTION_ITEMS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={`nav-pill ${activeSection === item.key ? "active" : ""} ${
                index === SECTION_ITEMS.length - 1 ? "dark" : ""
              }`}
              aria-label={item.label}
              title={item.label}
              onClick={() => navigateToSection(item.key)}
            >
              <span>{item.label.slice(0, 1)}</span>
            </button>
          ))}
          <div className="sidebar-spacer"></div>
          <div className="avatar avatar-lg">P</div>
        </aside>

        <section className="content-grid">
          <section id="overview" className={`panel team-overview ${activeSection === "overview" ? "focused" : ""}`}>
            <div className="panel-header">
              <h2>Team Overview</h2>
              <div className="segmented">
                {TIMEFRAMES.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={timeframe === option.key ? "active" : ""}
                    onClick={() => setTimeframe(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="metric-grid">
              {METRIC_SERIES[timeframe].map((card) => (
                <MetricCard key={card.title} card={card} />
              ))}
            </div>
          </section>

          <section className="summary-column">
            <article className="panel summary-card accent">
              <div className="summary-head">
                <h2>Your Daily Summary</h2>
                <div className="sparkle" aria-hidden="true"></div>
              </div>
              <p>{summaryText}</p>
            </article>

            <article id="attention" className={`panel attention-card ${activeSection === "attention" ? "focused" : ""}`}>
              <div className="panel-headline">
                <h2>Attention Monitor</h2>
                <button type="button" className="text-btn" onClick={() => setCategory("Recovery & Readiness")}>
                  show flagged
                </button>
              </div>
              <div className="attention-grid">
                {ATTENTION_BY_RANGE[timeframe].map((item, index) => (
                  <AttentionCard item={item} key={item.name} showDivider={index === 0} />
                ))}
              </div>
            </article>
          </section>

          <section id="activities" className={`panel activities-panel ${activeSection === "activities" ? "focused" : ""}`}>
            <div className="panel-headline activities-headline">
              <h2>My Activities</h2>
              <p>
                You have <span>{filteredActivities.filter((activity) => activity.status === "planned").length}</span>{" "}
                planned activities in this view
              </p>
            </div>
            <div className="activities-toolbar">
              <div className="segmented wide filter-bar">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={category === option ? "active" : ""}
                    onClick={() => setCategory(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button type="button" className="text-btn" onClick={openCreateModal}>
                new activity
              </button>
            </div>
            <div className="activity-list">
              {filteredActivities.length ? (
                filteredActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onEdit={openEditModal}
                    onDelete={deleteActivity}
                    onToggleStatus={toggleStatus}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <h3>No matching activities</h3>
                  <p>Try a different search, timeframe, or category. You can also create a new activity.</p>
                </div>
              )}
            </div>
          </section>

          <section id="power" className={`panel radar-panel ${activeSection === "power" ? "focused" : ""}`}>
            <div className="panel-headline">
              <h2>Team Power Profile (Watts)</h2>
              <button type="button" className="text-btn" onClick={() => setTimeframe("month")}>
                show trend
              </button>
            </div>
            <div className="panel-header compact">
              <button type="button" className="dropdown-btn">
                {TIMEFRAMES.find((option) => option.key === timeframe)?.label}
              </button>
              <p className="panel-helper">Hover a point to inspect power at each duration.</p>
            </div>
            <div className="radar-wrap">
              <RadarChart series={POWER_PROFILE[timeframe]} />
            </div>
          </section>
        </section>
      </main>

      {modalOpen ? (
        <ActivityModal
          formState={formState}
          setFormState={setFormState}
          onClose={() => setModalOpen(false)}
          onSubmit={saveActivity}
        />
      ) : null}
    </>
  );
}

function MetricCard({ card }) {
  const latest = card.series[card.series.length - 1];
  const change = (((latest.value - card.average) / card.average) * 100).toFixed(1);

  return (
    <article className="metric-card">
      <LineChart series={card.series} unit={card.unit} title={card.title} />
      <h3>{card.title}</h3>
      <p className="metric-value">
        {latest.value} <span>{card.unit}</span>
      </p>
      <div className="metric-meta">
        <span>Average for this view</span>
        <span>
          <strong>{card.average}</strong> | <em>{change >= 0 ? `+${change}` : change}%</em>
        </span>
      </div>
      <div className="metric-meta">
        <span>Top performer</span>
        <button type="button" className="link-btn">
          {card.performer}
        </button>
      </div>
    </article>
  );
}

function LineChart({ series, unit, title }) {
  const { points, path } = useMemo(() => buildCurveData(series), [series]);
  const [hoveredIndex, setHoveredIndex] = useState(points.length - 1);
  const activePoint = points[hoveredIndex];

  return (
    <div className="chart-shell">
      <div
        className="chart-tooltip"
        style={{ left: `${(activePoint.x / 280) * 100}%`, top: `${(activePoint.y / 130) * 100}%` }}
      >
        <strong>{activePoint.label}</strong>
        <span>
          {title}: {activePoint.value} {unit}
        </span>
      </div>
      <svg
        className="line-chart"
        viewBox="0 0 280 130"
        onMouseLeave={() => setHoveredIndex(points.length - 1)}
        aria-label={`${title} chart`}
      >
        <path d={path} fill="none" stroke="#fe4b11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={activePoint.x} y1="8" x2={activePoint.x} y2="122" stroke="rgba(17,17,17,0.1)" strokeDasharray="4 4" />
        {points.map((point, index) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r={index === hoveredIndex ? 5 : 3.5}
            fill={index === hoveredIndex ? "#fe4b11" : "#fff"}
            stroke="#fe4b11"
            strokeWidth="2"
            onMouseEnter={() => setHoveredIndex(index)}
          />
        ))}
      </svg>
    </div>
  );
}

function AttentionCard({ item, showDivider }) {
  return (
    <>
      <div className="athlete">
        <div className="athlete-head">
          <div className={`avatar ${item.alt ? "alt" : ""}`}>{item.initials}</div>
          <strong>{item.name}</strong>
        </div>
        <div className="alert-row">
          <div className="alert-box">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <span className={`delta ${item.tone}`}>{item.delta}</span>
        </div>
      </div>
      {showDivider ? <div className="divider"></div> : null}
    </>
  );
}

function ActivityCard({ activity, onEdit, onDelete, onToggleStatus }) {
  return (
    <article className={`activity-card ${activity.status === "done" ? "is-done" : ""}`}>
      <div className="activity-top">
        <div className="avatar-stack">
          {activity.assignees.map((avatar, index) => (
            <div className={`avatar mini ${index % 2 === 1 ? "alt" : ""}`} key={`${activity.id}-${avatar}-${index}`}>
              {avatar}
            </div>
          ))}
        </div>
        <div className="activity-actions">
          <button type="button" className="inline-btn" onClick={() => onEdit(activity)}>
            Edit
          </button>
          <button type="button" className="circle-cta" aria-label={`Edit ${activity.title}`} onClick={() => onEdit(activity)}></button>
        </div>
      </div>
      <div className="activity-meta-line">
        <span className="status-chip">{activity.category}</span>
        <span className="date-chip">{formatDate(activity.date)}</span>
      </div>
      <h3>{activity.title}</h3>
      <p>{formatTime(activity.time)}</p>
      <p className="activity-note">{activity.note}</p>
      <div className="activity-footer">
        <button type="button" className={`toggle-btn ${activity.status === "done" ? "done" : ""}`} onClick={() => onToggleStatus(activity.id)}>
          {activity.status === "done" ? "Completed" : "Mark complete"}
        </button>
        <button type="button" className="inline-btn danger" onClick={() => onDelete(activity.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

function RadarChart({ series }) {
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const cx = 160;
  const cy = 140;
  const levels = 4;
  const maxRadius = 92;
  const maxValue = Math.max(...series.map((entry) => entry.value));
  const normalized = series.map((entry) => ({ ...entry, ratio: entry.value / maxValue }));
  const polygon = normalized
    .map((entry, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / normalized.length;
      return `${cx + Math.cos(angle) * maxRadius * entry.ratio},${cy + Math.sin(angle) * maxRadius * entry.ratio}`;
    })
    .join(" ");
  const hovered = normalized[hoveredIndex];

  return (
    <div className="radar-container">
      <svg className="radar-chart" viewBox="0 0 320 280" aria-label="Team power profile chart">
        {Array.from({ length: levels }, (_, index) => {
          const radius = (maxRadius / levels) * (index + 1);
          return (
            <polygon
              key={radius}
              points={getPolygonPoints(cx, cy, radius, series.length)}
              fill="none"
              stroke="#8e8982"
              strokeWidth="1"
            />
          );
        })}
        {normalized.map((entry, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / normalized.length;
          const axisX = cx + Math.cos(angle) * maxRadius;
          const axisY = cy + Math.sin(angle) * maxRadius;
          const pointX = cx + Math.cos(angle) * maxRadius * entry.ratio;
          const pointY = cy + Math.sin(angle) * maxRadius * entry.ratio;
          const labelX = cx + Math.cos(angle) * (maxRadius + 26);
          const labelY = cy + Math.sin(angle) * (maxRadius + 26);

          return (
            <g key={entry.label}>
              <line x1={cx} y1={cy} x2={axisX} y2={axisY} stroke="#8e8982" strokeWidth="1" />
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#5f5f5b">
                {entry.label}
              </text>
              <circle
                cx={pointX}
                cy={pointY}
                r={index === hoveredIndex ? 6 : 4}
                fill={index === hoveredIndex ? "#fe4b11" : "#fff"}
                stroke="#fe4b11"
                strokeWidth="2"
                onMouseEnter={() => setHoveredIndex(index)}
              />
            </g>
          );
        })}
        <polygon points={polygon} fill="rgba(254, 75, 17, 0.08)" stroke="#fe4b11" strokeWidth="3" />
      </svg>
      <div className="radar-readout">
        <strong>{hovered.label}</strong>
        <span>{hovered.value} watts</span>
      </div>
    </div>
  );
}

function ActivityModal({ formState, setFormState, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Activity editor" onClick={(event) => event.stopPropagation()}>
        <div className="panel-headline">
          <h2>{formState.id ? "Edit activity" : "Add activity"}</h2>
          <button type="button" className="text-btn" onClick={onClose}>
            close
          </button>
        </div>
        <form className="activity-form" onSubmit={onSubmit}>
          <label>
            Title
            <input
              required
              value={formState.title}
              onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <div className="form-row">
            <label>
              Date
              <input
                required
                type="date"
                value={formState.date}
                onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label>
              Time
              <input
                required
                type="time"
                value={formState.time}
                onChange={(event) => setFormState((current) => ({ ...current, time: event.target.value }))}
              />
            </label>
          </div>
          <label>
            Category
            <select
              value={formState.category}
              onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}
            >
              {CATEGORY_OPTIONS.filter((option) => option !== "All").map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignees initials
            <input
              value={formState.assignees}
              onChange={(event) => setFormState((current) => ({ ...current, assignees: event.target.value }))}
              placeholder="ABCD"
            />
          </label>
          <label>
            Notes
            <textarea
              rows="4"
              value={formState.note}
              onChange={(event) => setFormState((current) => ({ ...current, note: event.target.value }))}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="accent-btn">
              Save activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;

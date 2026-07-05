/**
 * Query keys centralizados — Fase 13 / Turno 1.
 * Todas as consultas React Query devem derivar suas chaves daqui para
 * garantir invalidação consistente entre módulos.
 */
export const qk = {
  auth: {
    session: ["auth", "session"] as const,
  },
  profile: {
    me: (userId: string | null | undefined) => ["profile", "me", userId ?? "anon"] as const,
    byUsername: (username: string) => ["profile", "username", username] as const,
    stats: (userId: string | null | undefined) => ["profile", "stats", userId ?? "anon"] as const,
    history: (userId: string | null | undefined) => ["profile", "history", userId ?? "anon"] as const,
    friends: (userId: string | null | undefined) => ["profile", "friends", userId ?? "anon"] as const,
    usernameCheck: (username: string) => ["profile", "usernameCheck", username] as const,
  },
  dashboard: {
    summary: (userId: string | null | undefined) => ["dashboard", "summary", userId ?? "anon"] as const,
    heatmap: (userId: string | null | undefined) => ["dashboard", "heatmap", userId ?? "anon"] as const,
    byDiscipline: (userId: string | null | undefined) => ["dashboard", "byDiscipline", userId ?? "anon"] as const,
    rankingPosition: (slug: string, userId: string | null | undefined) =>
      ["dashboard", "rankingPosition", slug, userId ?? "anon"] as const,
  },
  questions: {
    list: (filter: Record<string, unknown>) => ["questions", "list", filter] as const,
    byId: (id: string) => ["questions", "byId", id] as const,
  },
  notebooks: {
    list: (userId: string | null | undefined, includeArchived: boolean) =>
      ["notebooks", "list", userId ?? "anon", includeArchived] as const,
    byId: (id: string) => ["notebooks", "byId", id] as const,
    questions: (id: string) => ["notebooks", "questions", id] as const,
  },
  review: {
    queue: (userId: string | null | undefined, limit: number) =>
      ["review", "queue", userId ?? "anon", limit] as const,
  },
  plans: {
    today: (userId: string | null | undefined) => ["plans", "today", userId ?? "anon"] as const,
  },
  gamification: {
    missions: (userId: string | null | undefined) => ["gamification", "missions", userId ?? "anon"] as const,
    achievements: (userId: string | null | undefined) => ["gamification", "achievements", userId ?? "anon"] as const,
    rewardHistory: (userId: string | null | undefined, limit: number) =>
      ["gamification", "rewardHistory", userId ?? "anon", limit] as const,
  },
  xp: {
    summary: (userId: string | null | undefined) => ["xp", "summary", userId ?? "anon"] as const,
    progress: () => ["xp", "progress"] as const,
  },
  rankings: {
    top: (slug: string, limit: number) => ["rankings", "top", slug, limit] as const,
    nearby: (slug: string, userId: string | null | undefined, radius: number) =>
      ["rankings", "nearby", slug, userId ?? "anon", radius] as const,
    position: (slug: string, userId: string | null | undefined) =>
      ["rankings", "position", slug, userId ?? "anon"] as const,
    history: (slug: string, userId: string | null | undefined, limit: number) =>
      ["rankings", "history", slug, userId ?? "anon", limit] as const,
    search: (slug: string, q: string) => ["rankings", "search", slug, q] as const,
    league: (userId: string | null | undefined) => ["rankings", "league", userId ?? "anon"] as const,
    season: () => ["rankings", "season"] as const,
  },
  friends: {
    relation: (meuId: string | null | undefined, outroId: string | null | undefined) =>
      ["friends", "relation", meuId ?? "anon", outroId ?? "anon"] as const,
    pending: (userId: string | null | undefined) => ["friends", "pending", userId ?? "anon"] as const,
    list: (userId: string | null | undefined) => ["friends", "list", userId ?? "anon"] as const,
    blocked: (userId: string | null | undefined) => ["friends", "blocked", userId ?? "anon"] as const,
    search: (q: string) => ["friends", "search", q] as const,
  },
  notifications: {
    adminAlerts: () => ["notifications", "adminAlerts"] as const,
  },
  arena: {
    salas: () => ["arena", "salas"] as const,
    sala: (id: string) => ["arena", "sala", id] as const,
    admin: () => ["arena", "admin"] as const,
    mensagens: (salaId: string) => ["arena", "mensagens", salaId] as const,
    questoes: (salaId: string, startedAt: string | null | undefined) =>
      ["arena", "questoes", salaId, startedAt ?? "none"] as const,
    respostas: (salaId: string, startedAt: string | null | undefined) =>
      ["arena", "respostas", salaId, startedAt ?? "none"] as const,
    resultados: (salaId: string, startedAt: string | null | undefined) =>
      ["arena", "resultados", salaId, startedAt ?? "none"] as const,
    progresso: (userId: string | null | undefined) => ["arena", "progresso", userId ?? "anon"] as const,
  },
  simulations: {
    historico: (userId: string | null | undefined, limit: number) =>
      ["simulations", "historico", userId ?? "anon", limit] as const,
    estado: (simId: string) => ["simulations", "estado", simId] as const,
    relatorio: (simId: string) => ["simulations", "relatorio", simId] as const,
    materias: () => ["simulations", "materias"] as const,
    bancas: () => ["simulations", "bancas"] as const,
  },
  studyCycle: {
    all: (userId: string | null | undefined) =>
      ["studyCycle", "all", userId ?? "anon"] as const,
  },
  exams: {
    listActive: () => ["exams", "listActive"] as const,
    listAll: () => ["exams", "listAll"] as const,
    my: (userId: string | null | undefined) =>
      ["exams", "my", userId ?? "anon"] as const,
    progress: (editalId: string | null | undefined) =>
      ["exams", "progress", editalId ?? "none"] as const,
    dailyGoal: (minutos: number) => ["exams", "dailyGoal", minutos] as const,
    disciplines: (editalId: string) =>
      ["exams", "disciplines", editalId] as const,
  },
  stats: {
    dashboard: (userId: string | null | undefined) => ["stats", "dashboard", userId ?? "anon"] as const,
    evolucao: (userId: string | null | undefined, dias: number) => ["stats", "evolucao", userId ?? "anon", dias] as const,
    disciplinas: (userId: string | null | undefined) => ["stats", "disciplinas", userId ?? "anon"] as const,
    heatmap: (userId: string | null | undefined) => ["stats", "heatmap", userId ?? "anon"] as const,
    recomendacoes: (userId: string | null | undefined) => ["stats", "recomendacoes", userId ?? "anon"] as const,
  },
  performance: {
    resumo: (userId: string | null | undefined) => ["performance", "resumo", userId ?? "anon"] as const,
  },
  recommendations: {
    planoHoje: (userId: string | null | undefined) => ["recommendations", "planoHoje", userId ?? "anon"] as const,
    config: (userId: string | null | undefined) => ["recommendations", "config", userId ?? "anon"] as const,
  },
  explanations: {
    ativa: (questaoId: string | null | undefined) => ["explanations", "ativa", questaoId ?? "none"] as const,
  },
  history: {
    list: (userId: string | null | undefined) => ["history", "list", userId ?? "anon"] as const,
  },
  calendar: {
    list: (userId: string | null | undefined) => ["calendar", "list", userId ?? "anon"] as const,
  },
  timer: {
    sessoes: (userId: string | null | undefined) => ["timer", "sessoes", userId ?? "anon"] as const,
  },
  ai: {
    insights: (userId: string | null | undefined) => ["ai", "insights", userId ?? "anon"] as const,
    diagnosis: (userId: string | null | undefined) => ["ai", "diagnosis", userId ?? "anon"] as const,
    priorities: (userId: string | null | undefined) => ["ai", "priorities", userId ?? "anon"] as const,
    recommendations: (userId: string | null | undefined) => ["ai", "recommendations", userId ?? "anon"] as const,
  },
  questionEngine: {
    random: (userId: string | null | undefined, filters: Record<string, unknown>) =>
      ["questionEngine", "random", userId ?? "anon", filters] as const,
    bySubject: (userId: string | null | undefined, filters: Record<string, unknown>) =>
      ["questionEngine", "bySubject", userId ?? "anon", filters] as const,
    review: (userId: string | null | undefined, limit: number) =>
      ["questionEngine", "review", userId ?? "anon", limit] as const,
    daily: (userId: string | null | undefined, filters: Record<string, unknown>) =>
      ["questionEngine", "daily", userId ?? "anon", filters] as const,
    simulation: (userId: string | null | undefined, filters: Record<string, unknown>) =>
      ["questionEngine", "simulation", userId ?? "anon", filters] as const,
    adaptive: (userId: string | null | undefined, filters: Record<string, unknown>) =>
      ["questionEngine", "adaptive", userId ?? "anon", filters] as const,
  },
  reviews: {
    schedule: (userId: string | null | undefined, filters: Record<string, unknown>) =>
      ["reviews", "schedule", userId ?? "anon", filters] as const,
    dueToday: (userId: string | null | undefined, limit: number) =>
      ["reviews", "dueToday", userId ?? "anon", limit] as const,
    statistics: (userId: string | null | undefined) =>
      ["reviews", "statistics", userId ?? "anon"] as const,
  },
  missions: {
    daily: (userId: string | null | undefined) => ["missions", "daily", userId ?? "anon"] as const,
    weekly: (userId: string | null | undefined) => ["missions", "weekly", userId ?? "anon"] as const,
    all: (userId: string | null | undefined) => ["missions", "all", userId ?? "anon"] as const,
    statistics: (userId: string | null | undefined) => ["missions", "statistics", userId ?? "anon"] as const,
  },
} as const;

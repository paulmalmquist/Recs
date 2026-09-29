export type Domain = 'Manufacturing' | 'Quality' | 'Supply chain' | 'Engineering' | 'Finance' | 'Data platform';
export type Warning = {
    level: 'notice' | 'warning' | 'critical';
    title: string;
    detail: string;
};
export type AppRecord = {
    id: string;
    name: string;
    domain: Domain;
    summary: string;
    question: string;
    owner: string;
    tags: string[];
    datasets: string[];
    roles: string[];
    audiences: string[];
    color: string;
    certified: boolean;
    freshness: string;
    warning?: Warning;
    newApp?: boolean;
    metric: {
        label: string;
        value: string;
        change: string;
    };
    series: number[];
    weeklyUsers: number;
    teamUse: Record<string, number>;
    historyLabel: string;
    status: 'active' | 'retired';
};
export type Persona = {
    id: string;
    name: string;
    role: string;
    team: string;
    initials: string;
    domains: Partial<Record<Domain, number>>;
    datasets: string[];
    recent: string[];
    description: string;
};
export type EventRecord = {
    app_id: string;
    event_type: string;
    created_at: string;
};
export type RankedApp = AppRecord & {
    score: number;
    reason: string;
    signals: {
        label: string;
        points: number;
    }[];
    saved: boolean;
};
export type AppState = {
    apps: RankedApp[];
    personas: Persona[];
    persona: Persona;
    myList: string[];
    dismissed: string[];
    displayName: string;
    updatedAt: string;
    modelVersion: string;
    mode: 'synthetic';
    counts: {
        available: number;
        certified: number;
        warnings: number;
    };
};

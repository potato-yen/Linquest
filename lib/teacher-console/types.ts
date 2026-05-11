import { ActivityStatus } from '../territory/types';

export const TEACHER_CONSOLE_DEFAULTS = {
  group_count_default: 4,
  group_count_min: 2,
  group_count_max: 10,
  map_size_default: 80,
  map_size_min: 50,
  map_size_max: 120,
  refresh_interval_default_hours: 12,
  refresh_interval_choices: [6, 8, 12, 24] as const,
  ends_at_min_offset_minutes: 5,
  sudden_death_window_hours: 12,
  mistakes_default_limit: 10,
  mistakes_max_limit: 50,
  group_color_palette: [
    '#7E5A3A', '#5A7E3A', '#3A5A7E', '#7E3A5A', '#3A7E5A',
    '#7E7E3A', '#3A7E7E', '#7E3A3A', '#5A3A7E', '#3A3A7E',
  ] as const,
} as const;

export interface ActivityDraftInput {
  class_id: string;
  name: string;
  ends_at: string;
  question_bank_id: string;
  group_count: number;
  map_size_target: number;
  refresh_interval_hours: 6 | 8 | 12 | 24;
}

export interface PublishGroupRow {
  group_id: string;
  member_count: number;
}

export interface TeacherActivitySummary {
  id: string;
  name: string;
  status: ActivityStatus;
  class_id: string;
  starts_at: string | null;
  ends_at: string;
  sudden_death_started_at: string | null;
  effective_end_at: string | null;
}

export interface TeacherConsoleGroupDashboardRow {
  id: string;
  name: string;
  color: string;
  treasury: number;
  owned_count: number;
  member_count: number;
}

export interface TeacherConsoleMapSummary {
  total_tiles: number;
  neutral_count: number;
  capital_count: number;
  special_count: number;
  multiplier_count: number;
}

export interface TeacherConsoleDashboard {
  activity: {
    id: string;
    name: string;
    status: ActivityStatus;
    starts_at: string | null;
    ends_at: string;
    sudden_death_started_at: string | null;
    effective_end_at: string | null;
    time_remaining_seconds: number;
  };
  groups: TeacherConsoleGroupDashboardRow[];
  map_summary: TeacherConsoleMapSummary;
}

export interface TeacherConsoleMistakeRow {
  question_id: string;
  prompt: string;
  wrong_count: number;
}

export interface TeacherConsoleAccuracyBucket {
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface TeacherConsoleAccuracy {
  overall: TeacherConsoleAccuracyBucket;
  by_context: {
    territory: TeacherConsoleAccuracyBucket;
    battle: TeacherConsoleAccuracyBucket;
  };
}

export interface TeacherConsoleSettlementRankingRow {
  group_id: string;
  name: string;
  color: string;
  rank: number;
}

export interface TeacherConsoleTreasuryRankingRow extends TeacherConsoleSettlementRankingRow {
  treasury: number;
}

export interface TeacherConsoleTerritoryRankingRow extends TeacherConsoleSettlementRankingRow {
  owned_count: number;
}

export interface TeacherConsoleSettlement {
  rankings_treasury: TeacherConsoleTreasuryRankingRow[];
  rankings_territory: TeacherConsoleTerritoryRankingRow[];
  common_mistakes: TeacherConsoleMistakeRow[];
  accuracy: TeacherConsoleAccuracy;
}

export interface TeacherConsoleActivitySettings {
  group_count: number;
  map_size_target: number;
  refresh_interval_hours: 6 | 8 | 12 | 24;
}

export interface PublishActivityContext {
  settings: TeacherConsoleActivitySettings;
}

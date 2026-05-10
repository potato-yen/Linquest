export type TileKind = 'normal' | 'multiplier' | 'special';
export type Multiplier = 2 | 3;
export type Difficulty = 'standard' | 'advanced';
export type RefreshPolicy = 'normal' | 'endgame_all_special';
export type ActivityStatus = 'draft' | 'active' | 'ended';

export type ChallengeKind =
  | 'capture_normal'
  | 'reverse_normal'
  | 'capture_multiplier'
  | 'reverse_multiplier'
  | 'self_recapture_multiplier'
  | 'capture_special';

export type EventType =
  | 'capture'
  | 'reverse_attack_win'
  | 'reverse_attack_fail'
  | 'multiplier_self_recapture'
  | 'refresh_buff_applied'
  | 'refresh_buff_expired'
  | 'tax_tick'
  | 'challenge_cost';

export interface AxialCoord {
  q: number;
  r: number;
}

export interface HexTile {
  id: string;
  map_id: string;
  q: number;
  r: number;
  kind: TileKind;
  multiplier: Multiplier | null;
  owner_group_id: string | null;
  is_capital: boolean;
  protected_until: string | null;
  active_challenge_user_id: string | null;
  active_challenge_until: string | null;
  active_battle_id: string | null;
  last_refresh_wave_id: string | null;
  last_taken_at: string | null;
}

export interface ChallengeSpec {
  kind: ChallengeKind;
  question_count: number;
  difficulty: Difficulty;
  cost: number;
  success_reward: number;
  fail_attacker_delta: number;
  fail_defender_delta: number;
  applies_cooldown_on_success: boolean;
  applies_cooldown_on_fail: boolean;
}

export const TERRITORY_DEFAULTS = {
  map_size_target: 80,
  refresh_interval_hours: 12,
  multiplier_ratio: 0.12,
  multiplier_2x_3x_split: [0.7, 0.3] as [number, number],
  special_ratio: 0.08,
  endgame_threshold: 0.15,
  tile_cooldown_minutes: 5,
  challenge_lock_seconds: 90,
  battle_invite_timeout_minutes: 5,
  treasury_starting_per_member: 25,
  tax_per_owned_tile_per_hour: 1,
  relief_threshold_treasury: 10,
  reverse_attack_reward_factor: 1.25,
  reverse_attack_fail_factor: 1.5,
  initial_territory_per_member_factor: 1.5,
  min_inter_capital_distance_factor: 0.4,
  cost_normal: 10,
  cost_2x: 20,
  cost_3x: 30,
  cost_special: 50,
  roi_factor: 1.6,
} as const;

export type TerritoryParams = typeof TERRITORY_DEFAULTS;

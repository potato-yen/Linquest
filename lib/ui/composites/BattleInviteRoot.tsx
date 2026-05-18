import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { BattleInviteToast } from '../components/BattleInviteToast';
import { useSession } from '../session/useSession';
import { getSupabaseClient } from '../../supabase';
import { acceptBattleInvite, declineBattleInvite } from '../../realtime-battle/service';
import { BattleRow, REALTIME_BATTLE_DEFAULTS } from '../../realtime-battle/types';

interface IncomingInvite {
  battle_id: string;
  challenger_name: string;
  challenger_color: string;
  expires_at: string;
}

export function buildInviteDeadline(createdAt: string): string {
  const createdAtMs = Date.parse(createdAt);
  return new Date(
    createdAtMs + REALTIME_BATTLE_DEFAULTS.battle_invite_timeout_minutes * 60_000,
  ).toISOString();
}

async function toIncomingInvite(sb: ReturnType<typeof getSupabaseClient>, battle: BattleRow): Promise<IncomingInvite | null> {
  if (battle.status !== 'pending_invite') {
    return null;
  }

  const [{ data: u }, { data: gm }] = await Promise.all([
    sb.from('users').select('display_name').eq('id', battle.challenger_user_id).single(),
    sb
      .from('group_members')
      .select('groups!inner(color)')
      .eq('user_id', battle.challenger_user_id)
      .maybeSingle(),
  ]);

  return {
    battle_id: battle.id,
    challenger_name: (u as any)?.display_name ?? '挑戰者',
    challenger_color: (gm as any)?.groups?.color ?? '#5A7E3A',
    expires_at: buildInviteDeadline(battle.created_at),
  };
}

async function findPendingInvite(
  sb: ReturnType<typeof getSupabaseClient>,
  defenderUserId: string,
): Promise<IncomingInvite | null> {
  const { data } = await sb
    .from('battles')
    .select('*')
    .eq('defender_user_id', defenderUserId)
    .eq('status', 'pending_invite')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return toIncomingInvite(sb, data as BattleRow);
}

export function BattleInviteRoot() {
  const s = useSession();
  const sb = useRef(getSupabaseClient()).current;
  const [invite, setInvite] = useState<IncomingInvite | null>(null);

  useEffect(() => {
    if (s.status !== 'auth') return;
    let cancelled = false;
    const syncInvite = async () => {
      const nextInvite = await findPendingInvite(sb, s.user.id);
      if (!cancelled) {
        setInvite(nextInvite);
      }
    };

    const channel = sb
      .channel(`invites:${s.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battles',
          filter: `defender_user_id=eq.${s.user.id}`,
        },
        async (payload) => {
          const b = payload.new as BattleRow;
          const nextInvite = await toIncomingInvite(sb, b);
          if (!cancelled) {
            setInvite(nextInvite);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void syncInvite();
        }
      });

    void syncInvite();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [s, sb]);

  if (!invite) return null;

  return (
    <BattleInviteToast
      visible
      challengerName={invite.challenger_name}
      challengerColor={invite.challenger_color}
      deadline={invite.expires_at}
      onAccept={async () => {
        const id = invite.battle_id;
        setInvite(null);
        await acceptBattleInvite(sb, id);
        router.push(`/battle/${id}` as any);
      }}
      onDecline={async () => {
        const id = invite.battle_id;
        setInvite(null);
        await declineBattleInvite(sb, id).catch(() => {});
      }}
    />
  );
}

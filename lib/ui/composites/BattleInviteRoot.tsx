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

export function BattleInviteRoot() {
  const s = useSession();
  const sb = useRef(getSupabaseClient()).current;
  const [invite, setInvite] = useState<IncomingInvite | null>(null);

  useEffect(() => {
    if (s.status !== 'auth') return;
    const userId = s.user.id;

    // Initial hydration: check for existing pending invites
    async function fetchInitialInvite() {
      const { data: battles } = await sb
        .from('battles')
        .select('*')
        .eq('defender_user_id', userId)
        .eq('status', 'pending_invite')
        .order('created_at', { ascending: false })
        .limit(1);

      if (battles && battles.length > 0) {
        const b = battles[0] as BattleRow;
        // Check if it's already expired
        const expiresAt = new Date(
          new Date(b.created_at).getTime() +
            REALTIME_BATTLE_DEFAULTS.battle_invite_timeout_minutes * 60 * 1000,
        ).getTime();

        if (expiresAt > Date.now()) {
          const [{ data: u }, { data: gm }] = await Promise.all([
            sb.from('users').select('display_name').eq('id', b.challenger_user_id).single(),
            sb
              .from('group_members')
              .select('groups!inner(color)')
              .eq('user_id', b.challenger_user_id)
              .maybeSingle(),
          ]);

          setInvite({
            battle_id: b.id,
            challenger_name: (u as any)?.display_name ?? '挑戰者',
            challenger_color: (gm as any)?.groups?.color ?? '#5A7E3A',
            expires_at: new Date(expiresAt).toISOString(),
          });
        }
      }
    }

    fetchInitialInvite();

    const channel = sb
      .channel(`invites:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battles',
          filter: `defender_user_id=eq.${userId}`,
        },
        async (payload) => {
          const b = payload.new as BattleRow;
          if (b.status !== 'pending_invite') return;
          const [{ data: u }, { data: gm }] = await Promise.all([
            sb.from('users').select('display_name').eq('id', b.challenger_user_id).single(),
            sb
              .from('group_members')
              .select('groups!inner(color)')
              .eq('user_id', b.challenger_user_id)
              .maybeSingle(),
          ]);

          const expiresAt = new Date(
            new Date(b.created_at).getTime() +
              REALTIME_BATTLE_DEFAULTS.battle_invite_timeout_minutes * 60 * 1000,
          ).toISOString();

          setInvite({
            battle_id: b.id,
            challenger_name: (u as any)?.display_name ?? '挑戰者',
            challenger_color: (gm as any)?.groups?.color ?? '#5A7E3A',
            expires_at: expiresAt,
          });
        },
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [s.status, sb]);

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

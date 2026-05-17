import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { BattleInviteToast } from '../components/BattleInviteToast';
import { useSession } from '../session/useSession';
import { getSupabaseClient } from '../../supabase';
import { acceptBattleInvite, declineBattleInvite } from '../../realtime-battle/service';
import { BattleRow } from '../../realtime-battle/types';

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
          if (b.status !== 'pending_invite') return;
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
            expires_at: b.created_at,
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

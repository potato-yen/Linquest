import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  ScreenScaffold, Text, Skeleton, ErrorState, EmptyState,
  Card, Pressable, Button, Input,
} from '../../../lib/ui/components';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../lib/supabase';
import { listMyClasses, createClass } from '../../../lib/classes/service';
import { space } from '../../../lib/ui/tokens';

export default function ConsoleClassList() {
  const sb = getSupabaseClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const { state, refresh } = useScreenData(async (_signal) => {
    const classes = await listMyClasses(sb);
    return classes.length > 0 ? classes : null;
  }, []);

  async function onCreate() {
    if (!name.trim()) return;
    const cls = await createClass(sb, { name: name.trim() });
    setName('');
    setCreating(false);
    router.push(`/console/class/${cls.id}`);
  }

  return (
    <ScreenScaffold scroll>
      <Text variant="h1">我的班級</Text>
      <View style={{ gap: space[3], marginTop: space[3] }}>
        {state.status === 'loading' ? (
          <Skeleton height={200} />
        ) : state.status === 'error' ? (
          <ErrorState error={state.error} onRetry={refresh} />
        ) : state.status === 'empty' ? (
          <EmptyState title="尚無班級" body="建立第一個班級，把 class code 分享給學生加入。" />
        ) : (
          state.data.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/console/class/${c.id}`)}>
              <Card>
                <Text variant="h3">{c.name}</Text>
                <Text color="muted">代碼 {c.class_code}</Text>
              </Card>
            </Pressable>
          ))
        )}

        {creating ? (
          <Card>
            <Input placeholder="班級名稱" value={name} onChangeText={setName} />
            <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
              <View style={{ flex: 1 }}>
                <Button title="取消" variant="ghost" onPress={() => setCreating(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="建立" onPress={onCreate} />
              </View>
            </View>
          </Card>
        ) : (
          <View style={{ marginTop: space[2] }}>
            <Button title="＋ 建立班級" onPress={() => setCreating(true)} />
          </View>
        )}
      </View>
    </ScreenScaffold>
  );
}

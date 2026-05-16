// app/(app)/territory/join.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold, Text, Input, Button } from '../../../lib/ui/components';
import { joinByCode } from '../../../lib/classes/service';
import { getSupabaseClient } from '../../../lib/supabase';
import { classCodeValidator } from '../../../lib/ui/forms/validators';
import { mapError } from '../../../lib/ui/error/mapError';
import { space } from '../../../lib/ui/tokens';

export default function Join() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true); setErr(null);
    try {
      await joinByCode(getSupabaseClient(), code.toUpperCase());
      router.replace('/(app)/territory');
    } catch (e) {
      setErr(mapError(e).message);
    } finally { setBusy(false); }
  }

  return (
    <ScreenScaffold scroll>
      <View style={{ gap: space[5], marginTop: space[5] }}>
        <Text variant="h1">加入班級</Text>
        <Text color="muted">輸入老師提供的 6 位班級代碼。</Text>
        <Input
          label="班級代碼"
          value={code}
          onChangeText={(s) => setCode(s.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />
        {err ? <Text color="warm">{err}</Text> : null}
        <Button
          title="加入"
          onPress={onSubmit}
          disabled={!classCodeValidator(code) || busy}
          loading={busy}
        />
        <Button title="返回" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenScaffold>
  );
}

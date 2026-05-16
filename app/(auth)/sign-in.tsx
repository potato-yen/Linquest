// app/(auth)/sign-in.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { Link, router } from 'expo-router';
import { ScreenScaffold, Text, Input, Button } from '../../lib/ui/components';
import { space } from '../../lib/ui/tokens';
import { signIn } from '../../lib/auth/service';
import { getSupabaseClient } from '../../lib/supabase';
import { emailValidator } from '../../lib/ui/forms/validators';
import { mapError } from '../../lib/ui/error/mapError';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = emailValidator(email) && pwd.length >= 8 && !busy;

  async function onSubmit() {
    setBusy(true); setErr(null);
    try {
      await signIn(getSupabaseClient(), { email, password: pwd });
      router.replace('/(app)/home');
    } catch (e) {
      setErr(mapError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScaffold scroll>
      <View style={{ gap: space[5], marginTop: space[6] }}>
        <Text variant="h1">登入 Linquest</Text>
        <Text variant="body" color="muted">繼續你的單字旅程</Text>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="密碼" value={pwd} onChangeText={setPwd} secureTextEntry />
        {err ? <Text color="warm">{err}</Text> : null}
        <Button title="登入" onPress={onSubmit} disabled={!canSubmit} loading={busy} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Link href="/(auth)/sign-up"><Text color="brand">建立帳號</Text></Link>
          <Link href="/(auth)/forgot-password"><Text color="muted">忘記密碼？</Text></Link>
        </View>
      </View>
    </ScreenScaffold>
  );
}

// app/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { ScreenScaffold, Text, Input, Button } from '../../lib/ui/components';
import { space } from '../../lib/ui/tokens';
import { getSupabaseClient } from '../../lib/supabase';
import { emailValidator } from '../../lib/ui/forms/validators';
import { mapError } from '../../lib/ui/error/mapError';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const sb = getSupabaseClient();
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setMsg('重設信已寄出，請檢查信箱。');
    } catch (e) {
      setErr(mapError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScaffold scroll>
      <View style={{ gap: space[5], marginTop: space[6] }}>
        <Text variant="h1">忘記密碼</Text>
        <Text variant="body" color="muted">輸入信箱，我們會寄出重設連結。</Text>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        {err ? <Text color="warm">{err}</Text> : null}
        {msg ? <Text color="brand">{msg}</Text> : null}
        <Button title="寄出重設信" onPress={onSubmit} disabled={!emailValidator(email) || busy} loading={busy} />
        <Link href="/(auth)/sign-in"><Text color="brand">返回登入</Text></Link>
      </View>
    </ScreenScaffold>
  );
}

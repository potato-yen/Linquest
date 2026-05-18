// app/(auth)/sign-up.tsx
import React, { useState } from 'react';
import { View, Pressable as RNPressable } from 'react-native';
import { Link, router } from 'expo-router';
import { ScreenScaffold, Text, Input, Button } from '../../lib/ui/components';
import { color, radius, space } from '../../lib/ui/tokens';
import { signUp } from '../../lib/auth/service';
import { getSupabaseClient } from '../../lib/supabase';
import { emailValidator, passwordValidator } from '../../lib/ui/forms/validators';
import { mapError } from '../../lib/ui/error/mapError';
import type { Role } from '../../lib/auth/types';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = emailValidator(email) && passwordValidator(pwd) && name.trim().length > 0 && !busy;

  async function onSubmit() {
    setBusy(true); setErr(null);
    try {
      const res = await signUp(getSupabaseClient(), { email, password: pwd, display_name: name.trim(), role });
      if (res.session) {
        // Email confirmation disabled → already signed in. Skip the sign-in
        // screen; the session listener has the session, home routes by role.
        router.replace('/(app)/home');
      } else {
        // Email confirmation required → can't auto-login until confirmed.
        setErr('帳號已建立。請至信箱完成驗證後再登入。');
        setTimeout(() => router.replace('/(auth)/sign-in'), 1500);
      }
    } catch (e) {
      setErr(mapError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScaffold scroll>
      <View style={{ gap: space[5], marginTop: space[6] }}>
        <Text variant="h1">建立帳號</Text>
        <Input label="顯示名稱" value={name} onChangeText={setName} />
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="密碼（至少 8 字元）" value={pwd} onChangeText={setPwd} secureTextEntry />
        <View style={{ gap: space[2] }}>
          <Text variant="label" color="secondary">身份</Text>
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            {(['student', 'teacher'] as Role[]).map((r) => (
              <RNPressable key={r} onPress={() => setRole(r)} style={{
                flex: 1, paddingVertical: space[3], borderRadius: radius.md,
                backgroundColor: role === r ? color.brand.primary : color.bg.muted,
                alignItems: 'center',
              }}>
                <Text style={{ color: role === r ? color.text.onPrimary : color.text.primary }}>
                  {r === 'student' ? '學生' : '教師'}
                </Text>
              </RNPressable>
            ))}
          </View>
        </View>
        {err ? <Text color="warm">{err}</Text> : null}
        <Button title="註冊" onPress={onSubmit} disabled={!canSubmit} loading={busy} />
        <Link href="/(auth)/sign-in"><Text color="brand">已有帳號？登入</Text></Link>
      </View>
    </ScreenScaffold>
  );
}

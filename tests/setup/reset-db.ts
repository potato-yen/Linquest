import { makeServiceClient } from './supabase-test-client';

function assertIntegrationTestsEnabled() {
  if (process.env.SUPABASE_INTEGRATION_TESTS !== '1') {
    throw new Error('Destructive hosted integration tests require SUPABASE_INTEGRATION_TESTS=1');
  }
}

export async function resetDb() {
  assertIntegrationTestsEnabled();

  const sb = makeServiceClient();

  const { data: users, error: listError } = await sb.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const userIds = (users.users || []).map((user) => user.id);

  if (userIds.length > 0) {
    await sb.from('class_members').delete().in('user_id', userIds);
    await sb.from('classes').delete().in('owner_teacher_id', userIds);
    await sb.from('attempts').delete().in('user_id', userIds);
    await sb.from('users').delete().in('id', userIds);
  }

  await sb.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('question_banks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb
    .from('territory_events')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  for (const user of users.users || []) {
    await sb.auth.admin.deleteUser(user.id);
  }
}

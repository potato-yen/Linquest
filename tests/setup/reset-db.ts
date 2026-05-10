import { makeServiceClient } from './supabase-test-client';

function assertIntegrationTestsEnabled() {
  if (process.env.SUPABASE_INTEGRATION_TESTS !== '1') {
    throw new Error('Destructive hosted integration tests require SUPABASE_INTEGRATION_TESTS=1');
  }
}

function assertHostedTestProject(url: string) {
  const expectedProjectRef = process.env.SUPABASE_TEST_PROJECT_REF;

  if (!expectedProjectRef || expectedProjectRef === 'YOUR_TEST_PROJECT_REF') {
    throw new Error('SUPABASE_TEST_PROJECT_REF must point to a dedicated hosted test project');
  }

  const actualProjectRef = new URL(url).hostname.split('.')[0];

  if (actualProjectRef !== expectedProjectRef) {
    throw new Error(
      `Integration tests are pointed at ${actualProjectRef}, but SUPABASE_TEST_PROJECT_REF expects ${expectedProjectRef}`,
    );
  }
}

async function listAllUsers() {
  const sb = makeServiceClient();
  const perPage = 100;
  const users: Array<{ id: string }> = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const batch = data.users || [];
    users.push(...batch);

    if (batch.length < perPage) {
      return users;
    }
  }
}

export async function resetDb() {
  assertIntegrationTestsEnabled();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is required for hosted integration tests');
  }

  assertHostedTestProject(url);

  const sb = makeServiceClient();
  const users = await listAllUsers();
  const userIds = users.map((user) => user.id);

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

  for (const user of users) {
    await sb.auth.admin.deleteUser(user.id);
  }
}

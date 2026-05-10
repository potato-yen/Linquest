import * as dotenv from 'dotenv';

dotenv.config();

const integrationTestsEnabled = process.env.SUPABASE_INTEGRATION_TESTS === '1';

if (!integrationTestsEnabled) {
  process.env.EXPO_PUBLIC_SUPABASE_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
}

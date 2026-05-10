import * as fs from 'fs';
import * as path from 'path';
import { signIn, signUp } from '../../lib/auth/service';
import { seedBank } from '../../lib/question-bank/seed';
import {
  listBanks,
  listQuestionsByDifficulty,
} from '../../lib/question-bank/service';
import { makeAnonClient, makeServiceClient } from '../setup/supabase-test-client';
import { resetDb } from '../setup/reset-db';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('question-bank service', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('seedBank inserts a bank and questions; listBanks returns it', async () => {
    const csv = fs.readFileSync(
      path.join(__dirname, '../../supabase/seed/sample-bank.csv'),
      'utf-8',
    );

    const serviceClient = makeServiceClient();
    await seedBank(serviceClient, { bank_name: 'sample', csv });

    const sb = makeAnonClient();
    await signUp(sb, {
      email: 'u@test.com',
      password: 'pw-12345678',
    });
    await signIn(sb, {
      email: 'u@test.com',
      password: 'pw-12345678',
    });

    const banks = await listBanks(sb);
    expect(banks.find((bank) => bank.name === 'sample')).toBeDefined();
  });

  it('listQuestionsByDifficulty filters by meta.difficulty', async () => {
    const csv = fs.readFileSync(
      path.join(__dirname, '../../supabase/seed/sample-bank.csv'),
      'utf-8',
    );

    const serviceClient = makeServiceClient();
    const seeded = await seedBank(serviceClient, { bank_name: 'sample', csv });

    const sb = makeAnonClient();
    await signUp(sb, {
      email: 'u@test.com',
      password: 'pw-12345678',
    });
    await signIn(sb, {
      email: 'u@test.com',
      password: 'pw-12345678',
    });

    const advanced = await listQuestionsByDifficulty(
      sb,
      seeded.bank_id,
      'advanced',
    );
    expect(advanced.length).toBe(3);
    expect(advanced.every((question) => question.meta.difficulty === 'advanced')).toBe(true);

    const standard = await listQuestionsByDifficulty(
      sb,
      seeded.bank_id,
      'standard',
    );
    expect(standard.length).toBe(2);
  });
});

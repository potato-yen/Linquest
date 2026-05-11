import { SupabaseClient } from '@supabase/supabase-js';
import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { createActivityDraft, publishActivity } from '../../../lib/teacher-console/service';
import { makeAnonClient, makeServiceClient } from '../../setup/supabase-test-client';

export interface TeacherConsoleFixture {
  teacherSb: SupabaseClient;
  serviceSb: SupabaseClient;
  classId: string;
  teacherId: string;
  studentIds: string[];
  bankId: string;
}

export async function setupTeacherConsoleFixture(options?: {
  studentCount?: number;
}): Promise<TeacherConsoleFixture> {
  const studentCount = options?.studentCount ?? 6;

  const teacherSb = makeAnonClient();
  await signUp(teacherSb, {
    email: 'teacher-console@test.com',
    password: 'pw-12345678',
    role: 'teacher',
  });
  await signIn(teacherSb, {
    email: 'teacher-console@test.com',
    password: 'pw-12345678',
  });

  const {
    data: { session },
  } = await teacherSb.auth.getSession();
  const teacherId = session!.user.id;

  const classroom = await createClass(teacherSb, { name: 'Teacher Console Class' });
  const serviceSb = makeServiceClient();
  const studentIds: string[] = [];

  for (let index = 0; index < studentCount; index += 1) {
    const studentSb = makeAnonClient();
    const email = `teacher-console-student-${index}@test.com`;
    await signUp(studentSb, {
      email,
      password: 'pw-12345678',
      role: 'student',
    });
    await signIn(studentSb, {
      email,
      password: 'pw-12345678',
    });

    const {
      data: { session: studentSession },
    } = await studentSb.auth.getSession();
    studentIds.push(studentSession!.user.id);
  }

  await serviceSb.from('class_members').insert(
    studentIds.map((user_id) => ({
      class_id: classroom.id,
      user_id,
    })),
  );

  const { data: bank, error: bankError } = await serviceSb
    .from('question_banks')
    .insert({
      name: 'teacher-console-bank',
      source: 'official',
    })
    .select()
    .single();

  if (bankError || !bank) {
    throw bankError ?? new Error('question bank insert failed');
  }

  const questions = Array.from({ length: 60 }, (_, index) => ({
    bank_id: bank.id,
    prompt: `teacher-console-question-${index}`,
    correct_answer: `answer-${index}`,
    distractors: [`wrong-a-${index}`, `wrong-b-${index}`, `wrong-c-${index}`],
    meta: {
      difficulty: index < 20 ? 'advanced' : 'standard',
    },
  }));

  const { error: questionError } = await serviceSb.from('questions').insert(questions);
  if (questionError) {
    throw questionError;
  }

  return {
    teacherSb,
    serviceSb,
    classId: classroom.id,
    teacherId,
    studentIds,
    bankId: bank.id,
  };
}

export async function createDraftActivity(
  fixture: TeacherConsoleFixture,
  options?: {
    name?: string;
    ends_at?: string;
    group_count?: number;
    map_size_target?: number;
    refresh_interval_hours?: 6 | 8 | 12 | 24;
  },
): Promise<string> {
  return createActivityDraft(fixture.teacherSb, {
    class_id: fixture.classId,
    name: options?.name ?? 'Teacher Console Activity',
    ends_at: options?.ends_at ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    question_bank_id: fixture.bankId,
    group_count: options?.group_count ?? 3,
    map_size_target: options?.map_size_target ?? 60,
    refresh_interval_hours: options?.refresh_interval_hours ?? 12,
  });
}

export async function createPublishedActivity(
  fixture: TeacherConsoleFixture,
  options?: Parameters<typeof createDraftActivity>[1],
): Promise<string> {
  const activityId = await createDraftActivity(fixture, options);
  await publishActivity(fixture.teacherSb, activityId);
  return activityId;
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Class, ClassRosterRow } from './types';

const CLASS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateClassCode(): string {
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += CLASS_CODE_ALPHABET[Math.floor(Math.random() * CLASS_CODE_ALPHABET.length)];
  }

  return code;
}

export interface CreateClassInput {
  name: string;
}

export async function createClass(
  sb: SupabaseClient,
  input: CreateClassInput,
): Promise<Class> {
  const {
    data: { session },
  } = await sb.auth.getSession();

  const teacherId = session?.user.id;
  if (!teacherId) {
    throw new Error('not authenticated');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const classCode = generateClassCode();
    const { data, error } = await sb
      .from('classes')
      .insert({
        name: input.name,
        class_code: classCode,
        owner_teacher_id: teacherId,
      })
      .select()
      .single();

    if (!error) {
      return data as Class;
    }

    if (error.code !== '23505') {
      throw error;
    }
  }

  throw new Error('failed to generate unique class_code after 5 attempts');
}

export async function joinByCode(
  sb: SupabaseClient,
  classCode: string,
): Promise<void> {
  // Resolve the code + self-join via a SECURITY DEFINER RPC. A not-yet-member
  // student cannot SELECT the class row directly (classes RLS only exposes
  // rows to its owner or existing members), so the lookup must bypass RLS.
  // See migration 20260517120000_join_class_by_code_rpc.sql.
  const { error } = await sb.rpc('join_class_by_code', { p_code: classCode });

  if (error) {
    if (/CLASS_NOT_FOUND/.test(error.message)) {
      throw new Error(`class with code ${classCode} not found`);
    }
    throw error;
  }
}

export async function listMyClasses(sb: SupabaseClient): Promise<Class[]> {
  const {
    data: { session },
  } = await sb.auth.getSession();

  const userId = session?.user.id;
  if (!userId) {
    throw new Error('not authenticated');
  }

  const { data: owned, error: ownedError } = await sb
    .from('classes')
    .select('*')
    .eq('owner_teacher_id', userId);

  if (ownedError) {
    throw ownedError;
  }

  const { data: memberships, error: membershipError } = await sb
    .from('class_members')
    .select('class_id, classes(*)')
    .eq('user_id', userId);

  if (membershipError) {
    throw membershipError;
  }

  const classes = new Map<string, Class>();

  for (const classRow of owned ?? []) {
    classes.set(classRow.id, classRow as Class);
  }

  for (const membership of memberships ?? []) {
    const relatedClass = (
      membership as { classes?: Class | Class[] | null }
    ).classes;
    const normalizedClasses = Array.isArray(relatedClass)
      ? relatedClass
      : relatedClass
        ? [relatedClass]
        : [];

    for (const classRow of normalizedClasses) {
      classes.set(classRow.id, classRow);
    }
  }

  return Array.from(classes.values());
}

export async function deleteClass(
  sb: SupabaseClient,
  classId: string,
): Promise<void> {
  // RLS "teacher can manage own classes" (for all) limits this to the owner;
  // FK ON DELETE CASCADE drops class_members + activities (→ maps / groups /
  // hex_tiles). No RPC needed.
  const { error } = await sb.from('classes').delete().eq('id', classId);
  if (error) {
    throw error;
  }
}

export async function listClassRoster(
  sb: SupabaseClient,
  classId: string,
): Promise<ClassRosterRow[]> {
  const { data, error } = await sb.rpc('list_class_roster', { p_class_id: classId });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as ClassRosterRow[];
}

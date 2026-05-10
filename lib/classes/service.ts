import { SupabaseClient } from '@supabase/supabase-js';
import { Class } from './types';

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
  const {
    data: { session },
  } = await sb.auth.getSession();

  const userId = session?.user.id;
  if (!userId) {
    throw new Error('not authenticated');
  }

  const { data: classRow, error: lookupError } = await sb
    .from('classes')
    .select('id')
    .eq('class_code', classCode)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (!classRow) {
    throw new Error(`class with code ${classCode} not found`);
  }

  const { error: insertError } = await sb
    .from('class_members')
    .insert({ class_id: classRow.id, user_id: userId });

  if (insertError && insertError.code !== '23505') {
    throw insertError;
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
    const relatedClass = (membership as { classes?: Class | null }).classes;
    if (relatedClass) {
      classes.set(relatedClass.id, relatedClass);
    }
  }

  return Array.from(classes.values());
}

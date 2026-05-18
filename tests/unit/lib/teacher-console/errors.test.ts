import {
  TeacherConsoleError,
  parseTeacherConsoleRpcCode,
  teacherConsoleErrorMessage,
} from '../../../../lib/teacher-console/errors';

describe('parseTeacherConsoleRpcCode', () => {
  it('extracts a known code embedded in an RPC message', () => {
    expect(
      parseTeacherConsoleRpcCode('... NOT_ENOUGH_MEMBERS ...'),
    ).toBe('NOT_ENOUGH_MEMBERS');
  });
  it('falls back to UNKNOWN for unrecognised text', () => {
    expect(parseTeacherConsoleRpcCode('boom')).toBe(
      'UNKNOWN_TEACHER_CONSOLE_ERROR',
    );
  });
});

describe('teacherConsoleErrorMessage', () => {
  it('maps a known code to a specific zh message', () => {
    const msg = teacherConsoleErrorMessage(
      new TeacherConsoleError('NOT_ENOUGH_MEMBERS', 'NOT_ENOUGH_MEMBERS'),
    );
    expect(msg).toContain('人數不足');
  });
  it('returns null for the generic unknown code so caller falls back', () => {
    expect(
      teacherConsoleErrorMessage(
        new TeacherConsoleError('UNKNOWN_TEACHER_CONSOLE_ERROR', 'x'),
      ),
    ).toBeNull();
  });
  it('returns null for non-TeacherConsoleError values', () => {
    expect(teacherConsoleErrorMessage(new Error('plain'))).toBeNull();
    expect(teacherConsoleErrorMessage('nope')).toBeNull();
  });
});

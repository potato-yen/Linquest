// lib/errors/types.ts

export type DomainNamespace = 'BATTLE' | 'TEACHER_CONSOLE' | 'TERRITORY' | 'AUTH' | 'GENERAL';

export class AppError extends Error {
  constructor(
    public readonly namespace: DomainNamespace,
    public readonly code: string,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

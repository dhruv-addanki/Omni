import prisma from '../lib/prisma';

export async function logAudit(userId: string, action: string, metadata?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, metadata }
    });
  } catch {
    // avoid throwing from audit logging
  }
}

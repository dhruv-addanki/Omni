import prisma from '../lib/prisma';

export async function isFeatureEnabled(name: string, userId?: string) {
  const flag = await prisma.featureFlag.findUnique({ where: { name } });
  if (!flag) return false;
  if (!userId) return flag.enabled;
  const override = await prisma.featureFlagOverride.findUnique({
    where: {
      flagId_userId: {
        flagId: flag.id,
        userId
      }
    }
  });
  if (override) return override.enabled;
  return flag.enabled;
}

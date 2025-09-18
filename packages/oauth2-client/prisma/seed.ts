import { PrismaClient } from '../dist/generated/prisma';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Generates a secure random token string.
 * @returns {string} A random SHA1 hash string.
 */
const generateRandomToken = (): string => {
  const buffer = crypto.randomBytes(40);
  return buffer.toString('hex');
};

async function main() {
  console.log('Start seeding...');

  // --- Seed OAuth Scopes ---
  // Use createMany with skipDuplicates to prevent errors on re-runs.
  await prisma.oAuthScope.createMany({
    data: [
      { scope: 'admin', isDefault: false },
      { scope: 'user', isDefault: true },
      { scope: 'guest', isDefault: false },
    ],
    skipDuplicates: true,
  });
  console.log('OAuth scopes seeded successfully (or already exist).');

  // --- Seed OAuth Client ---
  // Use upsert to create the client if it doesn't exist, or update it if it does.
  // This requires a fixed, predictable identifier.
  const clientIdentifier = 'login'; // A fixed ID for upsert condition.

  await prisma.oAuthClient.upsert({
    where: { name: clientIdentifier }, // The unique field to find the record.
    
    // If the client does not exist, create it.
    create: {
      name: clientIdentifier,
      clientId: generateRandomToken(),
      clientSecret: generateRandomToken(), // Generate a secret on first creation.
      redirectUris: ['localhost'],
      grantTypes: ['password', 'refresh_token'],
      scope: 'user',
    },
    
    // If the client already exists, update it.
    // Here we do nothing, but you could update the name or scope if needed.
    update: {}, 
  });
  console.log(`OAuth client '${clientIdentifier}' seeded successfully (or already exists).`);
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure the Prisma Client connection is closed.
    await prisma.$disconnect();
  });


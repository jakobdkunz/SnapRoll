const { execSync } = require('child_process');

const functions = [
  'convex/functions/demo.ts',
  'convex/functions/users.ts',
  'convex/functions/sections.ts',
  'convex/functions/attendance.ts',
  'convex/functions/enrollments.ts',
  'convex/functions/history.ts',
  'convex/functions/auth.ts'
];

console.log('Deploying Convex functions...');

functions.forEach(func => {
  try {
    console.log(`Deploying ${func}...`);
    execSync(`npx convex deploy --once`, { 
      stdio: 'inherit',
      timeout: 10000 
    });
    console.log(`✅ ${func} deployed`);
  } catch (error) {
    console.log(`❌ ${func} failed:`, error.message);
  }
});

console.log('Deployment complete!');


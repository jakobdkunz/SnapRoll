const { execSync } = require('child_process');

console.log('Deploying Convex functions...');
try {
  execSync(`npx convex deploy --once`, {
    stdio: 'inherit',
    timeout: 120000,
  });
  console.log('✅ Convex deployed');
} catch (error) {
  console.log('❌ Convex deployment failed:', error.message);
  process.exitCode = 1;
}
console.log('Deployment complete!');


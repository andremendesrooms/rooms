// Netlify ignore command: exit 0 skips, exit 1 builds.
// Production main is always allowed. All development branch deploys are skipped.
// The owner's requested visual review is the ONE exception: Deploy Preview
// of PR #3 from painel-admin. Netlify's preview build clears app credentials
// in netlify.toml, so the preview cannot reach real/test Supabase or WhatsApp.
const branch = process.env.BRANCH || '';
const context = process.env.CONTEXT || '';
const reviewId = process.env.REVIEW_ID || '';
const isProduction = branch === 'main' && context === 'production';
const isAuthorizedVisualPreview = context === 'deploy-preview' &&
  branch === 'painel-admin' && reviewId === '3';
process.exit(isProduction || isAuthorizedVisualPreview ? 1 : 0);

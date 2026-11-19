// Netlify: exit 0 skips a build; exit 1 builds.
// Keep regular development branches blocked, but allow isolated deploy previews.
// Deploy previews have a separate build command that clears Supabase and WhatsApp
// environment variables: no real property or customer data can be shown there.
const branch = process.env.BRANCH || '';
const context = process.env.CONTEXT || '';
const isProductionBranch = branch === 'main';
const isVisualReview = context === 'deploy-preview';
process.exit(isProductionBranch || isVisualReview ? 1 : 0);

// Netlify exits 0 from its ignore command to skip a build/deploy.
// This review branch must never publish a branch site or deploy preview.
const reviewBranch = "codex/issue-1-lancamento";
process.exit(process.env.BRANCH === reviewBranch ? 0 : 1);

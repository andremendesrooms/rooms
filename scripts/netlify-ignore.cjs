// Netlify: code 0 skips the build; code 1 proceeds.
// Only the main branch is authorized to build from this repository.
// Development branches (including painel-admin and codex/*) cannot publish
// previews or branch deploys accidentally. Production merge still requires
// an explicit approval from the owner.
const branch = process.env.BRANCH || '';
process.exit(branch === 'main' ? 1 : 0);

if (!process.env.npm_config_user_agent?.startsWith('pnpm/')) {
  console.error('Use pnpm to install this workspace. See packageManager in package.json.');
  process.exitCode = 1;
}

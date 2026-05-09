import AuthScreen from '@/components/auth/AuthScreen';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AuthScreen
      callbackUrl={resolvedSearchParams.callbackUrl ?? '/'}
      hasGoogle={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
      hasGitHub={Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)}
    />
  );
}

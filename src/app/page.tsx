import { redirect } from 'next/navigation';
import EditorApp from '@/components/editor/EditorApp';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <EditorApp
      user={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      }}
    />
  );
}

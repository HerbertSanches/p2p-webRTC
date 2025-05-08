'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const router = useRouter();

  const createRoom = () => {
    const roomId = uuidv4();
    router.push(`/room/${roomId}`);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <button
        onClick={createRoom}
        className="bg-blue-600 text-white px-6 py-3 rounded"
      >
        Criar nova sala
      </button>
    </main>
  );
}

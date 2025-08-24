"use client";
import { useRouter } from 'next/navigation';

export default function SlideshowLivePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center">
        <div className="text-2xl font-semibold mb-2">Presenting Slideshow</div>
        <div className="text-slate-600 mb-6">Session: {params.sessionId}</div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white" onClick={() => router.back()}>Back</button>
      </div>
    </div>
  );
}



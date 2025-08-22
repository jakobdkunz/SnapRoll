"use client";
import { useEffect, useState } from 'react';
import { Button, Card } from '@snaproll/ui';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault?.();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  if (!event || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto max-w-xl px-4">
      <Card className="flex items-center justify-between p-4">
        <div className="text-sm">Install SnapRoll for quicker access</div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setDismissed(true)}>Not now</Button>
          <Button onClick={() => { event.prompt(); setDismissed(true); }}>Install</Button>
        </div>
      </Card>
    </div>
  );
}

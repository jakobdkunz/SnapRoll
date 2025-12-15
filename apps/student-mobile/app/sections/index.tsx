import * as React from 'react';
import { View, Text, TextInput as RNTextInput, ScrollView } from 'react-native';
import { Card, Button, TextInput, Skeleton, Modal } from '@flamelink/ui-native';
import { useCurrentUser, useStudentSections, useActiveInteractive, useJoinByCode, useAuthContext } from '@flamelink/student-core';
import type { Id } from '@flamelink/convex-client';
import { useAttendanceActions } from '@flamelink/student-core';
import { router } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { api } from '@flamelink/convex-client';

export default function SectionsScreen() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const { isLoaded, isSignedIn } = useAuth();
  const currentUser = useCurrentUser();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const didUpsertRef = React.useRef(false);
  
  React.useEffect(() => {
    if (didUpsertRef.current) return;
    if (!isLoaded || !isSignedIn) return;
    if (currentUser === undefined) return;
    if (!currentUser) {
      (async () => {
        try {
          didUpsertRef.current = true;
          await upsertUser({ role: 'STUDENT' });
        } catch (e) {
          // Best-effort upsert; ignore failures in UI but log for debugging
          console.error(e);
        }
      })();
    }
  }, [isLoaded, isSignedIn, currentUser, upsertUser]);

  const effectiveUserId = (currentUser?._id as Id<'users'> | undefined);
  const sections = useStudentSections();
  const interactive = useActiveInteractive();

  const { checking, onCheckin } = useAttendanceActions(effectiveUserId ?? null);
  const [digits, setDigits] = React.useState<string[]>(['', '', '', '']);
  const inputRefs = Array.from({ length: 4 }, () => React.useRef<RNTextInput>(null));
  const [checkinError, setCheckinError] = React.useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = React.useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = React.useState<number | null>(null);

  const onDigitChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const next = [...digits];
    next[index] = val.replace(/\D/g, '').slice(0, 1);
    setDigits(next);
    if (val && index < 3) inputRefs[index + 1].current?.focus();
  };

  React.useEffect(() => {
    const allFilled = digits.every((d) => /\d/.test(d) && d.length === 1);
    if (!allFilled) return;
    const code = digits.join('');
    (async () => {
      setCheckinError(null);
      setConfirmMsg(null);
      const r = await onCheckin(code);
      if (r.ok) {
        setConfirmMsg('Checked in successfully!');
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
        setBlockedUntil(null);
      } else {
        if (typeof r.blockedUntil === 'number') {
          setBlockedUntil(r.blockedUntil);
        } else {
          setCheckinError(r.error || 'Failed to check in.');
        }
      }
    })();
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps

  const [joinOpen, setJoinOpen] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState('');
  const { submit: submitJoin, error: joinError, setError: setJoinError } = useJoinByCode();

  if (!mounted) return null;

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            Welcome, {(currentUser && (currentUser.firstName || currentUser.lastName)) ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}` : ''}!
          </Text>
        </View>

        <Card>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text style={{ fontWeight: '600' }}>Attendance</Text>
            <Text style={{ color: '#6B7280' }}>Enter the code you see on the board:</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={inputRefs[i]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={d}
                  onChangeText={(v) => onDigitChange(i, v)}
                  style={{ width: 48, height: 48, textAlign: 'center', fontSize: 20 }}
                />
              ))}
            </View>
            {confirmMsg ? <Text style={{ color: '#166534' }}>{confirmMsg}</Text> : null}
            {checkinError && !(blockedUntil && blockedUntil > Date.now()) ? <Text style={{ color: '#991B1B' }}>{checkinError}</Text> : null}
            <Button onPress={() => router.push('/my-attendance')}>My attendance →</Button>
          </View>
        </Card>

        <Card>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#475569' }}>My courses</Text>
              <Button onPress={() => { setJoinOpen(true); setJoinCode(''); setJoinError(null); }}>+ Enter Join Code</Button>
            </View>
            {!currentUser ? (
              <View style={{ gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} style={{ height: 96, borderRadius: 12 }} />
                ))}
              </View>
            ) : sections.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 16 }}>
                <Text style={{ fontWeight: '600' }}>No courses yet</Text>
                <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
                  Your instructor hasn't added you to any courses yet.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {sections.map((s) => (
                  <Card key={s.id}>
                    <Text style={{ fontWeight: '600' }}>{s.title}</Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        </Card>

        <Card>
          {!interactive ? (
            <View style={{ padding: 12, borderStyle: 'dashed', borderWidth: 2, borderRadius: 12, borderColor: 'rgba(148,163,184,0.4)' }}>
              <Text style={{ textAlign: 'center', color: '#475569' }}>
                Your instructors have not started any live activities yet...
              </Text>
            </View>
          ) : interactive.kind === 'slideshow' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '600', textAlign: 'center' }}>Activities</Text>
              {(interactive.showOnDevices ?? false) ? (
                <Button onPress={() => router.push(`/slideshow/view/${interactive.sessionId}`)}>
                  View Slides Live →
                </Button>
              ) : (
                <Text style={{ textAlign: 'center', color: '#6B7280' }}>
                  Viewing on your device is disabled.
                </Text>
              )}
            </View>
          ) : interactive.kind === 'wordcloud' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '600', textAlign: 'center' }}>Word Cloud</Text>
              {interactive.showPromptToStudents && interactive.prompt ? (
                <Text style={{ textAlign: 'center', color: '#6B7280' }}>{interactive.prompt}</Text>
              ) : null}
            </View>
          ) : interactive.kind === 'poll' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '600', textAlign: 'center' }}>Poll</Text>
            </View>
          ) : interactive.kind === 'bible' ? (
            <BibleMobileWidget interactive={interactive} />
          ) : null}
        </Card>
      </ScrollView>
      <JoinCodeModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        value={joinCode}
        setValue={(v) => { setJoinCode(v.replace(/\D/g, '').slice(0, 6)); setJoinError(null); }}
        onSubmit={async (code) => {
          const res = await submitJoin(code);
          if (res.ok) {
            setJoinOpen(false);
            setJoinCode('');
          }
        }}
        error={joinError}
      />
    </>
  );
}

function JoinCodeModal({ open, onClose, onSubmit, error, value, setValue }: { open: boolean; onClose: () => void; onSubmit: (code: string) => void | Promise<void>; error: string | null; value: string; setValue: (v: string) => void }) {
  const inputRef = React.useRef<RNTextInput>(null);
  React.useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);
  return (
    <Modal open={open} onClose={onClose}>
      <Card>
        <View style={{ gap: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontWeight: '600' }}>Enter Join Code</Text>
            <Text style={{ color: '#6B7280' }}>Ask your instructor for the 6-digit code.</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <TextInput
              ref={inputRef}
              keyboardType="number-pad"
              placeholder="000000"
              value={value}
              onChangeText={setValue}
              style={{ letterSpacing: 4, textAlign: 'center' }}
            />
          </View>
          {error ? <Text style={{ color: '#991B1B', textAlign: 'center' }}>{error}</Text> : null}
          <Button onPress={() => void onSubmit(value)}>Submit</Button>
        </View>
      </Card>
    </Modal>
  );
}

function BibleMobileWidget({
  interactive,
}: {
  interactive: {
    kind: 'bible';
    sessionId: string;
    sectionId?: string;
    reference?: string;
    translationId?: string;
    translationName?: string;
    text?: string;
    versesJson?: string | null;
  };
}) {
  const reference = interactive.reference || '';
  const translationName = interactive.translationName || '';
  const text = (interactive.text || '').trim();

  const isLong = text.length > 220;

  const fullRef =
    reference && translationName
      ? `${reference} · ${translationName}`
      : reference || translationName || '';

  const externalUrl = (() => {
    const base = 'https://www.biblegateway.com/passage/';
    const params = new URLSearchParams();
    const ref = (reference || '').trim();
    const idx = ref.indexOf(':');
    const chapterRef = idx === -1 ? ref : ref.slice(0, idx);
    params.set('search', chapterRef);
    const version = (interactive.translationId || '').toLowerCase() === 'kjv' ? 'KJV' : 'WEB';
    params.set('version', version);
    return `${base}?${params.toString()}`;
  })();

  const [showFull, setShowFull] = React.useState(false);

  return (
    <>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexShrink: 1, paddingRight: 8 }}>
            <Text style={{ fontWeight: '600' }}>Bible Passage</Text>
            {reference ? (
              <Text style={{ color: '#4B5563', marginTop: 2 }}>
                {reference}
                {translationName ? ` · ${translationName}` : ''}
              </Text>
            ) : null}
          </View>
          <Button onPress={() => router.push(externalUrl)}>
            Full passage on Bible Gateway
          </Button>
        </View>
        <View
          style={{
            borderRadius: 12,
            backgroundColor: 'rgba(248,250,252,0.95)',
            padding: 12,
          }}
        >
          <View style={{ position: 'relative' }}>
            <Text
              style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}
              numberOfLines={isLong ? 4 : 0}
            >
              {text || 'Passage loading…'}
            </Text>
            {isLong ? (
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  paddingLeft: 16,
                  paddingTop: 16,
                  backgroundColor: 'rgba(248,250,252,0.85)',
                }}
              >
                <Text style={{ fontSize: 16, color: '#6B7280' }}>…</Text>
              </View>
            ) : null}
          </View>
        </View>
        {isLong ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button onPress={() => setShowFull(true)}>More</Button>
          </View>
        ) : null}
      </View>

      <Modal open={showFull} onClose={() => setShowFull(false)}>
        <Card>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View>
              <Text style={{ fontWeight: '600' }}>Bible Passage</Text>
              {fullRef ? (
                <Text style={{ color: '#4B5563', marginTop: 2 }}>{fullRef}</Text>
              ) : null}
            </View>
            {interactive.versesJson ? (
              (() => {
                try {
                  const verses = JSON.parse(interactive.versesJson as string) as Array<{
                    verse?: number | string;
                    text?: string;
                  }>;
                  if (!Array.isArray(verses) || verses.length === 0) {
                    return (
                      <Text style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}>
                        {text || 'Passage loading…'}
                      </Text>
                    );
                  }
                  return verses.map((v, idx) => (
                    <Text
                      key={`${v.verse ?? idx}`}
                      style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}
                    >
                      {typeof v.verse !== 'undefined' ? (
                        <Text style={{ fontSize: 10, lineHeight: 10, color: '#6B7280' }}>
                          {String(v.verse)}{' '}
                        </Text>
                      ) : null}
                      {(v.text || '').trim()}
                    </Text>
                  ));
                } catch {
                  return (
                    <Text style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}>
                      {text || 'Passage loading…'}
                    </Text>
                  );
                }
              })()
            ) : (
              <Text style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}>
                {text || 'Passage loading…'}
              </Text>
            )}
            {interactive.versesJson ? (
              (() => {
                try {
                  const verses = JSON.parse(interactive.versesJson as string) as Array<{
                    verse?: number | string;
                    text?: string;
                  }>;
                  if (!Array.isArray(verses) || verses.length === 0) {
                    return (
                      <Text style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}>
                        {text || 'Passage loading…'}
                      </Text>
                    );
                  }
                  return verses.map((v, idx) => (
                    <Text
                      key={`${v.verse ?? idx}`}
                      style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}
                    >
                      {typeof v.verse !== 'undefined' ? (
                        <Text style={{ fontSize: 10, lineHeight: 10, color: '#6B7280' }}>
                          {String(v.verse)}{' '}
                        </Text>
                      ) : null}
                      {(v.text || '').trim()}
                    </Text>
                  ));
                } catch {
                  return (
                    <Text style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}>
                      {text || 'Passage loading…'}
                    </Text>
                  );
                }
              })()
            ) : (
              <Text style={{ fontSize: 14, lineHeight: 20, color: '#111827' }}>
                {text || 'Passage loading…'}
              </Text>
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: '#6B7280', flex: 1, paddingRight: 8 }}>
                {fullRef}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button onPress={() => router.push(externalUrl)}>
                  Full passage on Bible Gateway
                </Button>
                <Button onPress={() => setShowFull(false)}>Close</Button>
              </View>
            </View>
          </ScrollView>
        </Card>
      </Modal>
    </>
  );
}



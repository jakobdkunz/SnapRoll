"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ATTENDANCE_CODE = "8760";
const INITIAL_CHECKED_IN = 17;
const FINAL_CHECKED_IN = 18;
const TOTAL_STUDENTS = 22;

type PhoneStatus = "idle" | "typing" | "checkedIn";

function UserGroupIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
      />
    </svg>
  );
}

function PhoneMock({ typedCode, phoneStatus }: { typedCode: string; phoneStatus: PhoneStatus }) {
  return (
    <div className="aspect-[9/19.5] rounded-[34px] bg-neutral-950 p-[8px] shadow-soft dark:bg-neutral-900">
      <div className="flex h-full flex-col overflow-hidden rounded-[26px] bg-[#edf6f3] dark:bg-[#16372f]/40">
        <div className="p-2">
          <div className="rounded-xl bg-white/90 p-2 dark:bg-neutral-900/85">
            <div className="text-center">
              <div className="font-medium text-neutral-900 dark:text-neutral-100">Attendance</div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-1.5">
              <UserGroupIcon className="h-6 w-6 text-slate-900 dark:text-neutral-100 sm:h-7 sm:w-7" />
              {ATTENDANCE_CODE.split("").map((_, i) => {
                const value = typedCode[i] ?? "";
                return (
                  <span
                    key={i}
                    className="inline-flex w-6 items-center justify-center text-3xl font-medium leading-none text-neutral-900 dark:text-neutral-100 sm:w-7 sm:text-4xl"
                  >
                    {value}
                  </span>
                );
              })}
            </div>

            {phoneStatus === "checkedIn" && (
              <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 text-center text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200">
                ✓ Checked in!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroAttendanceSimulation() {
  const [typedCode, setTypedCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
  const [phoneEntered, setPhoneEntered] = useState(false);
  const [checkedInCount, setCheckedInCount] = useState(INITIAL_CHECKED_IN);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutIdsRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timeoutIdsRef.current) {
      window.clearTimeout(id);
    }
    timeoutIdsRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, delayMs);
    timeoutIdsRef.current.push(id);
  }, []);

  const runAnimation = useCallback((startDelayMs: number) => {
    clearTimers();
    setTypedCode("");
    setPhoneStatus("idle");
    setPhoneEntered(false);
    setCheckedInCount(INITIAL_CHECKED_IN);
    setIsComplete(false);

    schedule(() => {
      setPhoneEntered(true);
    }, 120);

    schedule(() => {
      setPhoneStatus("typing");

      for (let i = 0; i < ATTENDANCE_CODE.length; i += 1) {
        schedule(() => {
          setTypedCode(ATTENDANCE_CODE.slice(0, i + 1));
        }, i * 320);
      }

      const typingDuration = ATTENDANCE_CODE.length * 320;

      schedule(() => {
        setPhoneStatus("checkedIn");
      }, typingDuration + 360);

      schedule(() => {
        setCheckedInCount(FINAL_CHECKED_IN);
      }, typingDuration + 860);

      schedule(() => {
        setIsComplete(true);
      }, typingDuration + 1650);
    }, startDelayMs + 920);
  }, [clearTimers, schedule]);

  useEffect(() => {
    runAnimation(1000);
    return clearTimers;
  }, [clearTimers, runAnimation]);

  const progress = (checkedInCount / TOTAL_STUDENTS) * 100;

  return (
    <div className="relative mx-auto w-full max-w-[500px] xl:mx-0">
      <div className="relative h-[330px]">
        <div className="absolute inset-x-4 top-0 rounded-2xl bg-blue-50/80 p-6 shadow-soft dark:bg-blue-950/35">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <UserGroupIcon className="h-10 w-10 text-slate-900 dark:text-neutral-100 sm:h-14 sm:w-14" />
            <div className="flex gap-2 text-3xl font-extrabold leading-none text-slate-900 dark:text-neutral-100 sm:gap-3 sm:text-5xl">
              {ATTENDANCE_CODE.split("").map((digit, index) => (
                <span key={index}>{digit}</span>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{checkedInCount}/{TOTAL_STUDENTS}</div>
            <div className="text-sm text-slate-600 dark:text-blue-100/80">students checked in</div>
            <div className="mx-auto mt-3 h-4 w-full max-w-[620px] overflow-hidden rounded-full bg-blue-200/95 dark:bg-blue-900/70">
              <div
                className="h-full rounded-full bg-blue-700 transition-[width] duration-500 ease-out dark:bg-blue-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div
          className={`pointer-events-none absolute left-[6%] -bottom-[270px] z-20 w-[190px] ${
            phoneEntered
              ? "translate-y-0 transition-transform duration-[900ms] ease-out"
              : "translate-y-[230px]"
          }`}
        >
          <PhoneMock typedCode={typedCode} phoneStatus={phoneStatus} />
        </div>

        <div className="absolute bottom-0 right-0 z-30 flex min-h-10 justify-end">
          <button
            type="button"
            onClick={() => runAnimation(120)}
            className={`pointer-events-auto inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-all duration-200 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 ${
              isComplete ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            Replay animation
          </button>
        </div>
      </div>
    </div>
  );
}

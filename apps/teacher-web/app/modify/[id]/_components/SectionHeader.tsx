"use client";
import * as React from 'react';

export function SectionHeader({ loaded, title, gradient }: { loaded: boolean; title: string; gradient: string }) {
  return loaded ? (
    <div className={`rounded-xl overflow-hidden ${gradient} relative`}>
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative grid place-items-center text-white py-8 sm:py-10">
        <div className="font-bold text-xl sm:text-2xl text-center px-3 leading-tight">{title}</div>
      </div>
    </div>
  ) : (
    <div className="rounded-xl overflow-hidden bg-slate-200">
      <div className="py-8 sm:py-10" />
    </div>
  );
}



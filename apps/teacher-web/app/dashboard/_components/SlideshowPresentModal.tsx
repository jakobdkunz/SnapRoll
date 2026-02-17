"use client";
import { useState } from 'react';
import { Modal, Button, TextInput } from '@flamelink/ui';
import type { Id } from '@flamelink/convex-client';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@flamelink/convex-client';

export default function SlideshowPresentModal({ open, onClose, sectionId }: { open: boolean; onClose: () => void; sectionId: Id<'sections'> | null }) {
  const teacherId = (typeof window !== 'undefined' ? (localStorage.getItem('flamelink.teacherId') || null) : null) as Id<'users'> | null;
  const getAssetsByTeacher = useQuery(api.functions.slideshow.getAssetsByTeacher, teacherId ? { teacherId } : 'skip');
  const startSlideshow = useMutation(api.functions.slideshow.startSlideshow);
  const [selectedAssetId, setSelectedAssetId] = useState<Id<'slideshowAssets'> | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [showOnDevices, setShowOnDevices] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [requireStay, setRequireStay] = useState(false);
  const [preventJump, setPreventJump] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = open && !!sectionId;

  return (
    <Modal open={visible} onClose={onClose}>
      <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-xl p-8 w-[95vw] max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <svg className="h-6 w-6 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4-4-4-4m8 8l4-4-4-4" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Present Slideshow</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Broadcast your slideshow to student devices in real-time</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">✕</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recents</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-neutral-800 px-2 py-1 rounded-full">72h retention</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {!getAssetsByTeacher || (getAssetsByTeacher as unknown[]).length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8 bg-slate-50 dark:bg-neutral-900 rounded-lg border-2 border-dashed border-slate-200 dark:border-neutral-800">
                  No recent slideshows
                </div>
              ) : (
                (getAssetsByTeacher as Array<{ _id: Id<'slideshowAssets'>; title: string; createdAt: number }>).map((asset) => (
                  <button key={asset._id} onClick={() => { setSelectedAssetId(asset._id); setUploadFile(null); setTitle(asset.title); }} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedAssetId === asset._id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0 grid place-items-center">
                        <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{asset.title}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(asset.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Upload New File</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select File (PDF only)</label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-600 transition-colors">
                <input type="file" accept=".pdf,application/pdf" onChange={(e) => { const f = e.target.files?.[0] || null; setUploadFile(f); setSelectedAssetId(null); if (f) setTitle(f.name.replace(/\.pdf$/i, '')); }} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg grid place-items-center mb-3">
                    <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">Click to upload</span> or drag and drop</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF files only</div>
                </label>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Slideshow Title</label>
              <TextInput value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} placeholder="Enter a title for your slideshow" className="w-full" />
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Presentation Settings</h4>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <input type="checkbox" checked={showOnDevices} onChange={(e) => setShowOnDevices(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 dark:bg-neutral-900 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2" />
                <div><div className="font-medium text-slate-900 dark:text-slate-100">Show on Student Devices</div><div className="text-sm text-slate-600 dark:text-slate-300">Students can view the slideshow on their devices</div></div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 dark:bg-neutral-900 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2" />
                <div><div className="font-medium text-slate-900 dark:text-slate-100">Allow Students to Download</div><div className="text-sm text-slate-600 dark:text-slate-300">Students can download the slideshow files</div></div>
              </label>
              {!requireStay && (
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <input type="checkbox" checked={preventJump} onChange={(e) => setPreventJump(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 dark:bg-neutral-900 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2" />
                  <div><div className="font-medium text-slate-900 dark:text-slate-100">Prevent Students from Jumping Ahead</div><div className="text-sm text-slate-600 dark:text-slate-300">Students cannot navigate to future slides</div></div>
                </label>
              )}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <input type="checkbox" checked={requireStay} onChange={(e) => { const v = e.target.checked; setRequireStay(v); if (v) setPreventJump(false); }} className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 dark:bg-neutral-900 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2" />
                <div><div className="font-medium text-slate-900 dark:text-slate-100">Require Students to Stay on Current Slide</div><div className="text-sm text-slate-600 dark:text-slate-300">Students cannot navigate away from the current slide</div></div>
              </label>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg"><div className="flex items-center gap-2"><span className="text-sm font-medium text-red-800 dark:text-red-300">{error}</span></div></div>
        )}
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="px-6">Cancel</Button>
          <Button disabled={working || !sectionId || (!selectedAssetId && !uploadFile)} onClick={async () => {
            if (!sectionId) return;
            setWorking(true); setError(null);
            try {
              if (selectedAssetId) {
                await startSlideshow({ sectionId: sectionId as Id<'sections'>, assetId: selectedAssetId as Id<'slideshowAssets'>, showOnDevices, allowDownload, requireStay, preventJump });
                onClose();
              } else if (uploadFile) {
                const fd = new FormData();
                fd.append('file', uploadFile);
                if (title) fd.append('title', title);
                const res = await fetch('/api/slideshow/assets', { method: 'POST', body: fd, credentials: 'include' });
                if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed to upload file'); }
                const j = await res.json();
                const newAssetId: string | undefined = j.assetId || j.id || j._id;
                if (!newAssetId) throw new Error('Upload succeeded but no assetId returned');
                await startSlideshow({ sectionId: sectionId as Id<'sections'>, assetId: newAssetId as Id<'slideshowAssets'>, showOnDevices, allowDownload, requireStay, preventJump });
                onClose();
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed to start slideshow');
            } finally {
              setWorking(false);
            }
          }} className="px-8">{working ? 'Starting...' : 'Start Slideshow'}</Button>
        </div>
      </div>
    </Modal>
  );
}


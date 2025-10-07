"use client";
import * as React from 'react';
import { Button, Modal } from '@flamelink/ui';
import { HiChevronDown } from 'react-icons/hi2';

type ColumnRole = 'email' | 'first' | 'last' | 'full' | 'other';

interface ImportCsvModalProps {
  open: boolean;
  onClose: () => void;
  mappingStep: 'promptKind' | 'review';
  promptColumnIdx: number | null;
  csvColumns: string[];
  csvRows: string[][];
  dataStartRowIndex: number;
  columnRoles: ColumnRole[];
  setColumnRoles: (roles: ColumnRole[]) => void;
  emailColIndex: number;
  reviewError: string | null;
  setReviewError: (msg: string | null) => void;
  isFullNameColumnValid: (idx: number) => boolean;
  openDropdownIdx: number | null;
  setOpenDropdownIdx: (idx: number | null) => void;
  dropdownBackdropKey: number;
  setDropdownBackdropKey: (n: number) => void;
  importWorking: boolean;
  validateRolesForImport: (roles: ColumnRole[]) => { ok: boolean; message?: string };
  onImportClick: () => Promise<void> | void;
  setPromptColumnIdx: (idx: number | null) => void;
  setMappingStep: (step: 'promptKind' | 'review') => void;
}

export function ImportCsvModal(props: ImportCsvModalProps) {
  const {
    open,
    onClose,
    mappingStep,
    promptColumnIdx,
    csvColumns,
    csvRows,
    dataStartRowIndex,
    columnRoles,
    setColumnRoles,
    emailColIndex,
    reviewError,
    setReviewError,
    isFullNameColumnValid,
    openDropdownIdx,
    setOpenDropdownIdx,
    dropdownBackdropKey,
    setDropdownBackdropKey,
    importWorking,
    validateRolesForImport,
    onImportClick,
    setPromptColumnIdx,
    setMappingStep,
  } = props;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-[min(92vw,900px)] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl p-4 sm:p-6 transition-all duration-200 ease-out">
        {mappingStep === 'promptKind' && promptColumnIdx != null && (
          <div>
            <div className="mb-1 text-xs font-semibold tracking-wide text-slate-500">CSV Import</div>
            <div className="text-lg font-semibold">We’re having trouble detecting columns</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-4">What is this column?</div>
            <div className="mb-4 flex justify-center">
              <div className="w-[min(520px,88vw)]">
                <div className="text-xs text-slate-500 mb-1 text-center">{csvColumns[promptColumnIdx] || `Column ${promptColumnIdx + 1}`}</div>
                {(() => {
                  const samples = csvRows.slice(dataStartRowIndex, dataStartRowIndex + 20).map((r) => String(r[promptColumnIdx] || ''));
                  const maxChars = samples.reduce((m, v) => Math.max(m, v.length), 0);
                  const widthCh = Math.max(10, maxChars * 2);
                  return (
                    <div className="border rounded-lg overflow-hidden mx-auto border-slate-200 dark:border-slate-700" style={{ width: `${widthCh}ch` }}>
                      <table className="w-full text-xs text-slate-900 dark:text-slate-100">
                        <tbody>
                          {csvRows.slice(dataStartRowIndex, dataStartRowIndex + 7).map((r, ri) => (
                            <tr key={ri} className="odd:bg-slate-50 dark:odd:bg-slate-800/50">
                              <td className="px-2 py-1 whitespace-nowrap">{String(r[promptColumnIdx] || '')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvRows.length - dataStartRowIndex > 7 && (
                        <div className="h-10 -mt-10 bg-gradient-to-b from-transparent to-white dark:to-slate-900 pointer-events-none" />
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                className="w-full"
                onClick={() => {
                  const roles = [...columnRoles];
                  roles[promptColumnIdx] = 'first';
                  const available = roles.map((r, i) => ({ r, i })).filter((x) => x.r === 'other' && x.i !== promptColumnIdx);
                  const lastCandidate = available.find((x) => x.i !== emailColIndex)?.i;
                  if (lastCandidate != null) roles[lastCandidate] = 'last';
                  setColumnRoles(roles);
                  setPromptColumnIdx(null);
                  setMappingStep('review');
                }}
              >
                These are first names
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  const roles = [...columnRoles];
                  roles[promptColumnIdx] = 'last';
                  setColumnRoles(roles);
                  setPromptColumnIdx(null);
                  setMappingStep('review');
                }}
              >
                These are last names
              </Button>
              <Button className="w-full" onClick={() => { const roles = [...columnRoles]; roles[promptColumnIdx] = 'other'; setColumnRoles(roles); setPromptColumnIdx(null); setMappingStep('review'); }}>These are something else</Button>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {mappingStep === 'review' && (
          <div>
            <div className="mb-1 text-xs font-semibold tracking-wide text-slate-500">CSV Import</div>
            <div className="text-lg font-semibold">Does everything look right?</div>
            <div className="text-sm text-slate-600 mt-1 mb-4">Adjust each column as needed before importing.</div>
            {openDropdownIdx != null && (
              <div key={dropdownBackdropKey} className="fixed inset-0 z-[60]" onClick={() => setOpenDropdownIdx(null)} />
            )}
            <div className="overflow-visible border rounded relative border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-xs text-slate-900 dark:text-slate-100">
                <thead>
                  <tr>
                    {csvColumns.map((c, i) => (
                      <th key={i} className="text-left px-2 py-2 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap align-bottom">
                        <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{c || `Column ${i + 1}`}</div>
                        <div className="relative inline-block">
                          <button
                            className="rounded-md border pl-2 pr-6 py-1 bg-white dark:bg-slate-900 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 relative border-slate-200 dark:border-slate-700"
                            onClick={() => { setOpenDropdownIdx(openDropdownIdx === i ? null : i); setReviewError(null); setDropdownBackdropKey(dropdownBackdropKey + 1); }}
                          >
                            {columnRoles[i] === 'email' ? 'Emails' : columnRoles[i] === 'first' ? 'First names' : columnRoles[i] === 'last' ? 'Last names' : columnRoles[i] === 'full' ? 'Full names' : 'Other'}
                            <HiChevronDown className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                          </button>
                          {openDropdownIdx === i && (
                            <div className="absolute z-[70] mt-1 w-44 rounded-md border bg-white dark:bg-slate-900 shadow-lg border-slate-200 dark:border-slate-700">
                              {(['first','last','full','email','other'] as ColumnRole[]).map((opt) => (
                                <div
                                  key={opt}
                                  className={`px-3 py-1.5 text-[11px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800`}
                                  onClick={() => {
                                    const roles = [...columnRoles];
                                    if (opt === 'full' && !isFullNameColumnValid(i)) {
                                      setReviewError('That column does not look like full names.');
                                      return;
                                    }
                                    if (opt === 'email') {
                                      const currentEmailIdx = roles.findIndex((r) => r === 'email');
                                      if (currentEmailIdx >= 0 && currentEmailIdx !== i) roles[currentEmailIdx] = 'other';
                                    }
                                    roles[i] = opt;
                                    setColumnRoles(roles);
                                    setOpenDropdownIdx(null);
                                  }}
                                >
                                  {opt === 'first' ? 'First names' : opt === 'last' ? 'Last names' : opt === 'full' ? 'Full names' : opt === 'email' ? 'Emails' : 'Other'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(dataStartRowIndex, dataStartRowIndex + 7).map((r, ri) => (
                    <tr key={ri} className="odd:bg-slate-50 dark:odd:bg-slate-800/50">
                      {csvColumns.map((_, ci) => (
                        <td key={ci} className="px-2 py-1 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">{String(r[ci] || '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length - dataStartRowIndex > 7 && (
                <div className="h-10 -mt-10 bg-gradient-to-b from-transparent to-white dark:to-slate-900 pointer-events-none" />
              )}
            </div>

            {reviewError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 mt-2">{reviewError}</div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              {!validateRolesForImport(columnRoles).ok && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  {(() => {
                    const v = validateRolesForImport(columnRoles);
                    return v.ok ? '' : v.message || 'Please finish mapping before importing.';
                  })()}
                </div>
              )}
              <Button variant="ghost" onClick={onClose} disabled={importWorking}>Cancel</Button>
              <Button onClick={onImportClick} disabled={importWorking || !validateRolesForImport(columnRoles).ok}>{importWorking ? 'Importing…' : 'Import'}</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}



import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api, Id } from '@flamelink/convex-client';
import { useCurrentUser } from '../auth/useCurrentUser';

export type SectionSummary = {
  id: string;
  title: string;
  gradient: string;
};

export function useStudentSections(): SectionSummary[] {
  const currentUser = useCurrentUser();
  const effectiveUserId = (currentUser?._id as Id<'users'> | undefined);

  const enrollments = useQuery(
    api.functions.enrollments.getByStudent,
    effectiveUserId ? { studentId: effectiveUserId } : "skip"
  );

  const sectionIds = useMemo(() => {
    if (!enrollments) return null as Id<'sections'>[] | null;
    return enrollments.map((e) => e.sectionId as Id<'sections'>);
  }, [enrollments]);

  const sectionsData = useQuery(
    api.functions.sections.getByIds,
    sectionIds && sectionIds.length > 0 ? { ids: sectionIds } : "skip"
  );

  return useMemo(() => {
    if (!sectionsData) return [];
    return sectionsData.map((section) => ({
      id: section._id as unknown as string,
      title: String(section.title || ''),
      gradient: (section as { gradient?: string }).gradient || 'gradient-1'
    })) as SectionSummary[];
  }, [sectionsData]);
}



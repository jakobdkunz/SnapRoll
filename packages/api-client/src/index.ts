import { z } from 'zod';

export { apiFetch, getApiBaseUrl } from './api-fetch';
export { ConvexApiClient, useAttendanceStatus, useSectionHistory, useStudentHistory, useCheckIn, useStartAttendance, useUpdateManualStatus, useAuthenticateTeacher, useAuthenticateStudent } from './convex-client';

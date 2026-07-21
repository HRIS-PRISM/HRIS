import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  buildHydrationPayload,
  getWorkflowNextModule,
  getWorkflowPreviousModule,
  navigateAttendanceWorkflow,
  navigateWorkflowBack,
  readAttendanceWorkflow,
  registerWorkflowVisit,
  syncAttendanceWorkflow,
} from '../utils/attendanceWorkflow';

export default function useAttendanceWorkflow(moduleId, {
  employeeNumber,
  fullName,
  startDate,
  endDate,
  onHydrate,
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const hydrateSigRef = useRef('');

  useLayoutEffect(() => {
    const isBack = location.state?.workflowNavDirection === 'back';
    registerWorkflowVisit(moduleId, { isBack });
    const payload = buildHydrationPayload(location.state, moduleId);
    if (!payload || !onHydrate) return;
    const sig = JSON.stringify(payload);
    if (hydrateSigRef.current === sig) return;
    hydrateSigRef.current = sig;
    onHydrate(payload);
  }, [moduleId, location.key, location.state, onHydrate]);

  useLayoutEffect(() => {
    if (!employeeNumber || !startDate || !endDate) return;
    syncAttendanceWorkflow(moduleId, {
      employeeNumber,
      fullName,
      startDate,
      endDate,
    });
  }, [moduleId, employeeNumber, fullName, startDate, endDate]);

  const workflowContext = useMemo(() => readAttendanceWorkflow(), [
    moduleId,
    employeeNumber,
    startDate,
    endDate,
    location.key,
  ]);

  const prevStep = useMemo(
    () => getWorkflowPreviousModule(moduleId, workflowContext),
    [moduleId, workflowContext],
  );

  const nextStep = useMemo(
    () => getWorkflowNextModule(moduleId, workflowContext),
    [moduleId, workflowContext],
  );

  const goPrevious = useCallback(() => {
    if (!prevStep) return;
    navigateWorkflowBack(navigate, prevStep.id, {
      employeeNumber: workflowContext.employeeNumber,
      fullName: workflowContext.fullName,
      startDate: workflowContext.startDate,
      endDate: workflowContext.endDate,
    });
  }, [navigate, prevStep, workflowContext]);

  const goNext = useCallback(() => {
    if (!nextStep) return;
    navigateAttendanceWorkflow(navigate, nextStep.id, {
      employeeNumber: workflowContext.employeeNumber || employeeNumber,
      fullName: workflowContext.fullName || fullName,
      startDate: workflowContext.startDate || startDate,
      endDate: workflowContext.endDate || endDate,
    });
  }, [navigate, nextStep, workflowContext, employeeNumber, fullName, startDate, endDate]);

  const goToModule = useCallback((targetModuleId, extraFields = {}) => {
    navigateAttendanceWorkflow(navigate, targetModuleId, {
      employeeNumber: workflowContext.employeeNumber || employeeNumber,
      fullName: workflowContext.fullName || fullName,
      startDate: workflowContext.startDate || startDate,
      endDate: workflowContext.endDate || endDate,
      ...extraFields,
    });
  }, [navigate, workflowContext, employeeNumber, fullName, startDate, endDate]);

  return {
    workflowContext,
    prevStep,
    nextStep,
    goPrevious,
    goNext,
    goToModule,
  };
}

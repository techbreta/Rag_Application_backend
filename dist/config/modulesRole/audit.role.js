"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEditer = exports.AuditViewer = exports.AuditadminRoles = void 0;
const AuditadminRoles = [
    'deletePlan',
    'updatePlan',
    'getWorkspacePlans',
    'getLibraryPlans',
    'getPlan',
    'createPlan',
    'deleteActivity',
    'updateActivity',
    'getChecklistActivities',
    'getPlanActivities',
    'getActivity',
    'createActivity',
    'deleteMeeting',
    'updateMeeting',
    'getWorkspaceMeetings',
    'getLibraryMeetings',
    'getMeeting',
    'createMeeting',
    // Attachment permissions
    'Audit_createAttachment',
    'Audit_getAttachmentById',
    'Audit_getAttachmentsByLibrary',
    'Audit_updateAttachment',
    'Audit_deleteAttachment',
    'createEvaluation',
    'getEvaluation',
    'updateEvaluation',
    'deleteEvaluation',
    'sendEvaluationFeedback',
    'getEvaluationResult'
];
exports.AuditadminRoles = AuditadminRoles;
const AuditEditer = [
    'deletePlan',
    'updatePlan',
    'getWorkspacePlans',
    'getLibraryPlans',
    'getPlan',
    'createPlan',
    'deleteActivity',
    'updateActivity',
    'getChecklistActivities',
    'getPlanActivities',
    'getActivity',
    'createActivity',
    'deleteMeeting',
    'updateMeeting',
    'getWorkspaceMeetings',
    'getLibraryMeetings',
    'getMeeting',
    'createMeeting',
    // Attachment permissions
    'Audit_createAttachment',
    'Audit_getAttachmentById',
    'Audit_getAttachmentsByLibrary',
    'Audit_updateAttachment',
    'Audit_deleteAttachment',
    'sendEvaluationFeedback',
    'getEvaluationResult'
];
exports.AuditEditer = AuditEditer;
const AuditViewer = [
    'getWorkspacePlans',
    'getLibraryPlans',
    'getPlan',
    'getChecklistActivities',
    'getPlanActivities',
    'getActivity',
    'deleteMeeting',
    'updateMeeting',
    'getWorkspaceMeetings',
    'getLibraryMeetings',
    'getMeeting',
    'createMeeting',
    // Attachment permissions
    'Audit_getAttachmentById',
    'Audit_getAttachmentsByLibrary',
    'sendEvaluationFeedback',
    'getEvaluationResult'
];
exports.AuditViewer = AuditViewer;

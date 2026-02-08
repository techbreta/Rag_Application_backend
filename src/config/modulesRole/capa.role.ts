const capaadminRoles = [
  // 'ManageWorkspaceRolespermissions',
  'updateRole',
  'getSingleRole',
  'createRole',
  'deleteRole',
  'getWorkspaceRoleNames',
  // "manageWorkspaceUserPermissions"
  'getWorkspaceUsers',
  'createWorkspaceUser',
  'updateWorkspaceUser',
  'deleteWorkspaceUser',
  'getSingleWorkspaceUser',
  // 'manageGroups',
  'createGroup',
  'getWorkspaceGroups',
  'getWorkspaceGroupNames',
  'getSingleGroup',
  'updateGroup',
  'deleteGroup',
  'removeGroupMember',
  'addGroupMember',
  'getGroupMembers',

  // 'manageLibrary',
  'deleteLibrary',
  'updateLibrary',
  'removeLibraryMember',
  'addLibraryMember',
  'getLibraryMembers',
  'getWorkspaceLibraryNames',
  'getWorkspaceLibraries',
  'createLibrary',
  'updateLibraryById',
  'getSingleLibrary',
  'update5W2H',
  'getUserLibraries',
  'restoreLibrary',
  'deletePermanentLibrary',
  'updateContainment',
  // Actions
  'deleteAction',
  'updateAction',
  'getSingleAction',
  'getActions',
  'createAction',
  'getTasks',

  // Attachments
  'deleteAttachment',
  'updateAttachment',
  'getAttachmentById',
  'getAttachmentsByWorkspace',
  'createAttachment',

  //Causes
  'createCauses',
  'getCauses',
  'deleteCause',
  'getCause',
  'updateCause',
  'getCausesNames',

  // Checklist
  'createChecklist',
  'getChecklists',
  'deleteChecklist',
  'getChecklist',
  'updateChecklist',
  'getChecklistNames',

  // Checklist Item
  'createChecklistItem',
  'getChecklistItems',
  'deleteChecklistItem',
  'getChecklistItem',
  'updateChecklistItem',
  'getChecklistItemNames',

  // Checklist History
  'createChecklistHistory',
  'getChecklistHistory',
  'getChecklistHistories',
  'updateChecklistHistory',
  'deleteChecklistHistory',
  'getChecklistHistoryNames',
  'getlogs',
  // Five Whys
  'getFiveWhysByLibrary',
  'deleteFiveWhys',
  'updateFiveWhys',
  'createFiveWhys',
  'getFiveWhys',
  //Ishikawa
  'getIshikawaByLibrary',
  'getIshikawa',
  'deleteIshikawa',
  'createIshikawa',
  //Other
  'needAttention',
  // Reports
  'createReport',
  'getReports',
  'getReport',
  'updateReport',
  'deleteReport',
  'getReportPrevious',
  'getReport',
  'getLibraryReports',
];

const capaSubadminRoles = [
  /// Attachments
  'deleteAttachment',
  'updateAttachment',
  'getAttachmentById',
  'getAttachmentsByWorkspace',
  'createAttachment',

  // manageRoles
  'updateRole',
  'getSingleRole',
  `createRole`,
  'deleteRole',
  'getWorkspaceRoleNames',
  // 'manageWorkspaceUserPermissions'
  'getWorkspaceUsers',
  'createWorkspaceUser',
  'updateWorkspaceUser',
  'deleteWorkspaceUser',
  'getSingleWorkspaceUser',
  // 'manageGroups',
  'createGroup',
  'getWorkspaceGroups',
  'getWorkspaceGroupNames',
  'getSingleGroup',
  'updateGroup',
  'deleteGroup',
  // 'manageLibrary',
  'deleteLibrary',
  'updateLibrary',
  'removeLibraryMember',
  'addLibraryMember',
  'getLibraryMembers',
  'getWorkspaceLibraryNames',
  'getWorkspaceLibraries',
  'createLibrary',
  'updateLibraryById',
  'getSingleLibrary',
  'update5W2H',
  'getUserLibraries',
  'restoreLibrary',
  'deletePermanentLibrary',
  'updateContainment',

  // Actions
  'deleteAction',
  'updateAction',
  'getSingleAction',
  'getActions',
  'createAction',
  'getTasks',

  //Causes
  'createCauses',
  'getCauses',
  'deleteCause',
  'getCause',
  'updateCause',
  'getCausesNames',
  // Checklist
  'createChecklist',
  'getChecklists',
  'deleteChecklist',
  'getChecklist',
  'updateChecklist',
  'getChecklistNames',
  // Checklist Item
  'createChecklistItem',
  'getChecklistItems',
  'deleteChecklistItem',
  'getChecklistItem',
  'updateChecklistItem',
  'getChecklistItemNames',

  // Checklist History
  'createChecklistHistory',
  'getChecklistHistory',
  'getChecklistHistories',
  'updateChecklistHistory',
  'deleteChecklistHistory',
  'getChecklistHistoryNames',
  'getlogs',
  // Five Whys
  'getFiveWhysByLibrary',
  'deleteFiveWhys',
  'updateFiveWhys',
  'createFiveWhys',
  'getFiveWhys',
  //Ishikawa
  'getIshikawaByLibrary',
  'getIshikawa',
  'deleteIshikawa',
  'createIshikawa',
  //Other
  'needAttention',
  // Reports
  'createReport',
  'getReports',
  'getReport',
  'updateReport',
  'deleteReport',
  // Report Preview
  'getReportPrevious',
  'getReport',
  'getLibraryReports',
];

const capaView = [
  // 'manageLibrary',
  'getLibraryMembers',
  'getWorkspaceLibraryNames',
  'getWorkspaceLibraries',
  'getSingleLibrary',
  'getWorkspaceUsers',
  'getUserLibraries',

  // Actions

  'getSingleAction',
  'getActions',
  'getTasks',
  // Attachments
  'getAttachmentById',
  'getAttachmentsByWorkspace',

  //Causes
  'getCauses',

  'getCause',
  'getCausesNames',

  // Checklist History
  'getChecklistHistory',
  'getChecklistHistories',
  'getChecklistHistoryNames',
  'getlogs',
  // Five Whys
  'getFiveWhysByLibrary',
  'getFiveWhys',
  'createFiveWhys',
  //Ishikawa
  'getIshikawaByLibrary',
  'getIshikawa',
  'getChecklistItems',
  'getLibraryReports',
  'getReportPrevious',
  'createIshikawa',
];

const capaEdit = [
  // 'manageLibrary',
  'updateLibrary',
  'removeLibraryMember',
  'addLibraryMember',
  'getLibraryMembers',
  'getWorkspaceLibraryNames',
  'getWorkspaceLibraries',
  'updateLibraryById',
  'getSingleLibrary',
  'getWorkspaceUsers',
  'update5W2H',
  'getUserLibraries',
  'updateContainment',

  // Actions
  'updateAction',
  'getSingleAction',
  'getActions',
  'getTasks',
  // Attachments
  'updateAttachment',
  'getAttachmentById',
  'getAttachmentsByWorkspace',

  //Causes
  'getCauses',
  'deleteCause',
  'getCause',
  'updateCause',
  'getCausesNames',
  'getChecklistNames',

  // Checklist History
  'createChecklistHistory',
  'getChecklistHistory',
  'updateChecklistHistory',
  'getChecklistHistories',
  'getChecklistHistoryNames',
  'getlogs',
  'getChecklistItems',
  // Five Whys
  'getFiveWhysByLibrary',
  'deleteFiveWhys',
  'updateFiveWhys',
  'getFiveWhys',
  //Ishikawa
  'getIshikawaByLibrary',
  'getIshikawa',
  'getLibraryReports',
  'getReport',
  'updateReport',
  'getReportPrevious'
];

const capaWAdmin=[
    // permissions for workspace admin for role
      'updateRole',
      'getSingleRole',
      `createRole`,
      'deleteRole',
      'getWorkspaceRoleNames',

      // permissions for workspace admin for role
      'getWorkspaceUsers',
      'createWorkspaceUser',
      'updateWorkspaceUser',
      'deleteWorkspaceUser',
      'getSingleWorkspaceUser',

      // 'manageGroups',
      'createGroup',
      'getWorkspaceGroups',
      'getWorkspaceGroupNames',
      'getSingleGroup',
      'updateGroup',
      'deleteGroup',

      // 'manageLibrary',
      'deleteLibrary',
      'updateLibrary',
      'removeLibraryMember',
      'addLibraryMember',
      'getLibraryMembers',
      'getWorkspaceLibraryNames',
      'getWorkspaceLibraries',
      'createLibrary',
      'updateLibraryById',
      'getSingleLibrary',
      'update5W2H',
      'getUserLibraries',
      'restoreLibrary',
      'deletePermanentLibrary',
      'updateContainment',

      // Actions
      'deleteAction',
      'updateAction',
      'getSingleAction',
      'getActions',
      'createAction',
      'getTasks',

      // Attachments
      'deleteAttachment',
      'updateAttachment',
      'getAttachmentById',
      'getAttachmentsByWorkspace',
      'createAttachment',

      //Causes
      'createCauses',
      'getCauses',
      'deleteCause',
      'getCause',
      'updateCause',
      'getCausesNames',
      // Checklist
      'createChecklist',
      'getChecklists',
      'deleteChecklist',
      'getChecklist',
      'updateChecklist',
      'getChecklistNames',
      // Checklist Item
      'createChecklistItem',
      'getChecklistItems',
      'deleteChecklistItem',
      'getChecklistItem',
      'updateChecklistItem',
      'getChecklistItemNames',

      // Checklist History
      'createChecklistHistory',
      'getChecklistHistory',
      'updateChecklistHistory',
      'getChecklistHistories',
      'deleteChecklistHistory',
      'getChecklistHistoryNames',
      'getlogs',
      // Five Whys
      'getFiveWhysByLibrary',
      'deleteFiveWhys',
      'updateFiveWhys',
      'createFiveWhys',
      'getFiveWhys',
      //Ishikawa
      'getIshikawaByLibrary',
      'getIshikawa',
      'deleteIshikawa',
      'createIshikawa',
      //Other
      'needAttention',
      // Reports
      'createReport',
      'getReports',
      'getReport',
      'updateReport',
      'deleteReport',
      'getReport',
      // Report Preview
      'getReportPrevious',
      'getLibraryReports',
      'getReport',
      'updateReport'
]

const capastandardUser=[
    // 'manageLibrary',
      'deleteLibrary',
      'updateLibrary',
      'removeLibraryMember',
      'addLibraryMember',
      'getLibraryMembers',
      'getWorkspaceLibraryNames',
      'getWorkspaceLibraries',
      'createLibrary',
      'updateLibraryById',
      'update5W2H',
      'updateContainment',
      'getUserLibraries',

      // Actions
      'deleteAction',
      'updateAction',
      'getSingleAction',
      'getActions',
      'createAction',
      'getTasks',
      /// Attachments
      'deleteAttachment',
      'updateAttachment',
      'getAttachmentById',
      'getAttachmentsByWorkspace',
      'createAttachment',
      //Causes
      'createCauses',
      'getCauses',
      'deleteCause',
      'getCause',
      'updateCause',
      'getCausesNames',
      'getChecklistNames',

      // Checklist Item
      'createChecklistItem',
      'getChecklistItems',
      'deleteChecklistItem',
      'getChecklistItem',
      'updateChecklistItem',
      'getChecklistItemNames',

      // Checklist History
      'createChecklistHistory',
      'getChecklistHistory',
      'updateChecklistHistory',
      'getChecklistHistories',
      'deleteChecklistHistory',
      'getChecklistHistoryNames',
      'getlogs',
      // Five Whys
      'getFiveWhysByLibrary',
      'deleteFiveWhys',
      'updateFiveWhys',
      'createFiveWhys',
      'getFiveWhys',
      //Ishikawa
      'getIshikawaByLibrary',
      'getIshikawa',
      'deleteIshikawa',
      'createIshikawa',

      'getLibraryReports',
      'getReport',
      'updateReport',
      'getReportPrevious',
]
export { capaEdit, capaWAdmin, capaView,capaSubadminRoles,capaadminRoles ,capastandardUser};
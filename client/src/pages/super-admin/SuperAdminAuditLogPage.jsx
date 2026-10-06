import React from 'react';
import AuditLogView from '../../components/audit/AuditLogView';

export default function SuperAdminAuditLogPage() {
  return <AuditLogView isSuperAdmin={true} />;
}

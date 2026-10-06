import React from 'react';
import AuditLogView from '../../components/audit/AuditLogView';

export default function PMOAuditLogPage() {
  return <AuditLogView isSuperAdmin={false} />;
}

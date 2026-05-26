import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  authorized: { label: 'Authorized', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  correction_required: { label: 'Correction Required', color: 'bg-orange-100 text-orange-800' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-800' },
  submitted: { label: 'Submitted', color: 'bg-green-100 text-green-800' },
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  passed: { label: 'Passed', color: 'bg-green-100 text-green-800' },
  passed_minor: { label: 'Passed (Minor)', color: 'bg-green-100 text-green-800' },
  passed_major: { label: 'Passed (Major)', color: 'bg-yellow-100 text-yellow-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  resubmit: { label: 'Resubmit', color: 'bg-red-100 text-red-800' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
  minor_corrections: { label: 'Minor Corrections', color: 'bg-yellow-100 text-yellow-800' },
  major_corrections: { label: 'Major Corrections', color: 'bg-orange-100 text-orange-800' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={cn('px-3 py-1 rounded-full text-sm font-medium', config.color, className)}>
      {config.label}
    </span>
  );
}

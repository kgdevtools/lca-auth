// src/components/ui/SkeletonLoader.tsx
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-4"><SkeletonLoader className="h-4 w-32" /></td>
      <td className="px-6 py-4"><SkeletonLoader className="h-4 w-24" /></td>
      <td className="px-6 py-4"><SkeletonLoader className="h-4 w-16" /></td>
      <td className="px-6 py-4"><SkeletonLoader className="h-6 w-16" /></td>
      <td className="px-6 py-4"><SkeletonLoader className="h-8 w-20" /></td>
    </tr>
  );
}

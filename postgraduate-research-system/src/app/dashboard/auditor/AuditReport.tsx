'use client';

import { useRef, useState } from 'react';
import { Printer, Download, FileSpreadsheet, X, Loader2 } from 'lucide-react';

/* ─────────────────── SVG Charts ─────────────────── */

function DonutChart({ data, size = 150 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-gray-400 text-center">No data</p>;
  const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.23;
  let angle = -Math.PI / 2;
  const slices = data.map(d => {
    const s = angle; angle += (d.value / total) * 2 * Math.PI;
    return { ...d, s, e: angle };
  });
  const arc = (s: number, e: number, or: number, ir: number) => {
    const [x1, y1] = [cx + or * Math.cos(s), cy + or * Math.sin(s)];
    const [x2, y2] = [cx + or * Math.cos(e), cy + or * Math.sin(e)];
    const [ix1, iy1] = [cx + ir * Math.cos(e), cy + ir * Math.sin(e)];
    const [ix2, iy2] = [cx + ir * Math.cos(s), cy + ir * Math.sin(s)];
    const lg = e - s > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${or} ${or} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2} Z`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map(sl => <path key={sl.label} d={arc(sl.s, sl.e, r, ir)} fill={sl.color} stroke="white" strokeWidth="1.5" />)}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#111827">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#9CA3AF">total</text>
    </svg>
  );
}

function HBarChart({ items, width = 280 }: { items: { label: string; current: number; max: number }[]; width?: number }) {
  const bh = 18, gap = 10, lw = 90;
  return (
    <svg width={lw + width + 40} height={items.length * (bh + gap) + 6} className="overflow-visible">
      {items.map((it, i) => {
        const pct = it.max > 0 ? Math.min(it.current / it.max, 1) : 0;
        const col = pct >= 1 ? '#EF4444' : pct >= 0.75 ? '#F97316' : '#16A34A';
        const y = i * (bh + gap);
        return (
          <g key={it.label}>
            <text x={lw - 5} y={y + bh / 2 + 4} fontSize="9" fill="#6B7280" textAnchor="end">{it.label.length > 13 ? it.label.slice(0, 13) + '…' : it.label}</text>
            <rect x={lw} y={y} width={width} height={bh} fill="#F3F4F6" rx="3" />
            <rect x={lw} y={y} width={pct * width} height={bh} fill={col} rx="3" />
            <text x={lw + pct * width + 4} y={y + bh / 2 + 4} fontSize="9" fontWeight="bold" fill={col}>{Math.round(pct * 100)}%</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────── CSV Helper ─────────────────── */

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────── Main Component ─────────────────── */

interface Props {
  user: { name: string };
  stats: { totalResearch: number; pendingAudit: number; riskFlags: number; completedAudit: number };
  researchTitles: any[];
  students: any[];
  supervisors: any[];
  auditComments: any[];
  overdueItems: any[];
  studentsWithoutTitle: any[];
  openRiskFlags: any[];
  overloadedSupervisors: any[];
  onClose: () => void;
}

export default function AuditReport({
  user, stats, researchTitles, students, supervisors, auditComments,
  overdueItems, studentsWithoutTitle, openRiskFlags, overloadedSupervisors, onClose,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const filename = `audit-report-${new Date().toISOString().split('T')[0]}`;

  /* ── Research status counts ── */
  const pending = researchTitles.filter(t => t.faculty_status === 'pending' || t.admin_status === 'pending').length;
  const approved = researchTitles.filter(t => t.faculty_status === 'approved' && t.admin_status !== 'authorized').length;
  const authorized = researchTitles.filter(t => t.admin_status === 'authorized').length;
  const rejected = researchTitles.filter(t => t.faculty_status === 'rejected' || t.admin_status === 'rejected').length;

  const statusChartData = [
    { label: 'Pending', value: pending, color: '#F59E0B' },
    { label: 'Approved', value: approved, color: '#3B82F6' },
    { label: 'Authorized', value: authorized, color: '#16A34A' },
    { label: 'Rejected', value: rejected, color: '#EF4444' },
  ];

  /* ── PDF Download ── */
  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const [{ default: jsPDF }, { toPng }] = await Promise.all([
        import('jspdf'),
        import('html-to-image'),
      ]);
      // html-to-image handles modern CSS (oklch, lab) correctly unlike html2canvas
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: false,
        style: { fontFamily: 'Arial, sans-serif' },
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      // Determine image dimensions
      const img = new Image();
      await new Promise<void>(resolve => { img.onload = () => resolve(); img.src = dataUrl; });
      const imgH = (img.naturalHeight * imgW) / img.naturalWidth;
      const usableH = pageH - 20;
      let srcY = 0;
      let first = true;
      while (srcY < imgH) {
        const sliceH = Math.min(usableH, imgH - srcY);
        // Crop the image slice using a canvas
        const srcCanvas = document.createElement('canvas');
        const ratio = img.naturalWidth / imgW;
        srcCanvas.width = img.naturalWidth;
        srcCanvas.height = Math.round(sliceH * ratio);
        const ctx = srcCanvas.getContext('2d')!;
        ctx.drawImage(img, 0, Math.round(srcY * ratio), srcCanvas.width, srcCanvas.height, 0, 0, srcCanvas.width, srcCanvas.height);
        if (!first) { pdf.addPage(); }
        pdf.addImage(srcCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, sliceH);
        srcY += sliceH;
        first = false;
      }
      pdf.save(`${filename}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── CSV Downloads ── */
  const downloadAllCSV = () => {
    downloadCSV(`${filename}-research-titles.csv`, [
      ['#', 'Student', 'Title', 'Research Area', 'Faculty Status', 'Admin Status', 'Submitted At'],
      ...researchTitles.map((t, i) => [
        String(i + 1), t.student_name, t.title, t.research_area || '',
        t.faculty_status, t.admin_status,
        t.submitted_at ? new Date(t.submitted_at).toLocaleDateString() : '',
      ]),
    ]);
    setTimeout(() => {
      downloadCSV(`${filename}-supervisors.csv`, [
        ['Supervisor', 'Faculty', 'Department', 'Type', 'Students', 'Max Capacity', 'Utilisation %'],
        ...supervisors.map(s => {
          const pct = s.max_students > 0 ? Math.round((s.current_students / s.max_students) * 100) : 0;
          return [s.name, s.faculty_name || '', s.department_name || '', s.supervisor_type === 'main' ? 'Main' : 'Co', String(s.current_students), String(s.max_students), `${pct}%`];
        }),
      ]);
    }, 300);
    setTimeout(() => {
      downloadCSV(`${filename}-compliance.csv`, [
        ['Section', 'Student', 'Detail', 'Value'],
        ...overdueItems.map(t => ['Overdue Item', t.student_name, t.title, `${Math.floor((Date.now() - new Date(t.submitted_at).getTime()) / 86400000)} days waiting`]),
        ...studentsWithoutTitle.map(s => ['No Research Title', s.name, s.registration_number, s.program || '']),
        ...auditComments.map(c => ['Audit Comment', c.registration_number, c.comment, `Risk: ${c.risk_level} | Status: ${c.status}`]),
      ]);
    }, 600);
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #audit-report-area, #audit-report-area * { visibility: visible; }
          #audit-report-area { position: fixed; inset: 0; padding: 20px; background: white; z-index: 99999; overflow: visible; }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4 no-print"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full max-w-4xl">
          {/* Toolbar */}
          <div className="no-print flex items-center justify-between bg-white rounded-t-xl px-6 py-3 border-b border-gray-200 shadow-sm">
            <span className="text-sm text-gray-500">Audit Report Preview</span>
            <div className="flex items-center gap-2">
              <button onClick={downloadAllCSV}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-green-700 text-green-700 hover:bg-green-50">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </button>
              <button onClick={downloadPDF} disabled={pdfLoading}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-60">
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {pdfLoading ? 'Generating…' : 'PDF'}
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#1B5E20' }}>
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Report Content */}
          <div id="audit-report-area" ref={reportRef} className="bg-white rounded-b-xl shadow-2xl px-10 py-8 space-y-8 text-gray-800 text-sm">

            {/* Letterhead */}
            <div className="text-center border-b-2 border-gray-800 pb-5">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Zanzibar University</p>
              <h1 className="text-2xl font-bold text-gray-900">Audit &amp; Quality Assurance Report</h1>
              <p className="text-sm text-gray-500 mt-1">Postgraduate Research Management System</p>
              <div className="mt-2 flex justify-center gap-8 text-xs text-gray-400">
                <span>Date: {reportDate} at {reportTime}</span>
                <span>Prepared by: {user.name} — DVC Academic &amp; Quality Assurance</span>
              </div>
            </div>

            {/* 1. Executive Summary */}
            <section>
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1 mb-4">1. Executive Summary</h2>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Research', value: stats.totalResearch, color: '#1B5E20' },
                  { label: 'Pending Review', value: stats.pendingAudit, color: '#D97706' },
                  { label: 'Authorized', value: stats.completedAudit, color: '#16A34A' },
                  { label: 'Open Risk Flags', value: openRiskFlags.length, color: '#DC2626' },
                ].map(s => (
                  <div key={s.label} className="border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total Students', value: students.length },
                  { label: 'Total Supervisors', value: supervisors.length },
                  { label: 'Overloaded Supervisors', value: overloadedSupervisors.length },
                  { label: 'Students Without Title', value: studentsWithoutTitle.length },
                  { label: 'Overdue Items (>7 days)', value: overdueItems.length },
                  { label: 'Total Audit Comments', value: auditComments.length },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center py-1.5 px-2 border-b border-gray-100">
                    <span className="text-gray-600 text-xs">{s.label}</span>
                    <span className="font-bold text-sm">{s.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Charts */}
            <section>
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1 mb-4">2. Visual Overview</h2>
              <div className="grid grid-cols-2 gap-8">
                {/* Research Status Donut */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 text-center">Research Title Status</p>
                  <div className="flex items-center gap-4">
                    <DonutChart data={statusChartData} size={150} />
                    <div className="space-y-2">
                      {statusChartData.map(d => (
                        <div key={d.label} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                          <span className="text-xs text-gray-600">{d.label}</span>
                          <span className="text-xs font-bold ml-auto pl-4">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Supervisor Workload Bar */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 text-center">Supervisor Workload</p>
                  {supervisors.length === 0
                    ? <p className="text-xs text-gray-400 text-center">No supervisors</p>
                    : <HBarChart items={supervisors.map(s => ({ label: s.name, current: s.current_students, max: s.max_students }))} width={220} />
                  }
                  <div className="flex gap-4 mt-3 text-xs justify-center">
                    {[{ color: '#16A34A', label: '< 75%' }, { color: '#F97316', label: '75–99%' }, { color: '#EF4444', label: '≥ 100%' }].map(l => (
                      <div key={l.label} className="flex items-center gap-1"><div className="w-3 h-2 rounded" style={{ background: l.color }} /><span className="text-gray-500">{l.label}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Research Titles */}
            <section>
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3">3. Research Titles Overview</h2>
              <table className="w-full text-xs border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>{['#', 'Student', 'Title', 'Research Area', 'Faculty', 'Admin', 'Submitted'].map(h => (
                    <th key={h} className="text-left py-2 px-2 font-semibold text-gray-600 border-b border-gray-200">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {researchTitles.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-gray-400">No records</td></tr>}
                  {researchTitles.map((t, i) => (
                    <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                      <td className="py-1.5 px-2 font-medium">{t.student_name}</td>
                      <td className="py-1.5 px-2 max-w-[140px] truncate">{t.title}</td>
                      <td className="py-1.5 px-2">{t.research_area || '—'}</td>
                      <td className="py-1.5 px-2 capitalize">{t.faculty_status}</td>
                      <td className="py-1.5 px-2 capitalize">{t.admin_status}</td>
                      <td className="py-1.5 px-2 text-gray-400">{t.submitted_at ? new Date(t.submitted_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* 4. Supervisor Workload Table */}
            <section>
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3">4. Supervisor Workload</h2>
              <table className="w-full text-xs border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>{['Supervisor', 'Faculty', 'Department', 'Type', 'Students', 'Capacity', 'Utilisation'].map(h => (
                    <th key={h} className="text-left py-2 px-2 font-semibold text-gray-600 border-b border-gray-200">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {supervisors.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-gray-400">No supervisors</td></tr>}
                  {supervisors.map((s, i) => {
                    const pct = s.max_students > 0 ? Math.round((s.current_students / s.max_students) * 100) : 0;
                    return (
                      <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1.5 px-2 font-medium">{s.name}</td>
                        <td className="py-1.5 px-2">{s.faculty_name || '—'}</td>
                        <td className="py-1.5 px-2">{s.department_name || '—'}</td>
                        <td className="py-1.5 px-2">{s.supervisor_type === 'main' ? 'Main' : 'Co'}</td>
                        <td className="py-1.5 px-2">{s.current_students}</td>
                        <td className="py-1.5 px-2">{s.max_students}</td>
                        <td className={`py-1.5 px-2 font-bold ${pct >= 100 ? 'text-red-600' : pct >= 75 ? 'text-orange-600' : 'text-green-700'}`}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* 5. Compliance */}
            <section>
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3">5. Compliance Issues</h2>
              {overdueItems.length === 0 && studentsWithoutTitle.length === 0
                ? <p className="text-green-700 font-medium text-xs">✓ No compliance issues found.</p>
                : (
                  <div className="space-y-3">
                    {overdueItems.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-1">Overdue Pending Items ({overdueItems.length})</p>
                        <table className="w-full text-xs border border-gray-200">
                          <thead className="bg-red-50"><tr>{['Student','Title','Faculty','Admin','Waiting'].map(h=><th key={h} className="text-left py-1.5 px-2 font-semibold text-gray-600 border-b border-gray-200">{h}</th>)}</tr></thead>
                          <tbody>{overdueItems.map(t=><tr key={t.id} className="border-b border-gray-100"><td className="py-1.5 px-2">{t.student_name}</td><td className="py-1.5 px-2 max-w-[160px] truncate">{t.title}</td><td className="py-1.5 px-2 capitalize">{t.faculty_status}</td><td className="py-1.5 px-2 capitalize">{t.admin_status}</td><td className="py-1.5 px-2 font-bold text-red-600">{Math.floor((Date.now()-new Date(t.submitted_at).getTime())/86400000)}d</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                    {studentsWithoutTitle.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-yellow-700 mb-1">Students Without Research Title ({studentsWithoutTitle.length})</p>
                        <table className="w-full text-xs border border-gray-200">
                          <thead className="bg-yellow-50"><tr>{['Student','Reg. No.','Program'].map(h=><th key={h} className="text-left py-1.5 px-2 font-semibold text-gray-600 border-b border-gray-200">{h}</th>)}</tr></thead>
                          <tbody>{studentsWithoutTitle.map(s=><tr key={s.id} className="border-b border-gray-100"><td className="py-1.5 px-2">{s.name}</td><td className="py-1.5 px-2">{s.registration_number}</td><td className="py-1.5 px-2">{s.program||'—'}</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              }
            </section>

            {/* 6. Audit Comments */}
            <section>
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3">6. Audit Comments &amp; Risk Flags</h2>
              {auditComments.length === 0
                ? <p className="text-gray-400 text-xs">No audit comments recorded.</p>
                : (
                  <table className="w-full text-xs border border-gray-200">
                    <thead className="bg-gray-50"><tr>{['Student','Comment / Observation','Risk Level','Status'].map(h=><th key={h} className="text-left py-2 px-2 font-semibold text-gray-600 border-b border-gray-200">{h}</th>)}</tr></thead>
                    <tbody>{auditComments.map((c,i)=><tr key={c.id} className={i%2===0?'bg-white':'bg-gray-50'}><td className="py-1.5 px-2">{c.registration_number}</td><td className="py-1.5 px-2">{c.comment}</td><td className={`py-1.5 px-2 capitalize font-medium ${c.risk_level==='critical'||c.risk_level==='high'?'text-red-600':c.risk_level==='medium'?'text-yellow-600':'text-green-700'}`}>{c.risk_level}</td><td className="py-1.5 px-2 capitalize">{c.status}</td></tr>)}</tbody>
                  </table>
                )
              }
            </section>

            {/* Signature */}
            <section className="pt-6 border-t border-gray-300">
              <div className="grid grid-cols-2 gap-16">
                <div>
                  <div className="border-b border-gray-400 h-8 mb-1" />
                  <p className="text-xs font-semibold">{user.name}</p>
                  <p className="text-xs text-gray-500">DVC Academic &amp; Quality Assurance</p>
                  <p className="text-xs text-gray-400">Date: {reportDate}</p>
                </div>
                <div>
                  <div className="border-b border-gray-400 h-8 mb-1" />
                  <p className="text-xs font-semibold">Vice Chancellor</p>
                  <p className="text-xs text-gray-500">Zanzibar University</p>
                  <p className="text-xs text-gray-400">Date: ___________________</p>
                </div>
              </div>
              <p className="text-center text-xs text-gray-300 mt-6">— End of Report — Zanzibar University Postgraduate Research Management System — {reportDate} —</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

import React from 'react';

interface ScoreGaugeProps {
  score: number | null | undefined;
  size?: number;
  strokeWidth?: number;
  showGrade?: boolean;
}

export function getScoreGrade(score: number | null | undefined): {
  grade: string;
  color: string;
  label: string;
  badgeClass: string;
} {
  if (score === null || score === undefined) {
    return { grade: 'N/A', color: '#64748b', label: 'Pending', badgeClass: 'grade-badge-D' };
  }
  if (score >= 90) {
    return { grade: 'A', color: '#10b981', label: 'Excellent', badgeClass: 'grade-badge-A' };
  }
  if (score >= 80) {
    return { grade: 'B', color: '#06b6d4', label: 'Good', badgeClass: 'grade-badge-B' };
  }
  if (score >= 70) {
    return { grade: 'C', color: '#f59e0b', label: 'Fair', badgeClass: 'grade-badge-C' };
  }
  if (score >= 60) {
    return { grade: 'D', color: '#f97316', label: 'Poor', badgeClass: 'grade-badge-D' };
  }
  return { grade: 'F', color: '#ef4444', label: 'Critical Issues', badgeClass: 'grade-badge-F' };
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  showGrade = true,
}) => {
  const currentScore = score !== null && score !== undefined ? Math.max(0, Math.min(100, score)) : 0;
  const { grade, color, label } = getScoreGrade(score);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (currentScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated score arc */}
          {score !== null && score !== undefined && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${color}88)`,
              }}
            />
          )}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {score !== null && score !== undefined ? (
            <>
              <span className="text-3xl font-extrabold tracking-tight" style={{ color }}>
                {currentScore}
              </span>
              {showGrade && (
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Grade {grade}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-slate-500">--</span>
          )}
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-slate-400">{label}</span>
    </div>
  );
};

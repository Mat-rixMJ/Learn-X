'use client';
import React from 'react';

interface ChartData {
  labels: string[];
  data: number[];
  colors?: string[];
}

interface BarChartProps {
  data: ChartData;
  title: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, height = 200 }) => {
  const maxValue = Math.max(...data.data);
  const colors = data.colors || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-end justify-between space-x-2" style={{ height: `${height}px` }}>
        {data.labels.map((label, index) => {
          const barHeight = (data.data[index] / maxValue) * (height - 40);
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="relative w-full flex justify-center items-end">
                <div
                  className="w-full max-w-12 rounded-t transition-all duration-500 hover:opacity-80"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: colors[index % colors.length],
                    minHeight: '4px'
                  }}
                />
                <span className="absolute -top-6 text-xs text-gray-600 font-medium">
                  {data.data[index]}%
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-2 text-center max-w-16 break-words">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface LineChartProps {
  data: ChartData;
  title: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, title, height = 200 }) => {
  const maxValue = Math.max(...data.data);
  const minValue = Math.min(...data.data);
  const range = maxValue - minValue || 1;

  const points = data.data.map((value, index) => {
    const x = (index / (data.data.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 80; // 80% of height for data, 20% for padding
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Area under curve */}
          <path
            d={`M 0,100 L ${points} L 100,100 Z`}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="none"
          />
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {data.data.map((value, index) => {
            const x = (index / (data.data.length - 1)) * 100;
            const y = 100 - ((value - minValue) / range) * 80;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        {/* Labels */}
        <div className="absolute -bottom-2 left-0 right-0 flex justify-between">
          {data.labels.map((label, index) => (
            <span key={index} className="text-xs text-gray-500">
              {label}
            </span>
          ))}
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxValue}%</span>
          <span>{Math.round((maxValue + minValue) / 2)}%</span>
          <span>{minValue}%</span>
        </div>
      </div>
    </div>
  );
};

interface PieChartProps {
  data: ChartData;
  title: string;
  size?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ data, title, size = 200 }) => {
  const total = data.data.reduce((sum, value) => sum + value, 0);
  const colors = data.colors || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  
  let currentAngle = 0;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 20;

  const createArcPath = (startAngle: number, endAngle: number) => {
    const start = {
      x: centerX + radius * Math.cos(startAngle),
      y: centerY + radius * Math.sin(startAngle)
    };
    const end = {
      x: centerX + radius * Math.cos(endAngle),
      y: centerY + radius * Math.sin(endAngle)
    };
    
    const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
    
    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-center space-x-4">
        <svg width={size} height={size} className="flex-shrink-0">
          {data.data.map((value, index) => {
            const percentage = value / total;
            const startAngle = currentAngle;
            const endAngle = currentAngle + (percentage * 2 * Math.PI);
            currentAngle = endAngle;
            
            const path = createArcPath(startAngle, endAngle);
            
            return (
              <path
                key={index}
                d={path}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
        </svg>
        
        <div className="flex-1">
          <div className="space-y-2">
            {data.labels.map((label, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-sm text-gray-500">
                  ({Math.round((data.data[index] / total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DonutChartProps {
  data: ChartData;
  title: string;
  centerValue?: string;
  centerLabel?: string;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ 
  data, 
  title, 
  centerValue = '85%', 
  centerLabel = 'Overall',
  size = 200 
}) => {
  const total = data.data.reduce((sum, value) => sum + value, 0);
  const colors = data.colors || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
  
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-center space-x-4">
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
            
            {/* Data segments */}
            {data.data.map((value, index) => {
              const percentage = value / total;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -currentOffset;
              currentOffset += percentage * circumference;
              
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-gray-900">{centerValue}</div>
            <div className="text-sm text-gray-600">{centerLabel}</div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="space-y-2">
            {data.labels.map((label, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {data.data[index]}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
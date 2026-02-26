'use client';

import { useState, useRef } from 'react';
import { getSourceById } from '@/lib/sources';

interface SourcePriorityProps {
  sourceOrder: string[];
  onReorder: (newOrder: string[]) => void;
  onReset: () => void;
}

export default function SourcePriority({ sourceOrder, onReorder, onReset }: SourcePriorityProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragNode.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }
    const newOrder = [...sourceOrder];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, moved);
    onReorder(newOrder);
    handleDragEnd();
  };

  // Touch handling for mobile
  const [touchStart, setTouchStart] = useState<{ index: number; y: number } | null>(null);
  
  const handleTouchStart = (index: number, y: number) => {
    setTouchStart({ index, y });
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const dropTarget = elements.find(el => el.hasAttribute('data-source-index'));
    if (dropTarget) {
      const index = parseInt(dropTarget.getAttribute('data-source-index') || '-1');
      if (index >= 0 && index !== touchStart.index) {
        setDragOverIndex(index);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStart !== null && dragOverIndex !== null && touchStart.index !== dragOverIndex) {
      const newOrder = [...sourceOrder];
      const [moved] = newOrder.splice(touchStart.index, 1);
      newOrder.splice(dragOverIndex, 0, moved);
      onReorder(newOrder);
    }
    setTouchStart(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Get top sources to show in collapsed view
  const topSources = sourceOrder.slice(0, 5).map(id => getSourceById(id)).filter(Boolean);
  const remainingCount = sourceOrder.length - 5;

  return (
    <div className="mb-6">
      {/* Collapsed: Show current priority as interactive pills */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group cursor-pointer rounded-xl p-3 transition-all duration-200
          ${isOpen 
            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm' 
            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Label */}
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Priority
            </span>
            
            {/* Source icons as pills */}
            <div className="flex items-center gap-1">
              {topSources.map((source, i) => (
                <div
                  key={source!.id}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-md text-xs
                    ${i === 0 
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}
                  title={source!.name}
                >
                  <span>{source!.icon}</span>
                  <span className="hidden sm:inline max-w-[80px] truncate">{source!.name}</span>
                </div>
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  +{remainingCount}
                </span>
              )}
            </div>
          </div>

          {/* Edit hint */}
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            <span className="text-xs hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
              {isOpen ? 'Close' : 'Reorder'}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded: Full reorder UI */}
        {isOpen && (
          <div 
            className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Drag to reorder — results from top sources appear first
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reset
              </button>
            </div>

            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {sourceOrder.map((sourceId, index) => {
                const source = getSourceById(sourceId);
                if (!source) return null;

                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;
                const isTop3 = index < 3;

                return (
                  <div
                    key={sourceId}
                    data-source-index={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onTouchStart={(e) => handleTouchStart(index, e.touches[0].clientY)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing
                      border transition-all duration-150
                      ${isDragging ? 'opacity-50 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}
                      ${isDragOver ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}
                      ${!isDragging && !isDragOver ? (isTop3 
                        ? 'bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'
                      ) : ''}
                      hover:border-blue-300 dark:hover:border-blue-600
                    `}
                  >
                    {/* Drag handle */}
                    <div className="text-gray-300 dark:text-gray-600 select-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                      </svg>
                    </div>

                    {/* Position badge */}
                    <span className={`
                      w-5 h-5 flex items-center justify-center text-xs font-bold rounded
                      ${isTop3 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      {index + 1}
                    </span>

                    {/* Source */}
                    <span className="text-base select-none">{source.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none truncate">
                      {source.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
              Saved automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

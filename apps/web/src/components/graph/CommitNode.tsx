'use client';

import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { GitCommit } from 'lucide-react';

export function CommitNode({ data }: { data: any }) {
  const isHead = data.isHead;

  return (
    <div className="group relative">
      <div
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition-all duration-300',
          isHead 
            ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' 
            : 'border-gray-200 hover:border-gray-400 shadow-sm'
        )}
      >
        <GitCommit className={clsx(
           'h-5 w-5',
           isHead ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'
        )} />
        
        {/* SHA Tooltip */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
           {data.commitSha?.substring(0, 7) || 'commit'}
           <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </div>

      {/* Message Label (Optional on wide enough zoom) */}
      <div className="absolute top-1/2 left-12 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
         <div className="bg-white/90 backdrop-blur-sm border border-gray-100 px-3 py-1.5 rounded-lg shadow-sm">
            <p className="text-[10px] font-bold text-gray-900 truncate max-w-[200px]">{data.message}</p>
            <p className="text-[8px] text-gray-500">{data.author} • {new Date(data.timestamp).toLocaleDateString()}</p>
         </div>
      </div>

      <Handle type="target" position={Position.Top} className="!bg-gray-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300" />
    </div>
  );
}

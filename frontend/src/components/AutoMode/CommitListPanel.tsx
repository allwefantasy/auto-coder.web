import React, { useState, useEffect } from 'react';
import { getMessage } from '../Sidebar/lang';

interface Commit {
  id: string;
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
  stats: {
    insertions: number;
    deletions: number;
    files_changed: number;
  };
}

interface CommitListPanelProps {
  projectName: string;
}

const CommitListPanel: React.FC<CommitListPanelProps> = ({ projectName }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [commitDetails, setCommitDetails] = useState<any | null>(null);

  useEffect(() => {
    fetchCommits();
  }, []);

  const fetchCommits = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/commits');
      
      if (!response.ok) {
        throw new Error(`Error fetching commits: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCommits(data.commits);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Failed to fetch commits:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommitDetails = async (hash: string) => {
    try {
      setCommitDetails(null);
      const response = await fetch(`/api/commits/${hash}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching commit details: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCommitDetails(data);
    } catch (err) {
      console.error('Failed to fetch commit details:', err);
    }
  };

  const handleCommitClick = (hash: string) => {
    if (selectedCommit === hash) {
      setSelectedCommit(null);
      setCommitDetails(null);
    } else {
      setSelectedCommit(hash);
      fetchCommitDetails(hash);
    }
  };

  // 格式化日期为更友好的格式
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error && commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 text-red-400">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-lg font-medium mb-2">Error Loading Commits</p>
        <p className="text-sm">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white transition-colors"
          onClick={fetchCommits}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-white">
          Commit History
        </h2>
        <button 
          onClick={fetchCommits}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium mb-2">No Commit History</p>
          <p className="text-sm">This repository has no commits yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2">
          {commits.map((commit) => (
            <div key={commit.hash} className="mb-4">
              <div 
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedCommit === commit.hash 
                    ? 'bg-gray-700 border-l-4 border-indigo-500' 
                    : 'bg-gray-800 hover:bg-gray-750'
                }`}
                onClick={() => handleCommitClick(commit.hash)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-white font-medium mb-2 flex-1 mr-2">{commit.message}</h3>
                  <span className="text-xs font-mono text-gray-400 whitespace-nowrap">{commit.short_hash}</span>
                </div>
                
                <div className="flex items-center text-xs text-gray-400 mt-2">
                  <span>{commit.author}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(commit.date)}</span>
                </div>
                
                <div className="flex items-center mt-3 text-xs">
                  <span className="flex items-center text-green-400 mr-3">
                    <span className="font-mono mr-1">+{commit.stats.insertions}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </span>
                  <span className="flex items-center text-red-400 mr-3">
                    <span className="font-mono mr-1">-{commit.stats.deletions}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </span>
                  <span className="text-gray-400">
                    {commit.stats.files_changed} file{commit.stats.files_changed !== 1 ? 's' : ''} changed
                  </span>
                </div>
              </div>
              
              {/* 提交详情展开区域 */}
              {selectedCommit === commit.hash && commitDetails && (
                <div className="mt-2 pl-4 border-l-2 border-gray-700">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-white text-sm font-medium mb-3">Changed Files</h4>
                    <div className="space-y-2">
                      {commitDetails.files.map((file: any, index: number) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center">
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              file.status === 'added' ? 'bg-green-500' :
                              file.status === 'modified' ? 'bg-yellow-500' :
                              file.status === 'deleted' ? 'bg-red-500' : 'bg-blue-500'
                            }`}></span>
                            <span className={`font-mono ${
                              file.status === 'deleted' ? 'line-through text-gray-500' : 'text-gray-300'
                            }`}>
                              {file.filename}
                            </span>
                          </div>
                          <div className="flex text-xs mt-1 ml-4">
                            {file.changes && (
                              <>
                                {file.changes.insertions > 0 && (
                                  <span className="text-green-400 mr-3">+{file.changes.insertions}</span>
                                )}
                                {file.changes.deletions > 0 && (
                                  <span className="text-red-400">-{file.changes.deletions}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommitListPanel; 
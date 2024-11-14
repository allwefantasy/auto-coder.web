import React from 'react';

interface Group {
  name: string;
  filesCount: number;
  created: string;
}

const GroupList: React.FC = () => {
  const groups: Group[] = [
    { name: 'Documents', filesCount: 5, created: '2024-03-14' },
    { name: 'Images', filesCount: 3, created: '2024-03-13' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Groups</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Files</th>
              <th className="px-4 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{group.name}</td>
                <td className="px-4 py-2">{group.filesCount}</td>
                <td className="px-4 py-2">{group.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupList;
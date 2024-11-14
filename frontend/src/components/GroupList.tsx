import React from 'react';

interface Group {
  name: string;
  members: number;
  files: number;
}

const GroupList: React.FC = () => {
  const groups: Group[] = [
    {
      name: "Work Team",
      members: 5,
      files: 23
    },
    // Add more sample groups as needed
  ];

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
            <div className="text-gray-600">
              <p>Members: {group.members}</p>
              <p>Files: {group.files}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupList;
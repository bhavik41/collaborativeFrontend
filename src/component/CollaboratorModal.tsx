import React, { useState } from "react";

interface CollaboratorModalProps {
    collaborators: { id: string; email: string }[];
    allUsers: { id: string; email: string }[];
    handleAddCollaborators: (selectedUsers: string[]) => void;
    onClose: () => void;
}

const CollaboratorModal: React.FC<CollaboratorModalProps> = ({
    collaborators,
    allUsers,
    handleAddCollaborators,
    onClose,
}) => {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    return (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="modal-content bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="modal-header mb-4">
                    <h2 className="text-xl font-bold">Add Collaborators</h2>
                </div>

                <div className="modal-body">
                    <div className="current-collaborators mb-6">
                        <h3 className="text-sm font-semibold mb-2">Current Collaborators</h3>
                        <div className="flex flex-col gap-2">
                            {collaborators.map((user) => (
                                <div key={user.id} className="flex items-center gap-2 p-2 bg-slate-100 rounded">
                                    <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center">
                                        <i className="ri-user-fill text-white"></i>
                                    </div>
                                    <span>{user.email}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="available-users max-h-72 overflow-scroll">
                        <h3 className="text-sm font-semibold mb-2">Available Users</h3>
                        <div className="flex flex-col gap-2">
                            {allUsers
                                .filter((user) => !collaborators.some((c) => c.id === user.id))
                                .map((user) => (
                                    <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                                        <input
                                            type="checkbox"
                                            id={`user-${user.id}`}
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() =>
                                                setSelectedUsers((prev) =>
                                                    prev.includes(user.id)
                                                        ? prev.filter((id) => id !== user.id)
                                                        : [...prev, user.id]
                                                )
                                            }
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor={`user-${user.id}`} className="cursor-pointer">
                                            {user.email}
                                        </label>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                <div className="modal-footer mt-6 flex justify-end gap-2">
                    <button
                        className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-slate-950 text-white rounded hover:bg-slate-800"
                        onClick={() => handleAddCollaborators(selectedUsers)}
                    >
                        Add Selected
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorModal;

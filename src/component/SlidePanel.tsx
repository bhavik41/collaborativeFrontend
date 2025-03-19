import React from "react";

interface SlidePanelProps {
    isOpen: boolean;
    collaborators: { id: string; email: string }[];
    onClose: () => void;
}

const SlidePanel: React.FC<SlidePanelProps> = ({ isOpen, collaborators, onClose }) => {
    return <div
        className={`slidepanel w-full h-full flex flex-col gap-2 bg-slate-50 absolute top-0 transition-all ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
        <header className="flex justify-between items-center p-2 px-4 bg-slate-200">
            <h1 className="font-semibold text-lg">Collaborators</h1>
            <button className="p-2" onClick={onClose}>
                <i className="ri-close-circle-line"></i>
            </button>
        </header>
        <div className="users flex flex-col gap-2">

            {collaborators.map((user) => (
                <div key={user.id} className="user flex gap-2 cursor-pointer items-center hover:bg-slate-200 p-2">
                    <div className="aspect-square rounded-full w-fit h-fit p-4 flex items-center justify-center bg-slate-500 text-white">
                        <i className="ri-user-fill absolute"></i>
                    </div>
                    <h1 className="font-semibold text-lg">{user.email}</h1>
                </div>
            ))}
        </div>
    </div>
};

export default SlidePanel;

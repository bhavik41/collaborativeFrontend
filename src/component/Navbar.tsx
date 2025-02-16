import React from 'react';
import { Link } from 'react-router-dom';

interface NavbarProps {
    projectName?: string;
    onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ projectName, onLogout }) => {
    return (
        <nav className="navbar bg-gray-800 text-white p-4 flex justify-between items-center">
            <div className="navbar-left flex items-center gap-4">
                <Link to="/" className="text-xl font-bold">
                    Collaborative Coding
                </Link>
                {projectName && (
                    <span className="text-lg font-semibold">
                        Project: {projectName}
                    </span>
                )}
            </div>
            <div className="navbar-right flex items-center gap-4">
                <button
                    onClick={onLogout}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
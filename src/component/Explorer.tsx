import React from 'react';

interface FileTree {
    [key: string]: {
        file: {
            contents: string;
            language: string;
        }
    };
}

interface ExplorerProps {
    fileTree: FileTree;
    setFileTree: React.Dispatch<React.SetStateAction<FileTree>>;
    currentFile: string | null;
    setCurrentFile: React.Dispatch<React.SetStateAction<string | null>>;
    openFiles: string[];
    setOpenFiles: React.Dispatch<React.SetStateAction<string[]>>;
}

const Explorer: React.FC<ExplorerProps> = ({ fileTree, setFileTree, currentFile, setCurrentFile, openFiles, setOpenFiles }) => {
    return (
        <div className="explorer h-full max-w-64 min-w-52 bg-slate-200">
            <div className="file-tree w-full flex flex-col gap-1">
                {Object.keys(fileTree).map((file, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setCurrentFile(file);
                            if (!openFiles.includes(file)) {
                                setOpenFiles([...openFiles, file]);
                            }
                        }}
                        className="tree-element cursor-pointer py-2 px-4 flex items-center gap-2 bg-slate-400 w-full">
                        <p className='font-semibold text-lg'>
                            {file}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Explorer;
import React, { useState, useRef, useEffect } from 'react';
import { receiveMessage, sendMessage } from '../config/socket';

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
    // broadcastChanges: (updatedFileTree: FileTree) => void;
}

const Explorer: React.FC<ExplorerProps> = ({
    fileTree,
    setFileTree,
    currentFile,
    setCurrentFile,
    openFiles,
    setOpenFiles,
    // broadcastChanges
}) => {
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if ((editingFile || newFileName) && inputRef.current) {
            inputRef.current.focus();
            if (newFileName) {
                inputRef.current.select();
            }
        }
    }, [editingFile, newFileName]);

    useEffect(() => {
        receiveMessage("fileTree-update", (data: any) => {

            setFileTree(data);
        });
    })

    const createNewFile = () => {
        let tempName = "untitled";
        let counter = 1;
        while (fileTree[`${tempName}${counter}.txt`]) {
            counter++;
        }
        const suggestedFileName = `${tempName}${counter}.txt`;

        // Add temporary file and put it in edit mode
        const updatedFileTree = {
            ...fileTree,
            [suggestedFileName]: {
                file: {
                    contents: "",
                    language: "plaintext"
                }
            }
        };
        setFileTree(updatedFileTree);
        setNewFileName(suggestedFileName);
    };

    const handleNewFileNameSubmit = (e: React.KeyboardEvent | React.FocusEvent) => {
        if (
            e.type === 'keydown' &&
            (e as React.KeyboardEvent).key !== 'Enter' &&
            (e as React.KeyboardEvent).key !== 'Escape'
        ) {
            return;
        }

        if (newFileName && ((e as React.KeyboardEvent).key === 'Escape' || e.type === 'blur')) {
            // Cancel new file creation
            const updatedFileTree = { ...fileTree };
            delete updatedFileTree[newFileName];
            setFileTree(updatedFileTree);
            setNewFileName(null);
            return;
        }

        if (newFileName && inputRef.current) {
            const finalName = inputRef.current.value.trim();
            if (finalName && finalName !== newFileName && !fileTree[finalName]) {
                // Rename the temporary file to the chosen name
                const updatedFileTree = { ...fileTree };
                updatedFileTree[finalName] = updatedFileTree[newFileName];
                delete updatedFileTree[newFileName];
                setFileTree(updatedFileTree);
                broadcastChanges(updatedFileTree);
                setCurrentFile(finalName);
                if (!openFiles.includes(finalName)) {
                    setOpenFiles([...openFiles, finalName]);
                }
            } else if (!finalName) {
                // If empty name, delete the temporary file
                const updatedFileTree = { ...fileTree };
                delete updatedFileTree[newFileName];
                setFileTree(updatedFileTree);
            }
        }

        setNewFileName(null);
    };

    const handleRename = (e: React.KeyboardEvent | React.FocusEvent, oldName: string) => {
        if (
            e.type === 'keydown' &&
            (e as React.KeyboardEvent).key !== 'Enter' &&
            (e as React.KeyboardEvent).key !== 'Escape'
        ) {
            return;
        }

        if ((e as React.KeyboardEvent).key === 'Escape') {
            setEditingFile(null);
            return;
        }

        if (inputRef.current) {
            const newName = inputRef.current.value.trim();
            if (newName && newName !== oldName && !fileTree[newName]) {
                const updatedFileTree = { ...fileTree };
                updatedFileTree[newName] = updatedFileTree[oldName];
                delete updatedFileTree[oldName];

                // Update open files and current file if needed
                const newOpenFiles = openFiles.map(f => f === oldName ? newName : f);
                setOpenFiles(newOpenFiles);
                if (currentFile === oldName) {
                    setCurrentFile(newName);
                }

                setFileTree(updatedFileTree);
                broadcastChanges(updatedFileTree);
            }
        }

        setEditingFile(null);
    };

    const deleteFile = (fileName: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Show confirmation dialog
        if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
            const updatedFileTree = { ...fileTree };
            delete updatedFileTree[fileName];

            // Update open files and current file if needed
            const newOpenFiles = openFiles.filter(f => f !== fileName);
            setOpenFiles(newOpenFiles);
            if (currentFile === fileName) {
                setCurrentFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
            }

            setFileTree(updatedFileTree);
            broadcastChanges(updatedFileTree);
        }
    };

    const startRenaming = (fileName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingFile(fileName);
    };

    const handleFileClick = (fileName: string) => {
        setCurrentFile(fileName);
        if (!openFiles.includes(fileName)) {
            setOpenFiles([...openFiles, fileName]);
        }
    };

    // Function to truncate filename if it's too long
    const truncateFilename = (filename: string, maxLength: number = 20) => {
        if (filename.length <= maxLength) return filename;
        const extension = filename.lastIndexOf('.') > 0 ?
            filename.substring(filename.lastIndexOf('.')) : '';
        const name = filename.substring(0, filename.lastIndexOf('.') > 0 ?
            filename.lastIndexOf('.') : filename.length);

        if (name.length <= maxLength - 3 - extension.length) return filename;

        return `${name.substring(0, maxLength - 3 - extension.length)}...${extension}`;
    };

    const broadcastChanges = (updatedFileTree: FileTree) => {

        sendMessage('fileTree-update', updatedFileTree);

    }

    return (
        <div className="explorer h-full max-w-64 min-w-52 bg-slate-200 p-2">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Files</h3>
                <button
                    onClick={createNewFile}
                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    title="New File"
                >
                    <span className="text-sm font-bold">+</span>
                </button>
            </div>

            <div className="file-tree w-full flex flex-col gap-1">
                {Object.keys(fileTree).map((file) => (
                    <div
                        key={file}
                        className={`flex justify-between items-center hover:bg-slate-300 rounded ${currentFile === file ? 'bg-slate-300' : ''
                            }`}
                    >
                        {editingFile === file || newFileName === file ? (
                            <input
                                ref={inputRef}
                                type="text"
                                defaultValue={file}
                                onKeyDown={(e) => newFileName === file
                                    ? handleNewFileNameSubmit(e)
                                    : handleRename(e, file)
                                }
                                onBlur={(e) => newFileName === file
                                    ? handleNewFileNameSubmit(e)
                                    : handleRename(e, file)
                                }
                                className="p-1 border flex-1 m-1"
                            />
                        ) : (
                            <>
                                <div
                                    onClick={() => handleFileClick(file)}
                                    className="cursor-pointer py-2 px-4 flex items-center gap-2 w-full rounded overflow-hidden"
                                    title={file} // Full filename shown on hover
                                >
                                    <p className='font-medium truncate'>
                                        {truncateFilename(file)}
                                    </p>
                                </div>
                                <div className="flex flex-shrink-0 opacity-100 mr-2">
                                    <button
                                        onClick={(e) => startRenaming(file, e)}
                                        className="p-1 text-gray-600 hover:bg-slate-400 rounded"
                                        title="Rename"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={(e) => deleteFile(file, e)}
                                        className="p-1 text-gray-600 hover:bg-slate-400 rounded"
                                        title="Delete"
                                    >
                                        ❌
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Explorer;
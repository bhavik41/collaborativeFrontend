// File: /src/component/ShareLinkModal.tsx

import React, { useState } from 'react';
import { X, Copy, Link } from 'lucide-react';
import axios from 'axios';

interface ShareLinkModalProps {
    projectId: string;
    onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ projectId, onClose }) => {
    const [shareUrl, setShareUrl] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const generateShareLink = async () => {
        setIsLoading(true);
        setError(null);
        console.log('projectId', projectId)

        try {
            const response = await axios.post<any>(`${import.meta.env.VITE_API_URL}/project/share-link`, { projectId }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setShareUrl(response.data.shareUrl);
            setExpiresAt(new Date(response.data.expiresAt));
            setIsLoading(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to generate share link');
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md border border-slate-100">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xl font-semibold text-slate-800">Share Project</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-slate-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="space-y-4">
                    {!shareUrl ? (
                        <>
                            <p className="text-slate-600">
                                Generate a link that allows others to join this project as collaborators.
                                The link will expire after 7 days.
                            </p>
                            <button
                                onClick={generateShareLink}
                                disabled={isLoading}
                                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Link size={18} />
                                        Generate Share Link
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <p className="text-sm text-slate-500 mb-2">Share this link:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        className="flex-1 p-2 border border-slate-300 rounded text-sm"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className={`p-2 rounded ${isCopied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}
                                    >
                                        {isCopied ? 'Copied!' : <Copy size={18} />}
                                    </button>
                                </div>
                                {expiresAt && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        Expires on: {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={generateShareLink}
                                className="w-full py-2 px-4 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                Generate New Link
                            </button>
                        </>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareLinkModal;
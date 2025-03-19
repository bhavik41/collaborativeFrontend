import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { initializeSocket, receiveMessage } from "../config/socket";
import { useSelector } from "react-redux";
import { RootState } from "../App/store";
import SlidePanel from "../component/SlidePanel";
import MessageArea from "../component/MessageArea";
import CollaboratorModal from "../component/CollaboratorModal";
import ShareLinkModal from "../component/ShareLinkModal";
import CodeEditor from "../component/Monaco";
import { WebContainer } from "@webcontainer/api";
import { getWebContainer } from "../config/wbContainer";
import Explorer from "../component/Explorer";
import { Link, UserPlus, Users } from "lucide-react";

interface User {
    id: string;
    email: string;
}

interface Project {
    id: string;
    name: string;
    creator: string;
    language: string;
    description?: string
    users: User[];
    fileTree: FileTree
    version: number;
}

interface Message {
    sender: string;
    message: string;
}

interface FileContent {
    file: {
        contents: string;
        language?: string;
    };
}

interface DirectoryContent {
    directory: {
        [key: string]: FileNode;
    };
}

type FileNode = FileContent | DirectoryContent;

interface FileTree {
    [key: string]: FileNode;
}

const Project = () => {
    const location = useLocation();
    const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [collaborators, setCollaborators] = useState<User[]>([]);
    const project = location.state.project;
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const { user } = useSelector((state: RootState) => state.auth);
    const [fileTree, setFileTree] = useState<FileTree>({})
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [openFiles, setOpenFiles] = useState<string[]>([])
    const [webContainer, setWebContainer] = useState<WebContainer | null>(null)

    useEffect(() => {
        console.log("project", project)
        if (!webContainer) {
            getWebContainer().then((container) => {
                setWebContainer(container);
                console.log("container started");
            });
        }

        initializeSocket(project.id);
        receiveMessage("project-message", async (data: any) => {
            if (user && data.sender !== user.email) {
                const incomingMessage: Message = {
                    sender: data.sender,
                    message: data.message,
                };
                console.log(data.message)

                setMessages((prevMessages) => [...prevMessages, incomingMessage]);
            }

            if (user && data.sender === 'AI') {
                if (data.message) {
                    console.log("bhavik")
                    const message = JSON.parse(data.message);
                    console.log(message.fileTree)
                    if (message.fileTree) {

                        setFileTree(message.fileTree)

                        try {
                            const response = await axios.put(`${import.meta.env.VITE_API_URL}/project/update-file-tree`, {
                                projectId: project.id,
                                fileTree: message.fileTree,
                            }, {
                                headers: {
                                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                                },
                            });
                            console.log('rsponse', response.data);
                        } catch (err) {
                            console.error("Error saving file tree:", err);

                        }
                        console.log(fileTree)
                    }

                    webContainer?.mount(message.fileTree)
                }
            }
        });

        axios
            .get<{ project: Project }>(`${import.meta.env.VITE_API_URL}/project/get-project/${location.state.project.id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            })
            .then(
                (res) => {
                    console.log(project)
                    setCollaborators(res.data.project.users);
                    setFileTree(res.data.project.fileTree)
                }
            )
            .catch((err) => console.error("Error fetching project data:", err));

        axios
            .get<User[]>(`${import.meta.env.VITE_API_URL}/users/all`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            })
            .then((res) => setAllUsers(res.data))
            .catch((err) => console.error("Error fetching users:", err));
    }, []);

    const handleAddCollaborators = async (selectedUsers: string[]) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/project/add-user`, {
                projectId: project.id,
                users: selectedUsers,
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            // Update collaborators list
            const updatedCollaborators = allUsers.filter((user) =>
                selectedUsers.includes(user.id)
            );

            setCollaborators((prev) => [...prev, ...updatedCollaborators]);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding collaborators:", error);
        }
    };

    return (
        <main className="w-screen h-screen flex">
            <section className="left relative flex flex-col h-full min-w-96 bg-slate-300">
                <header className="flex justify-between items-center p-2 px-4 w-full bg-slate-100">
                    <div className="flex gap-2">
                        <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-blue-700"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <UserPlus size={16} />
                            <span className="text-sm">Add Collaborator</span>
                        </button>
                        <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-green-700"
                            onClick={() => setIsShareModalOpen(true)}
                        >
                            <Link size={16} />
                            <span className="text-sm">Share Link</span>
                        </button>
                    </div>
                    <button
                        onClick={() => setIsSlidePanelOpen(!isSlidePanelOpen)}
                        className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"
                    >
                        <Users size={18} className="text-slate-700" />
                    </button>
                </header>

                <MessageArea
                    messages={messages}
                    setMessages={setMessages}
                />

                <SlidePanel
                    isOpen={isSlidePanelOpen}
                    collaborators={collaborators}
                    onClose={() => setIsSlidePanelOpen(false)}
                />
            </section>

            <section className="right bg-red-50 flex-grow h-full flex">
                <Explorer
                    fileTree={fileTree}
                    setFileTree={setFileTree}
                    currentFile={currentFile}
                    setCurrentFile={setCurrentFile}
                    openFiles={openFiles}
                    setOpenFiles={setOpenFiles}
                    project={project}
                />
                <CodeEditor
                    fileTree={fileTree}
                    setFileTree={setFileTree}
                    currentFile={currentFile}
                    setCurrentFile={setCurrentFile}
                    openFiles={openFiles}
                    setOpenFiles={setOpenFiles}
                    webContainer={webContainer}
                    project={project}
                />
            </section>

            {isModalOpen && (
                <CollaboratorModal
                    collaborators={collaborators}
                    allUsers={allUsers}
                    onClose={() => setIsModalOpen(false)}
                    handleAddCollaborators={handleAddCollaborators}
                />
            )}

            {isShareModalOpen && (

                <ShareLinkModal
                    projectId={project.id}
                    onClose={() => setIsShareModalOpen(false)}
                />
            )}
        </main>
    );
};

export default Project;
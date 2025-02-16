import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "../config/axios";
import { initializeSocket, receiveMessage } from "../config/socket";
import { useSelector } from "react-redux";
import { RootState } from "../App/store";
import SlidePanel from "../component/SlidePanel";
import MessageArea from "../component/MessageArea";
import CollaboratorModal from "../component/CollaboratorModal";

import CodeEditor from "../component/CodeEditor";
import { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { getWebContainer } from "../config/wbContainer";
import Explorer from "../component/Explorer";


interface User {
    id: string;
    email: string;
}

interface Project {
    id: string;
    name: string;
    users: User[];
    fileTree: FileTree
    version: number;
}



interface Message {
    sender: string;
    message: string;
    type: "incoming" | "outgoing";
}


interface FileTree {
    [key: string]: {
        file: {
            contents: string;
            language: string;
        }
    };
}

const Project = () => {
    const location = useLocation();
    const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [collaborators, setCollaborators] = useState<User[]>([]);
    const [project, setProject] = useState<Project>(location.state.project);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const { user } = useSelector((state: RootState) => state.auth);
    const [fileTree, setFileTree] = useState<FileTree>({})
    const [currentFile, setCurrentFile] = useState<string | null>(null)
    const [openFiles, setOpenFiles] = useState<string[]>([])
    const [webContainer, setWebContainer] = useState<WebContainer | null>(null)
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [runProcess, setRunProcess] = useState<WebContainerProcess | null>(null);

    useEffect(() => {
        if (!webContainer) {
            getWebContainer().then((container) => {
                setWebContainer(container);
                console.log("container started");
            });
        }

        initializeSocket(project.id);
        receiveMessage("project-message", (data: any) => {
            if (user && data.sender !== user.email) {
                const incomingMessage: Message = {
                    sender: data.sender,
                    message: data.message,
                    type: "incoming",
                };
                console.log(data.message)

                setMessages((prevMessages) => [...prevMessages, incomingMessage]);
            }

            if (user && data.sender === 'AI') {
                if (data.message) {
                    console.log("bhavik")
                    const message = JSON.parse(data.message);
                    console.log(message.fileTree)

                    console.log(message)
                    if (message.fileTree) {
                        setFileTree(message.fileTree)
                        console.log(fileTree)
                    }

                    webContainer?.mount(message.fileTree)
                }
            }
        });



        axios
            .get<{ project: Project }>(`/project/get-project/${location.state.project.id}`)
            .then(
                (res) => {
                    setCollaborators(res.data.project.users);

                    setFileTree(res.data.project.fileTree)
                }

            )
            .catch((err) => console.error("Error fetching project data:", err));

        axios
            .get<User[]>("/users/all")
            .then((res) => setAllUsers(res.data))
            .catch((err) => console.error("Error fetching users:", err));
    }, []);

    const handleAddCollaborators = async (selectedUsers: string[]) => {
        try {
            await axios.put('/project/add-user', {
                projectId: project.id,
                users: selectedUsers,
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
        <main className="h-screen w-screen flex">
            <section className="left relative flex flex-col h-full min-w-96 bg-slate-300">
                <header className="flex justify-between items-center p-2 px-4 w-full bg-slate-100">
                    <button className="flex gap-2" onClick={() => setIsModalOpen(true)}>
                        <i className="ri-add-large-fill"></i>
                        Add Collaborator
                    </button>
                    <button onClick={() => setIsSlidePanelOpen(!isSlidePanelOpen)} className="p-2">
                        <i className="ri-group-fill"></i>
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
                {/* <div className="explorer h-full max-w-64 min-w-52 bg-slate-200">
                    <div className="file-tree w-full ">
                        <div className="tree-element cursor-pointer p-2 px-4 flex items-center gap-2 bg-slate-300">
                            <p className='font-semibold text-lg'>
                                app.js
                            </p>
                        </div>

                    </div>
                </div> */}
                <Explorer
                    fileTree={fileTree}
                    setFileTree={setFileTree}
                    currentFile={currentFile}
                    setCurrentFile={setCurrentFile}
                    openFiles={openFiles}
                    setOpenFiles={setOpenFiles}
                />
                <CodeEditor
                    fileTree={fileTree}
                    setFileTree={setFileTree}
                    currentFile={currentFile}
                    setCurrentFile={setCurrentFile}
                    openFiles={openFiles}
                    setOpenFiles={setOpenFiles}
                    webContainer={webContainer}
                    iframeUrl={iframeUrl}
                    setIframeUrl={setIframeUrl}
                    runProcess={runProcess}
                    setRunProcess={setRunProcess}
                    project={project}

                />

            </section>

            {
                isModalOpen && (
                    <CollaboratorModal
                        collaborators={collaborators}
                        allUsers={allUsers}
                        onClose={() => setIsModalOpen(false)}
                        handleAddCollaborators={handleAddCollaborators}
                    />
                )
            }
        </main >
    );
};

export default Project;

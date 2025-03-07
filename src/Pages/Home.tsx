import React, { useState, useEffect } from 'react';
import { Loader2, PencilLine, Globe, Code, ChevronDown, ChevronUp, Info } from 'lucide-react';
import axios from '../config/axios';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../App/store';
import { FilePlus2, UserRound, Trash2, FolderGit2, Search, Plus, X } from 'lucide-react';
import { Card, CardContent } from '../component/ui/card';
import { Button } from '../component/ui/Button';
import { Input } from '../component/ui/Inout';
import bg from '../assets/juyt_6.jpg'

interface Project {
    id: string;
    name: string;
    users: string[];
    creator: string;
    language?: string;
    description?: string;
    version?: number;
    createdAt?: string;
}

const Home = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
    const [projectName, setProjectName] = useState<string>('');
    const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeCard, setActiveCard] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>("JavaScript");
    const [description, setDescription] = useState<string>("");
    const [expandedDescription, setExpandedDescription] = useState<string | null>(null);

    const navigate = useNavigate();

    const fetchProjects = () => {
        setIsLoading(true);
        axios.get<{ Projects: Project[] }>('/project/all')
            .then((res) => {
                setProjects(res.data.Projects);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Failed to fetch projects:", error);
                setIsLoading(false);
            });
    };

    const languages = [
        "JavaScript",
        "Python",
        "Java",
        "C++",
        "Ruby",
        "Go",
        "TypeScript",
        "Node"
    ];

    const getLanguageColor = (language: string) => {
        const colorMap: Record<string, { bg: string, text: string }> = {
            "JavaScript": { bg: "bg-yellow-50", text: "text-yellow-700" },
            "TypeScript": { bg: "bg-blue-50", text: "text-blue-700" },
            "Python": { bg: "bg-green-50", text: "text-green-700" },
            "Java": { bg: "bg-orange-50", text: "text-orange-700" },
            "C++": { bg: "bg-purple-50", text: "text-purple-700" },
            "Ruby": { bg: "bg-red-50", text: "text-red-700" },
            "Go": { bg: "bg-cyan-50", text: "text-cyan-700" },
        };

        return colorMap[language] || { bg: "bg-gray-50", text: "text-gray-700" };
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const createProject = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await axios.post<{ newProject: Project }>('/project/create', {
                name: projectName,
                language: selectedLanguage,
                description: description,
            });

            // Add the user as the creator for the new project
            const newProjectWithCreator = {
                ...res.data.newProject,
                creator: user?.id || '', // Ensure the current user is marked as the creator
                language: selectedLanguage,
                description: description
            };

            setProjects((prevProjects) =>
                prevProjects ? [...prevProjects, newProjectWithCreator] : [newProjectWithCreator]
            );
            setProjectName('');
            setDescription('');
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to create project:", error);
        }
    };

    const renameProject = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!renameProjectId) return;

        try {
            const res = await axios.patch<{ project: Project }>(`/project/rename/${renameProjectId}`, {
                name: projectName,
            });

            setProjects((prevProjects) =>
                prevProjects?.map((project) =>
                    project.id === renameProjectId ? res.data.project : project
                ) || null
            );
            setProjectName('');
            setRenameProjectId(null);
            setIsRenameModalOpen(false);
        } catch (error) {
            console.error("Failed to rename project:", error);
        }
    };

    const deleteProject = async () => {
        if (!projectToDelete || confirmDeleteName !== projectToDelete.name) return;

        setDeleteLoading(projectToDelete.id);

        try {
            await axios.delete<{ project: Project }>(`/project/delete/${projectToDelete.id}`);
            setProjects((prevProjects) =>
                prevProjects ? prevProjects.filter((project) => project.id !== projectToDelete.id) : null
            );
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
            setConfirmDeleteName('');
        } catch (error) {
            console.error("Failed to delete project:", error);
        } finally {
            setDeleteLoading(null);
        }
    };

    const toggleDescription = (projectId: string) => {
        if (expandedDescription === projectId) {
            setExpandedDescription(null);
        } else {
            setExpandedDescription(projectId);
        }
    };

    const filteredProjects = projects?.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br">
            <div
                className="absolute top-16 inset-0 bg-cover bg-center bg-no-repeat object-left"
                style={{
                    backgroundImage: `url(${bg})`
                }}
            >
            </div>

            <div className="relative z-10">
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="fixed bottom-11 right-11 w-16 h-16 text-white rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                >
                    <Plus size={24} />
                </Button>
                <main className="max-w-7xl mx-auto p-6">
                    <div className="mb-12 text-center">
                        <h1 className="text-4xl font-bold text-slate-800 mb-4 animate-fade-in">
                            Project Dashboard
                        </h1>
                        <div className="relative max-w-xl mx-auto">
                            <Input
                                type="search"
                                placeholder="Search projects..."
                                className="w-full pl-12 h-12 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div className={"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {isLoading ? (
                            // Skeleton Loading
                            Array.from({ length: 6 }).map((_, index) => (
                                <Card key={index} className="animate-pulse">
                                    <CardContent className="p-6">
                                        <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            filteredProjects && filteredProjects.length > 0 ? (
                                filteredProjects.map((project) => (
                                    <Card
                                        key={project.id}
                                        className={`group transition-all duration-500 hover:shadow-2xl 
                                        ${activeCard === project.id ? 'scale-105' : 'hover:scale-102'} 
                                        transform perspective-1000`}
                                        onMouseEnter={() => setActiveCard(project.id)}
                                        onMouseLeave={() => setActiveCard(null)}
                                    >
                                        <CardContent className="p-6 relative overflow-hidden">
                                            {/* Background Pattern */}
                                            <div className="absolute top-0 right-0 w-40 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-125 duration-500"></div>

                                            <div className="relative">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg group-hover:shadow-xl transition-all duration-300">
                                                            <FolderGit2 className="text-white" size={24} />
                                                        </div>
                                                        <div>
                                                            <h2 className="text-xl font-semibold text-slate-800 truncate">
                                                                {project.name}
                                                            </h2>
                                                            <p className="text-sm text-slate-500">
                                                                Last updated: Jun 30 2024
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {user && project.creator === user.id && (
                                                        <div className="right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRenameProjectId(project.id);
                                                                    setProjectName(project.name);
                                                                    setIsRenameModalOpen(true);
                                                                }}
                                                                className="p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                                                            >
                                                                <PencilLine size={18} className="text-blue-500" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setProjectToDelete(project);
                                                                    setIsDeleteModalOpen(true);
                                                                }}
                                                                className="p-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                                                                disabled={deleteLoading === project.id}
                                                            >
                                                                {deleteLoading === project.id ? (
                                                                    <Loader2 size={18} className="text-red-500 animate-spin" />
                                                                ) : (
                                                                    <Trash2 size={18} className="text-red-500" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Badges Container - Fixed order and layout */}
                                                <div className="grid grid-cols-2 gap-2 mt-4">
                                                    {/* Members Badge */}
                                                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-blue-700 text-sm">
                                                        <UserRound size={14} />
                                                        {project.users.length} Members
                                                    </div>

                                                    {/* Version Badge */}
                                                    <div className="flex items-center justify-center bg-purple-50 px-3 py-1.5 rounded-full text-purple-700 text-sm">
                                                        v1.0
                                                    </div>

                                                    {/* Language Badge */}
                                                    {project.language && (
                                                        <div className={`flex items-center gap-2 ${getLanguageColor(project.language).bg} px-3 py-1.5 rounded-full ${getLanguageColor(project.language).text} text-sm`}>
                                                            <Code size={14} />
                                                            {project.language}
                                                        </div>
                                                    )}

                                                    {/* Owner Badge */}
                                                    <div className="flex items-center justify-center bg-green-50 px-3 py-1.5 rounded-full text-green-700 text-sm">
                                                        {user && project.creator === user.id ? 'Owner' : 'Collaborator'}
                                                    </div>
                                                </div>

                                                {/* Description Toggle Button - only show if there's a description */}
                                                {project.description && (
                                                    <div className="mt-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleDescription(project.id);
                                                            }}
                                                            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium"
                                                        >
                                                            <Info size={16} />
                                                            {expandedDescription === project.id ? 'Hide Description' : 'Show Description'}
                                                            {expandedDescription === project.id ? (
                                                                <ChevronUp size={16} />
                                                            ) : (
                                                                <ChevronDown size={16} />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Expandable Description */}
                                                {expandedDescription === project.id && project.description && (
                                                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 animate-fade-in">
                                                        <p className="text-sm text-slate-700 whitespace-pre-line">
                                                            {project.description}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="mt-6 flex justify-end">
                                                    <button
                                                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-300 px-4 py-2 rounded-lg"
                                                        onClick={() => navigate(`/project/${project.id}`, { state: { project } })}
                                                    >
                                                        Open Project
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm p-8 text-center">
                                    <FilePlus2 size={48} className="text-slate-300 mb-4" />
                                    <h3 className="text-xl font-medium text-slate-700 mb-2">No projects found</h3>
                                    <p className="text-slate-500 mb-6">
                                        {searchTerm
                                            ? 'Try a different search term or create a new project'
                                            : 'Get started by creating your first project'}
                                    </p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                </main>

                {/* Create Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
                        <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md border border-slate-100">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-xl font-semibold text-slate-800">Create New Project</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 transition-colors"
                                    aria-label="Close modal"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={createProject} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="projectName">
                                        Project Name
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="projectName"
                                            type="text"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            placeholder="Enter project name"
                                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                        />
                                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="language">
                                        Programming Language
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="language"
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-colors"
                                        >
                                            {languages.map((language) => (
                                                <option key={language} value={language}>
                                                    {language}
                                                </option>
                                            ))}
                                        </select>
                                        <Code className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
                                        Description <span className="text-gray-400 text-xs">(optional)</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter project description"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-24 resize-none"
                                    />
                                </div>

                                <div className="pt-2">
                                    <div className="text-xs text-slate-500 mb-4">
                                        Your project will be set up with the standard configuration for {selectedLanguage}.
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setProjectName('');
                                                setDescription('');
                                            }}
                                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                            disabled={!projectName.trim()}
                                        >
                                            Create Project
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Rename Modal */}
                {isRenameModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
                            <h3 className="text-xl font-medium text-slate-800 mb-4">Rename Project</h3>
                            <form onSubmit={renameProject}>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="New project name"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsRenameModalOpen(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Rename
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Modal */}
                {isDeleteModalOpen && projectToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
                            <h3 className="text-xl font-medium text-slate-800 mb-4">Delete Project</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Are you sure you want to delete the project <strong>{projectToDelete.name}</strong>? This action cannot be undone.
                                To confirm, please type the project name below:
                            </p>
                            <input
                                type="text"
                                value={confirmDeleteName}
                                onChange={(e) => setConfirmDeleteName(e.target.value)}
                                placeholder="Project name"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setProjectToDelete(null);
                                        setConfirmDeleteName('');
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={deleteProject}
                                    disabled={confirmDeleteName !== projectToDelete.name || deleteLoading === projectToDelete.id}
                                    className={`px-4 py-2 text-white rounded-lg ${confirmDeleteName === projectToDelete.name && !deleteLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400'}`}
                                >
                                    {deleteLoading === projectToDelete.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
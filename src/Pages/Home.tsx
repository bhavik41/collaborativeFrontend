import React, { useContext, useState, useEffect } from 'react';
// import { UserContext } from '../context/user.context';
import { FilePlus2, User, UserRound } from 'lucide-react';
import axios from '../config/axios'
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../App/store';

interface Project {
    id: string,
    name: string,
    users: string[],
    version?: number
}

const Home = () => {
    // const { user } = useContext(UserContext);

    const { user } = useSelector((state: RootState) => state.auth)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
    const [projectName, setprojectName] = useState<string>('')
    const [project, setProject] = useState<Project[] | null>(null);
    console.log(localStorage.getItem('token'))
    console.log('User Context Value:', user);
    const navigate = useNavigate()


    useEffect(() => {
        axios.get<{ Projects: Project[] }>('/project/all').then((res) => {
            console.log(res.data);
            setProject(res.data.Projects);
        }).catch((error) => {
            console.log(error)
        })
    }, [])

    const createProject = async (e: React.FormEvent) => {
        e.preventDefault(),

            axios.post<{ newProject: Project }>('/project/create', {
                name: projectName,
            }).then((res) => {
                console.log('created project:', res.data);
                setProject((prevProjects) => prevProjects ? [...prevProjects, res.data.newProject] : [res.data.newProject]);
                console.log('pprojects', project)
                setIsModalOpen(false);
            }).catch((error) => {
                console.log(error);
            });
        console.log({ projectName });
    }

    return (
        <main className='p-4'>
            <div className='projects flex flex-wrap gap-3'>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className='project p-4 border border-slate-300 rounded-md flex gap-2'>
                    New Project
                    <FilePlus2 />
                </button>
                {
                    project && project.map((project) => (
                        <div key={project?.id}
                            onClick={() => navigate(`/project/${project?.id}`, {
                                state: { project }
                            })}
                            className='project flex flex-col gap-2 cursor-pointer p-4 border border-slate-300 rounded-md flex gap-2 min-w-52 hover:bg-slate-200'>
                            <h2 className='text-lg'>{project?.name}</h2>
                            <div className="flex gap-2 items-end">
                                <p className="flex gap-1 items-end">
                                    <UserRound size={18} />
                                    <small className="leading-none">Collaborators:</small>
                                </p>
                                <p className="leading-none">{project?.users?.length}</p>
                            </div>

                            {/* <button className='project p-4 border border-slate-300 rounded-md flex gap-
            2'>Edit</button>
            <button className='project p-4 border border-slate-300 rounded-md flex gap-
            2'>Delete</button> */}
                        </div>
                    ))
                }
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
                        <form onSubmit={createProject}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="projectName">
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    id="projectName"
                                    value={projectName}
                                    onChange={(e) => setprojectName(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="bg-gray-500 text-white px-4 py-2 rounded mr-2"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-500 text-white px-4 py-2 rounded"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Home;

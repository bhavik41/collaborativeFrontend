import React from 'react'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import Login from '../Pages/Login'
import Signup from '../Pages/Signup'
import Bhavik from '../Pages/bhavik'
import Home from '../Pages/Home'
import Project from '../Pages/Project'
import UserAuth from '../auth/UserAuth'
import Layout from '../component/Layout'


const AppRoutes = () => {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    {/* <Route path="/home" element={<Home />} /> */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route element={<UserAuth />}>
                        <Route element={<Layout />}>
                            <Route path="/home" element={<Home />} />
                            <Route path="/project/:id" element={<Project />} />
                        </Route>
                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default AppRoutes
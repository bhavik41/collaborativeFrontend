import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
    id: string;
    email: string;
}

export interface UserContextProps {
    user: User | null;
    setUser: (user: User | null) => void;
}

const defaultUserContext: UserContextProps = {
    user: null,
    setUser: () => { }
};

export const UserContext = createContext<UserContextProps>(defaultUserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};


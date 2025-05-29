import { createContext, useContext, useState } from "react";

const MessageContext = createContext();

export function MessageProvider({ children }) {
    const [conversations, setConversations] = useState({}); // {address: [{from, to, message, timestamp}]}

    const sendMessage = (to, message, from) => {
        setConversations((prev) => {
            const conv = prev[to] || [];
            return {
                ...prev,
                [to]: [...conv, { from, to, message, timestamp: Date.now() }],
            };
        });
    };

    return (
        <MessageContext.Provider value={{ conversations, sendMessage }}>
            {children}
        </MessageContext.Provider>
    );
}

export function useMessages() {
    return useContext(MessageContext);
}
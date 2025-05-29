import { useNotification } from "../context/NotificationContext";

export default function NotificationBanner() {
    const { notification } = useNotification();
    if (!notification) return null;

    const color =
        notification.type === "success"
            ? "bg-green-600"
            : notification.type === "error"
                ? "bg-red-600"
                : "bg-indigo-600";

    return (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${color} transition-all`}>
            {notification.message}
        </div>
    );
}
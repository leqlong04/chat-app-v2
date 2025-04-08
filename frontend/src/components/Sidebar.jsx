import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaUserPlus, FaSignOutAlt, FaShareAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers, authUser, logout } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Lọc người dùng theo trạng thái online và từ khóa tìm kiếm
  const filteredUsers = users
    .filter(user => {
      // Lọc theo trạng thái online nếu được chọn
      if (showOnlineOnly && !onlineUsers.includes(user._id)) {
        return false;
      }
      
      // Lọc theo từ khóa tìm kiếm
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        );
      }
      
      return true;
    });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleShare = () => {
    const appUrl = window.location.origin;
    const shareInfo = `Kết nối với tôi trên ứng dụng chat:\nURL: ${appUrl}\nTên tài khoản: ${authUser.fullName}\nEmail: ${authUser.email}`;
    
    navigator.clipboard.writeText(shareInfo)
      .then(() => {
        toast.success('Đã sao chép thông tin kết nối vào clipboard!');
      })
      .catch(() => {
        toast.error('Không thể sao chép thông tin. Vui lòng thử lại.');
      });
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="border-b border-base-300 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Chat App</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-base-300 rounded-lg transition-colors"
              title="Chia sẻ thông tin kết nối"
            >
              <FaShareAlt className="size-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-base-300 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <FaSignOutAlt className="size-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              className="w-full p-2 bg-base-200 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute right-3 top-3 text-base-content opacity-60" />
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-base-300 rounded-lg transition-colors"
            title="Tìm kiếm người dùng"
          >
            <FaUserPlus className="size-4" />
          </button>
        </div>

        {/* Online filter */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Chỉ hiện người dùng online</span>
          </label>
          <span className="text-xs opacity-60">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      {/* User list */}
      <div className="overflow-y-auto flex-1 py-2">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.fullName}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-300" />
              )}
            </div>

            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm opacity-60">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center opacity-60 py-4">
            {showOnlineOnly ? "Không có người dùng online" : "Không tìm thấy người dùng"}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;


import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, ChevronRight, AlertCircle, CheckCircle, Info, Menu } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../constants';
import { searchClients } from '../api/client'; // Import API hook

const Header = ({ clients, onNavigateToClient, toggleSidebar }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const searchRef = useRef(null);
    const notificationRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global search logic (hits backend to search entire database)
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                // limit to 5 results for the quick drop-down
                const res = await searchClients(searchQuery, 1, 5);
                setSearchResults(res.data?.data || []);
            } catch (error) {
                console.error("Global search failed:", error);
                setSearchResults([]);
            }
        }, 400); // 400ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'ALERT': return <AlertCircle className="text-red-500" size={16} />;
            case 'SUCCESS': return <CheckCircle className="text-green-500" size={16} />;
            case 'INFO': return <Info className="text-blue-500" size={16} />;
            default: return <Bell size={16} />;
        }
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between pl-4 pr-16 sm:px-8 sticky top-0 z-50 gap-4">
            <div className="flex items-center gap-2">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Global Search Bar (Desktop) */}
            <div className={`hidden md:block flex-1 max-w-xl transition-all ${isSearchFocused ? 'ring-4 ring-red-50/50' : ''}`} ref={searchRef}>
                <div className={`relative group flex items-center bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 transition-all ${isSearchFocused ? 'bg-white border-red-100' : 'hover:bg-gray-100'}`}>
                    <Search className={`shrink-0 mr-3 transition-colors ${isSearchFocused ? 'text-red-500' : 'text-gray-400'}`} size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        placeholder="Global search firms, contacts or emails..."
                        className="w-full bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="shrink-0 ml-2 text-gray-300 hover:text-gray-500">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Global Search Results Dropdown */}
                {isSearchFocused && searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-gray-50">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Results</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {searchResults.length > 0 ? (
                                searchResults.map(client => (
                                    <button
                                        key={client.id}
                                        onClick={() => {
                                            onNavigateToClient(client);
                                            setIsSearchFocused(false);
                                            setSearchQuery('');
                                        }}
                                        className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                                {client.initial}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors">{client.firmName}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-gray-400">{client.contactName}</p>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <p className="text-[10px] text-gray-300 font-medium uppercase tracking-wider">{client.status}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-red-500 transform group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-400">
                                    <p className="text-sm font-medium">No records matching "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50/50 text-center border-t border-gray-50">
                            <button onClick={() => { setIsSearchFocused(false); onNavigateToClient({ id: 'all' }); }} className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-widest">View Full Directory</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Search Dropdown Container */}
            {isMobileSearchOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-lg md:hidden z-40 animate-in slide-in-from-top-2">
                    <div className="relative group flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 flex-1">
                        <Search className="shrink-0 mr-3 text-red-500" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            autoFocus
                            placeholder="Global search directory..."
                            className="w-full bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="shrink-0 ml-2 text-gray-300 hover:text-gray-500">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Mobile Results Block */}
                    {searchQuery && (
                        <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden border-t-0 rounded-t-none">
                            <div className="max-h-60 overflow-y-auto">
                                {searchResults.length > 0 ? (
                                    searchResults.map(client => (
                                        <button
                                            key={client.id}
                                            onClick={() => {
                                                onNavigateToClient(client);
                                                setIsMobileSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-50 text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0">
                                                    {client.initial}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-bold text-gray-900 truncate">{client.firmName}</h4>
                                                    <p className="text-[10px] text-gray-400 truncate">{client.contactName}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-300 ml-2 shrink-0" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-400">
                                        <p className="text-xs font-medium">No records found</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-2 bg-gray-50 text-center">
                                <button onClick={() => { setIsMobileSearchOpen(false); onNavigateToClient({ id: 'all' }); }} className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-widest">
                                    View Directory
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 sm:gap-6 ml-auto">
                {/* Mobile Search Toggle */}
                <button
                    onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                    className={`md:hidden p-2 rounded-xl transition-all shrink-0 ${isMobileSearchOpen ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    {isMobileSearchOpen ? <X size={20} /> : <Search size={20} />}
                </button>

                {/* Notifications Bell */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`relative p-2 rounded-xl transition-all ${isNotificationsOpen ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {isNotificationsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Liaison Feed</p>
                                </div>
                                <button onClick={markAllRead} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">Mark all as read</button>
                            </div>
                            <div className="max-h-[28rem] overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notif => (
                                        <div key={notif.id} className={`p-5 flex gap-4 transition-colors relative border-b border-gray-50 ${notif.read ? 'opacity-60 hover:opacity-100' : 'bg-red-50/10 hover:bg-red-50/20'}`}>
                                            {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                                {getNotificationIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="text-xs font-bold text-gray-900 truncate">{notif.title}</h4>
                                                    <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap uppercase tracking-widest">{notif.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 leading-relaxed mb-1">{notif.description}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 text-center text-gray-400">
                                        <p className="text-sm font-medium">No recent notifications.</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 text-center border-t border-gray-50">
                                <button className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-colors">
                                    Archive Summary
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
};

export default Header;

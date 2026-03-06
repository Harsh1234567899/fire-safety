import { useEffect, useState, useRef } from 'react';
import { Settings, FlaskConical, FileText, Plus, Trash2, Scale, Settings2, X, Edit2, Loader2 } from 'lucide-react';
import { getGasCategories, getNocTypes, createGasSubCategory, deleteGasSubCategory, createNocType, deleteNocType, updateGasSubCategory, updateNocType } from '../services/category';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/product';
import CustomDropdown from './CustomDropdown.jsx';

const SettingsScreen = () => {
    const [activeTab, setActiveTab] = useState('GAS');
    const [gasItems, setGasItems] = useState([]);
    const [nocItems, setNocItems] = useState([]);
    const [productItems, setProductItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const hasFetched = useRef(false);

    // Initial Fetch - only once
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                getGasCategories(),
                getNocTypes(),
                getAllProducts()
            ]);

            const [gasRes, nocRes, prodRes] = results;

            if (gasRes.status === 'fulfilled') {
                const categories = gasRes.value.data?.data || [];
                const allSubCats = categories.flatMap(cat => cat.subcategories || []);
                setGasItems(allSubCats);
            } else {
                console.error("Failed to fetch gas categories", gasRes.reason);
            }

            if (nocRes.status === 'fulfilled') {
                setNocItems(nocRes.value.data?.data || []);
            } else {
                console.error("Failed to fetch NOC types", nocRes.reason);
            }

            if (prodRes.status === 'fulfilled') {
                setProductItems(prodRes.value.data?.data || []);
            } else {
                console.error("Failed to fetch products", prodRes.reason);
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        } finally {
            setLoading(false);
        }
    };

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        capacity: '',
        unit: 'kg',
        imageFile: null
    });

    const handleDelete = async (id, type) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            if (type === 'GAS') {
                await deleteGasSubCategory(id);
                setGasItems(prev => prev.filter(item => item._id !== id));
            } else if (type === 'NOC') {
                await deleteNocType(id);
                setNocItems(prev => prev.filter(item => item._id !== id));
            } else if (type === 'PRODUCT') {
                await deleteProduct(id);
                setProductItems(prev => prev.filter(item => item._id !== id));
            }
        } catch (e) {
            alert("Failed to delete: " + (e.response?.data?.message || e.message));
        }
    };

    const openModal = (item = null) => {
        if (item && item._id) {
            setEditingId(item._id);
            setFormData({
                name: activeTab === 'GAS' ? (item.originalName || (item.name ? item.name.split('-')[0].toUpperCase() : '')) : (activeTab === 'PRODUCT' ? item.productName : (item.name || item.type)),
                description: item.productDescription || '',
                capacity: item.weight || '',
                unit: item.kgLiter || 'kg',
                imageFile: null
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', description: '', capacity: '', unit: 'kg', imageFile: null }); // Reset
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) return;

        try {
            if (activeTab === 'GAS') {
                const payload = {
                    name: formData.name,
                    weight: formData.capacity,
                    kgLiter: formData.unit,
                    category: "Fire Extinguishers" // Backend expects Name String, not ID
                };

                if (editingId) {
                    const res = await updateGasSubCategory(editingId, payload);
                    if (res.data?.data) {
                        setGasItems(prev => prev.map(i => i._id === editingId ? res.data.data : i));
                    }
                } else {
                    const res = await createGasSubCategory(payload);
                    if (res.data?.data) {
                        setGasItems(prev => [...prev, res.data.data]);
                    }
                }

            } else if (activeTab === 'NOC') {
                const payload = { type: formData.name };
                if (editingId) {
                    const res = await updateNocType(editingId, payload);
                    if (res.data?.data) {
                        setNocItems(prev => prev.map(i => i._id === editingId ? res.data.data : i));
                    }
                } else {
                    const res = await createNocType(payload);
                    if (res.data?.data) {
                        setNocItems(prev => [...prev, res.data.data]);
                    }
                }
            } else if (activeTab === 'PRODUCT') {
                const prodFormData = new FormData();
                prodFormData.append('productName', formData.name);
                prodFormData.append('productDescription', formData.description);
                if (formData.imageFile) {
                    prodFormData.append('image', formData.imageFile);
                }

                if (editingId) {
                    const res = await updateProduct(editingId, prodFormData);
                    if (res.data?.data) {
                        setProductItems(prev => prev.map(i => i._id === editingId ? res.data.data : i));
                    }
                } else {
                    const res = await createProduct(prodFormData);
                    if (res.data?.data) {
                        setProductItems(prev => [...prev, res.data.data]);
                    }
                }
            }

            setIsModalOpen(false);
            setEditingId(null);
        } catch (e) {
            console.error("Create failed", e);
            alert("Failed to create: " + (e.response?.data?.message || e.message));
        }
    };

    const renderList = (items, type) => (
        <div className="space-y-4">
            {items.map((item) => (
                <div key={item._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors group gap-4">
                    <div className="flex items-center gap-4 sm:gap-6 w-full">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex shrink-0 flex-none items-center justify-center ${type === 'GAS' ? 'bg-slate-100 text-slate-500' : type === 'PRODUCT' ? 'bg-green-50 text-green-500 overflow-hidden' : 'bg-blue-50 text-blue-500'}`}>
                            {type === 'GAS' ? <Scale size={24} /> : type === 'PRODUCT' ? (
                                item.productImages?.url ? <img src={item.productImages.url} alt={item.productName} className="w-full h-full object-cover" /> : <Settings2 size={24} />
                            ) : <FileText size={24} />}
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-gray-900">{type === 'GAS' ? (item.originalName || (item.name ? item.name.split('-')[0].toUpperCase() : '')) : type === 'PRODUCT' ? item.productName : (item.name || item.type)}</h4>
                            {type === 'GAS' && item.weight && (
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{item.weight} {item.kgLiter || 'kg'}</p>
                            )}
                            {type === 'PRODUCT' && item.productDescription && (
                                <p className="text-xs text-gray-400 mt-0.5">{item.productDescription}</p>
                            )}
                            {(type !== 'PRODUCT' && item.description) && (
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{item.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-auto shrink-0 flex-none">
                        <button
                            onClick={() => openModal(item)}
                            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={() => handleDelete(item._id, type)}
                            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}

            {items.length === 0 && (
                <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p>No items configured.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col relative">
            {/* Header Section */}
            <div className="mb-10 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <Settings2 size={14} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Control Panel</span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">System Settings</h1>
                        <p className="text-gray-500">Global operational configuration and compliance rules.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-8 flex-1 min-h-0">
                {/* Left Tabs Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('GAS')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${activeTab === 'GAS'
                            ? 'bg-white shadow-md text-red-500 font-bold border border-red-50'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 font-medium'
                            }`}
                    >
                        <FlaskConical size={20} className={activeTab === 'GAS' ? 'text-red-500' : 'text-gray-400'} />
                        Gas Catalog
                    </button>

                    <button
                        onClick={() => setActiveTab('NOC')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${activeTab === 'NOC'
                            ? 'bg-white shadow-md text-red-500 font-bold border border-red-50'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 font-medium'
                            }`}
                    >
                        <FileText size={20} className={activeTab === 'NOC' ? 'text-red-500' : 'text-gray-400'} />
                        NOC Types
                    </button>

                    <button
                        onClick={() => setActiveTab('PRODUCT')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${activeTab === 'PRODUCT'
                            ? 'bg-white shadow-md text-red-500 font-bold border border-red-50'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 font-medium'
                            }`}
                    >
                        <Settings2 size={20} className={activeTab === 'PRODUCT' ? 'text-red-500' : 'text-gray-400'} />
                        Products
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm p-4 md:p-10 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6 md:mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {activeTab === 'GAS' ? 'Gas Cylinder Types' : activeTab === 'PRODUCT' ? 'Sellable Products' : 'Fire NOC Categories'}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {activeTab === 'GAS' ? 'Inventory Unit Templates' : activeTab === 'PRODUCT' ? 'General Merchandise' : 'Compliance Label Templates'}
                            </p>
                        </div>

                        <button
                            onClick={() => openModal(null)}
                            className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/20 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 size={32} className="animate-spin text-red-500" />
                        </div>
                    ) : (
                        activeTab === 'GAS' ? renderList(gasItems, 'GAS') : activeTab === 'PRODUCT' ? renderList(productItems, 'PRODUCT') : renderList(nocItems, 'NOC')
                    )}
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {activeTab === 'GAS' ? (editingId ? 'Edit Gas Category' : 'New Gas Category') : activeTab === 'PRODUCT' ? (editingId ? 'Edit Product' : 'New Product') : (editingId ? 'Edit NOC Category' : 'New NOC Category')}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Form Content */}
                            {activeTab === 'GAS' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Gas Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                                            placeholder="e.g. CO2, ABC Powder"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Capacity</label>
                                            <input
                                                type="text"
                                                value={formData.capacity}
                                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                                className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                                                placeholder="4.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Unit</label>
                                            <CustomDropdown
                                                value={formData.unit}
                                                onChange={(val) => setFormData({ ...formData, unit: val })}
                                                options={[{ value: 'kg', label: 'KG' }, { value: 'liter', label: 'LTR' }]}
                                                className="w-full text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : activeTab === 'PRODUCT' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Product Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                                            placeholder="e.g. Fire Blanket"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all resize-none h-24"
                                            placeholder="Describe the product..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Product Image {editingId && '(Optional to replace)'}</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setFormData({ ...formData, imageFile: e.target.files[0] })}
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 rounded-xl px-4 py-2 text-sm font-medium outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">NOC Type Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-200 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                                        placeholder="e.g. Industrial Final NOC"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-95 mt-4"
                            >
                                {editingId ? 'UPDATE CATEGORY' : 'SAVE CATEGORY'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;

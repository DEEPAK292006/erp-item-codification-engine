import { useState, useEffect, FormEvent } from 'react';
import {
  Layers,
  Settings,
  Database,
  Search,
  FileText,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ArrowRightLeft,
  Copy,
  ChevronRight,
  Filter,
  Check,
  User,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { SlabRange, ERPItem } from './types';
import { MFG_Z_GROUPS, MFG_Z_TYPES, MFG_R_GROUPS, MFG_R_TYPES, MFG_SUPPORT_TYPES, TRD_GROUPS, TRD_TYPES, FA_TYPES } from './lib/initialData';

function formatSequence(num: number, category: string): string {
  if (category === 'FA') {
    return num.toString();
  }
  return num.toString().padStart(4, '0');
}

function formatPreviewCodeWithSpacers(code: string): React.ReactNode {
  if (!code) return '';
  const parts = code.split('-');
  return parts.map((part, index) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 && <span className="text-indigo-600 font-extrabold mx-1 shrink-0">-</span>}
    </span>
  ));
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'codification' | 'master' | 'admin' | 'docs'>('codification');

  // DB States
  const [slabs, setSlabs] = useState<SlabRange[]>([]);
  const [items, setItems] = useState<ERPItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // UTC Live Clock (ERP standard)
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString());

  // Form States for code creation
  const [category, setCategory] = useState<'MFG-Z' | 'MFG-R' | 'MFG-SUPPORT' | 'TRD' | 'FA'>('MFG-Z');
  const [selectedGroup, setSelectedGroup] = useState<string>('FA');
  const [selectedType, setSelectedType] = useState<string>('Z');
  const [itemName, setItemName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Search/Filters for Item Master (CFG0200)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [conversionFilter, setConversionFilter] = useState<string>('All');

  // Admin Edit Slab States
  const [editingSlab, setEditingSlab] = useState<SlabRange | null>(null);
  const [adminStartNum, setAdminStartNum] = useState<number>(0);
  const [adminEndNum, setAdminEndNum] = useState<number>(9999);
  const [adminCurrentNum, setAdminCurrentNum] = useState<number>(0);
  const [adminStatus, setAdminStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isAdminUpdating, setIsAdminUpdating] = useState<boolean>(false);
  const [adminSearch, setAdminStatusFilter] = useState<string>('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('All');

  // Item Master Edit States
  const [editingItemCode, setEditingItemCode] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');
  const [isUpdatingItem, setIsUpdatingItem] = useState<boolean>(false);

  // Clipboard feedbacks
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sync Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Slabs and Items from Express API
  const fetchData = async () => {
    setLoading(true);
    try {
      const [slabsRes, itemsRes] = await Promise.all([
        fetch('/api/slabs'),
        fetch('/api/items')
      ]);

      if (!slabsRes.ok || !itemsRes.ok) {
        throw new Error('Failed to load system data from the server.');
      }

      const slabsData: SlabRange[] = await slabsRes.json();
      const itemsData: ERPItem[] = await itemsRes.json();

      setSlabs(slabsData);
      setItems(itemsData);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Server connection error. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset inputs when category changes
  useEffect(() => {
    if (category === 'MFG-Z') {
      setSelectedGroup('FA');
      setSelectedType('Z');
    } else if (category === 'MFG-R') {
      setSelectedGroup('RC');
      setSelectedType('R');
    } else if (category === 'MFG-SUPPORT') {
      setSelectedGroup('SUP');
      setSelectedType('H');
    } else if (category === 'TRD') {
      setSelectedGroup('ACP');
      setSelectedType('T');
    } else if (category === 'FA') {
      setSelectedGroup('FA');
      setSelectedType('BLD');
    }
  }, [category]);

  // Handle Generate Item Code
  const handleGenerateCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      showError('Please enter a descriptive Item Name.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          groupCode: selectedGroup,
          typeCode: selectedType,
          name: itemName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate code.');
      }

      // Success
      setSuccess(`Success! Item "${result.item.name}" has been codified under code ${result.item.code}.`);
      setItemName('');
      // Reload slabs & items
      await fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert assigned item code (Spare / Optional Accessory conversion rules)
  const handleConvertCode = async (code: string, targetType: 'Spare' | 'OptionalAccessory') => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/items/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, targetType })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to convert code.');
      }

      setSuccess(`Codification conversion applied! Item code updated to ${result.item.code}.`);
      await fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Revert code conversion (Restore original code and clear prefix R/O)
  const handleRevertConversion = async (code: string) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/items/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to revert conversion.');
      }

      setSuccess(`Codification conversion reverted! Item code restored to ${result.item.code}.`);
      await fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Update item details (e.g., descriptive name)
  const handleUpdateItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItemCode || !editingItemName.trim()) return;

    setIsUpdatingItem(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/items/${editingItemCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingItemName })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update item details.');
      }

      setSuccess(`Item details for "${result.item.code}" updated successfully.`);
      setEditingItemCode(null);
      await fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsUpdatingItem(false);
    }
  };

  // Handle Admin Slab Update
  const handleUpdateSlab = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSlab) return;

    setIsAdminUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/slabs/${editingSlab.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startNum: adminStartNum,
          endNum: adminEndNum,
          currentNum: adminCurrentNum,
          status: adminStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update slab range.');
      }

      setSuccess(`Administrative range limits for "${editingSlab.id}" updated successfully.`);
      setEditingSlab(null);
      await fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsAdminUpdating(false);
    }
  };

  // Reset System State (demo utility)
  const handleResetSystem = async () => {
    if (!window.confirm('WARNING: This will reset all codified items in Screen CFG0200 and restore standard default slab ranges. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setSuccess('All item registries and code slab ranges have been reset to factory defaults.');
      setSlabs(result.slabs);
      setItems(result.items);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Utility to copy to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper alerts
  const showError = (msg: string) => {
    setError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Range Math
  const getSlabStats = (slab: SlabRange) => {
    const totalCapacity = slab.endNum - slab.startNum + 1;
    const itemsAssigned = slab.currentNum - slab.startNum;
    const saturationRate = Math.min(100, Math.max(0, (itemsAssigned / totalCapacity) * 100));
    return {
      totalCapacity,
      itemsAssigned,
      saturationRate: Math.round(saturationRate * 10) / 10,
      remaining: Math.max(0, slab.endNum - slab.currentNum + 1)
    };
  };

  // Filter items in Item Master
  const filteredItems = items.filter((item) => {
    const matchQuery =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.groupName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory = categoryFilter === 'All' || item.category === categoryFilter;

    const matchConversion =
      conversionFilter === 'All' ||
      (conversionFilter === 'Spare' && item.conversion === 'Spare') ||
      (conversionFilter === 'OptionalAccessory' && item.conversion === 'OptionalAccessory') ||
      (conversionFilter === 'None' && !item.conversion);

    return matchQuery && matchCategory && matchConversion;
  });

  // Filter slabs in Admin View
  const filteredSlabs = slabs.filter((slab) => {
    const matchQuery =
      slab.id.toLowerCase().includes(adminSearch.toLowerCase()) ||
      slab.groupName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      slab.typeName.toLowerCase().includes(adminSearch.toLowerCase());

    const matchCategory = adminCategoryFilter === 'All' || slab.category === adminCategoryFilter;

    return matchQuery && matchCategory;
  });

  // Slabs nearing saturation
  const saturatedSlabs = slabs.filter((s) => {
    const { saturationRate } = getSlabStats(s);
    return saturationRate >= 80;
  });

  // Calculate generic code preview based on current form
  const getCodePreview = () => {
    const currentSlab = slabs.find(
      (s) => {
        if (category === 'MFG-Z') return s.category === 'MFG-Z' && s.groupCode === selectedGroup && s.typeCode === selectedType;
        if (category === 'MFG-R') return s.category === 'MFG-R' && s.groupCode === selectedGroup && s.typeCode === selectedType;
        if (category === 'MFG-SUPPORT') return s.category === 'MFG-SUPPORT' && s.typeCode === selectedType;
        if (category === 'TRD') return s.category === 'TRD' && s.groupCode === selectedGroup && s.typeCode === selectedType;
        if (category === 'FA') return s.category === 'FA' && s.typeCode === selectedType;
        return false;
      }
    );

    if (!currentSlab) return 'No Slab Configured';
    const nextSeq = formatSequence(currentSlab.currentNum, category);

    if (category === 'MFG-Z') return `Z-${selectedGroup}-${selectedType}-${nextSeq}`;
    if (category === 'MFG-R') return `R-${selectedGroup}-${selectedType}-${nextSeq}`;
    if (category === 'MFG-SUPPORT') return `SUP-${selectedType}-${nextSeq}`;
    if (category === 'TRD') return `TRD-${selectedGroup}-${selectedType}-${nextSeq}`;
    if (category === 'FA') return `FA-${selectedType}-${nextSeq}`;
    return '...';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden antialiased selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. Header (Premium Sleek Design) */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
              ERP Item Codification Engine
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded font-mono font-bold">CFG0200</span>
            </h1>
            <p className="text-[9px] sm:text-xs text-slate-400 font-medium tracking-wide">
              SYSTEM MODULE: AUTOMATED SEQUENTIAL MATRIX REGISTRY
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold rounded-full border border-emerald-100 items-center gap-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            DB SYNC: ACTIVE
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
          
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">Arch. Admin</span>
              <span className="text-[10px] text-slate-400 font-mono">292006deepak@gmail.com</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-inner">
              AA
            </div>
          </div>
        </div>
      </header>

      {/* 2. Notifications & Saturated Slab Alerters */}
      <div className="max-w-7xl mx-auto w-full px-6 mt-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl shadow-sm text-xs sm:text-sm text-rose-800 flex items-start gap-3 animate-fade-in mb-4">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-900">System Exception Encountered</span>
              <p className="text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm text-xs sm:text-sm text-emerald-800 flex items-start gap-3 animate-fade-in mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-emerald-950">Operation Completed Successfully</span>
              <p className="text-emerald-700 mt-0.5">{success}</p>
            </div>
          </div>
        )}

        {saturatedSlabs.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm text-xs sm:text-sm text-amber-900 flex items-start gap-3 mb-4 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-amber-950">Administrative Warning: Range Slabs Approaching Saturation!</span>
              <p className="text-xs text-amber-800 mt-0.5">
                {saturatedSlabs.length} code slab range(s) have reached over 80% saturation. Please review the{' '}
                <button
                  onClick={() => setActiveTab('admin')}
                  className="font-bold underline text-amber-900 hover:text-indigo-700 transition"
                >
                  Admin Slab Manager
                </button>{' '}
                to increment slab boundaries or allocate additional space blocks.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Dashboard Body Grid */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 pb-12 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar (Sleek Sidebar Design) */}
        <aside className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Primary Module Views</h2>
            
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('codification')}
                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'codification'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="h-4.5 w-4.5" />
                  <span>Codification Console</span>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${activeTab === 'codification' ? 'rotate-90' : ''}`} />
              </button>

              <button
                onClick={() => setActiveTab('master')}
                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'master'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="h-4.5 w-4.5" />
                  <span>Item Master (CFG0200)</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  activeTab === 'master' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {items.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className="h-4.5 w-4.5" />
                  <span>Admin Slab Manager</span>
                </div>
                {saturatedSlabs.length > 0 && (
                  <span className="animate-pulse bg-rose-500 text-white h-2 w-2 rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('docs')}
                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'docs'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4.5 w-4.5" />
                  <span>Matrix & API Docs</span>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${activeTab === 'docs' ? 'rotate-90' : ''}`} />
              </button>
            </nav>
          </div>

          {/* Quick Metrics (Visual Bento-Style block) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Slab Range Metrics</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Total Slabs</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5 font-mono">{slabs.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active Items</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5 font-mono">
                  {items.filter((i) => i.status === 'Active').length}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex justify-between">
                <span>Critical Saturated Ranges</span>
                <span className="text-rose-600 font-mono font-bold">{slabs.filter((s) => s.currentNum > s.endNum).length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      slabs.length > 0
                        ? (slabs.filter((s) => s.currentNum > s.endNum).length / slabs.length) * 100
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleResetSystem}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset ERP Database</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Dynamic Viewports (lg:col-span-3) */}
        <section className="lg:col-span-3 flex flex-col gap-6">

          {/* 1. CODIFICATION CONSOLE VIEW (Bento Styled Layout matching mockup) */}
          {activeTab === 'codification' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              
              {/* Left Column: Selector Parameters Card */}
              <div className="xl:col-span-2 flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                  
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <PlusCircle className="text-indigo-600 h-4.5 w-4.5" />
                      Generator Parameters
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">Select item parameters to compute systemic sequences</p>
                  </div>

                  <form onSubmit={handleGenerateCode} className="space-y-5">
                    
                    {/* Primary Category Dropdown style */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Primary Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="MFG-Z">Manufacturing Product (MFG-Z)</option>
                        <option value="MFG-R">Manufacturing Project (MFG-R)</option>
                        <option value="MFG-SUPPORT">Product Support (SUP)</option>
                        <option value="TRD">Trading Product (TRD)</option>
                        <option value="FA">Fixed Asset (FA)</option>
                      </select>
                    </div>

                    {/* Dynamic Selectors depending on category choice */}
                    {category === 'MFG-Z' && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Product Group
                          </label>
                          <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            {MFG_Z_GROUPS.map((g) => (
                              <option key={g.code} value={g.code}>
                                {g.name} ({g.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Code Type
                          </label>
                          <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            {MFG_Z_TYPES.map((t) => (
                              <option key={t.code} value={t.code}>
                                {t.name} ({t.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {category === 'MFG-R' && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Project Group
                          </label>
                          <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            {MFG_R_GROUPS.map((g) => (
                              <option key={g.code} value={g.code}>
                                {g.name} ({g.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Suffix Type
                          </label>
                          <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            {MFG_R_TYPES.map((t) => (
                              <option key={t.code} value={t.code}>
                                {t.name} (Suffix: {t.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {category === 'MFG-SUPPORT' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Support Code Type
                        </label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          {MFG_SUPPORT_TYPES.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.name} ({t.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {category === 'TRD' && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Trading Group
                          </label>
                          <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            {TRD_GROUPS.map((g) => (
                              <option key={g.code} value={g.code}>
                                {g.name} ({g.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Trading Code Type
                          </label>
                          <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            {TRD_TYPES.map((t) => (
                              <option key={t.code} value={t.code}>
                                {t.name} ({t.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {category === 'FA' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Asset Slabs Blocks
                        </label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          {FA_TYPES.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.name} ({t.code}) [{t.start} - {t.end}]
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Descriptive Item Name Input */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Item Name
                      </label>
                      <input
                        type="text"
                        required
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g. Heavy Duty 3D Aligner v2"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? 'Codifying...' : 'GENERATE SYSTEM CODE'}
                    </button>

                  </form>
                </div>
                
                {/* Prefix Conversion Reference */}
                <div className="bg-slate-900 rounded-2xl p-5 shadow-xl text-white space-y-4">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prefix Conversion</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center font-bold font-mono">R</div>
                        <div>
                          <p className="text-xs text-white font-bold">Spares Conversion</p>
                          <p className="text-[10px] text-slate-400">Pre-fix "R-" to registered code</p>
                        </div>
                      </div>
                      <div className="w-10 h-5 bg-slate-800 rounded-full border border-slate-700 flex items-center px-1">
                        <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center font-bold font-mono">O</div>
                        <div>
                          <p className="text-xs text-white font-bold">Accessory Conv.</p>
                          <p className="text-[10px] text-slate-400">Pre-fix "O-" to registered code</p>
                        </div>
                      </div>
                      <div className="w-10 h-5 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-end px-1">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Preview & Saturation Monitor */}
              <div className="xl:col-span-3 flex flex-col gap-6">
                
                {/* Big System Code Preview */}
                <div className="h-48 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-white to-slate-50 p-6 text-center">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded border border-indigo-100 shadow-sm">NEXT SEQUENTIAL</span>
                  </div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Allocated System Code</div>
                  
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black text-slate-950 tracking-tighter flex items-center justify-center flex-wrap gap-x-1 font-mono">
                    {formatPreviewCodeWithSpacers(getCodePreview())}
                  </div>

                  <div className="mt-4 flex gap-4 text-xs font-semibold text-slate-500 justify-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 
                      <span>Ready for Item Master</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div> 
                      <span>Active Range</span>
                    </div>
                  </div>
                </div>

                {/* Grid container with Monitor and Definitions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Saturation Monitor Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-sm font-bold text-slate-900">Slab Saturation Monitor</h3>
                      <button onClick={() => setActiveTab('admin')} className="text-xs font-bold text-indigo-600 hover:underline">VIEW ALL</button>
                    </div>

                    <div className="space-y-4 flex-1">
                      {slabs.length === 0 ? (
                        <div className="text-xs text-slate-400 text-center py-6">No slabs configured</div>
                      ) : (
                        slabs.slice(0, 3).map((slab) => {
                          const stats = getSlabStats(slab);
                          return (
                            <div key={slab.id} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-700 truncate max-w-[150px]">{slab.id}</span>
                                <span className="text-slate-900 font-bold font-mono">{stats.saturationRate}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    stats.saturationRate >= 90
                                      ? 'bg-rose-500 animate-pulse'
                                      : stats.saturationRate >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                                  }`}
                                  style={{ width: `${stats.saturationRate}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Range: {slab.startNum} - {slab.endNum} | {stats.remaining} remaining
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Definitions table reference card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Matrix Definitions Reference
                    </h3>
                    <div className="flex-1 overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50">
                          <tr className="text-[9px] uppercase font-bold text-slate-400">
                            <th className="px-3 py-2 border-b border-slate-100">Category</th>
                            <th className="px-3 py-2 border-b border-slate-100">Slab Format</th>
                            <th className="px-3 py-2 border-b border-slate-100 text-right">State</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-slate-700">
                          <tr className="border-b border-slate-50">
                            <td className="px-3 py-2">MFG-Z</td>
                            <td className="px-3 py-2 font-mono text-indigo-600">Z-[Group]-[Type]-[Seq]</td>
                            <td className="px-3 py-2 text-right text-emerald-600">Active</td>
                          </tr>
                          <tr className="border-b border-slate-50">
                            <td className="px-3 py-2">MFG-R</td>
                            <td className="px-3 py-2 font-mono text-purple-600">R-[Proj]-[Type]-[Seq]</td>
                            <td className="px-3 py-2 text-right text-emerald-600">Active</td>
                          </tr>
                          <tr className="border-b border-slate-50">
                            <td className="px-3 py-2">TRD</td>
                            <td className="px-3 py-2 font-mono text-teal-600">TRD-[Group]-[Type]-[Seq]</td>
                            <td className="px-3 py-2 text-right text-emerald-600">Active</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2">FA</td>
                            <td className="px-3 py-2 font-mono text-slate-600">FA-[AssetType]-[Seq]</td>
                            <td className="px-3 py-2 text-right text-indigo-600">Block</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* 2. ITEM MASTER VIEW (CFG0200) */}
          {activeTab === 'master' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              
              {/* Card Header & Search Section */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Database className="text-indigo-600 h-5 w-5" /> Item Master Registry (CFG0200)
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Standard registered inventory item master indices</p>
                </div>
              </div>

              {/* Filters Panel */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="relative col-span-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by code, item name, or shortgroup..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All">All Categories</option>
                    <option value="MFG-Z">MFG-Z Product</option>
                    <option value="MFG-R">MFG-R Project</option>
                    <option value="MFG-SUPPORT">MFG Support</option>
                    <option value="TRD">Trading Product (TRD)</option>
                    <option value="FA">Fixed Asset (FA)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={conversionFilter}
                    onChange={(e) => setConversionFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All">All Item States</option>
                    <option value="None">Original Assignment</option>
                    <option value="Spare">Converted Spares (R-)</option>
                    <option value="OptionalAccessory">Converted Optional (O-)</option>
                  </select>
                </div>
              </div>

              {/* Table List View */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 text-center text-slate-400 text-sm font-medium">Loading live Master ledger...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
                    <Info className="h-8 w-8 text-slate-300" />
                    <span className="font-semibold text-slate-500">No codified items registered matching query.</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                        <th className="py-3.5 px-4 font-bold">Codified Code</th>
                        <th className="py-3.5 px-4 font-bold">Descriptive Name</th>
                        <th className="py-3.5 px-4 font-bold">Category</th>
                        <th className="py-3.5 px-4 font-bold">Matrix Group / Type</th>
                        <th className="py-3.5 px-4 font-bold">Status</th>
                        <th className="py-3.5 px-4 text-right font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredItems.map((item) => (
                        <tr key={item.code} className="hover:bg-slate-50/50 transition duration-150">
                          
                          {/* Code + clipboard action */}
                          <td className="py-4 px-4 font-mono font-bold tracking-wider text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-950 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs select-all">
                                {item.code}
                              </span>
                              <button
                                onClick={() => handleCopyToClipboard(item.code)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Copy code"
                              >
                                {copiedCode === item.code ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            {item.originalCode && (
                              <span className="text-[9px] text-slate-400 block mt-1 font-mono font-medium">
                                Original: {item.originalCode}
                              </span>
                            )}
                          </td>

                          {/* Descriptive Name */}
                          <td className="py-4 px-4 text-slate-900 max-w-xs">
                            {editingItemCode === item.code ? (
                              <form onSubmit={handleUpdateItem} className="flex items-center gap-1.5 w-full">
                                <input
                                  type="text"
                                  required
                                  value={editingItemName}
                                  onChange={(e) => setEditingItemName(e.target.value)}
                                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={isUpdatingItem}
                                  className="px-2.5 py-1 text-[10px] font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 cursor-pointer"
                                >
                                  {isUpdatingItem ? 'Saving' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemCode(null)}
                                  className="px-2.5 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <div className="flex items-center justify-between group/name">
                                <span className="font-semibold truncate block max-w-[220px]" title={item.name}>
                                  {item.name}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingItemCode(item.code);
                                    setEditingItemName(item.name);
                                  }}
                                  className="opacity-0 group-hover/name:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                  title="Edit item name"
                                >
                                  <Sliders className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="py-4 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              item.category === 'MFG-Z' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              item.category === 'MFG-R' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              item.category === 'MFG-SUPPORT' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                              item.category === 'TRD' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {item.category}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="py-4 px-4 text-slate-500">
                            <div className="text-xs font-bold text-slate-800">{item.groupName}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{item.typeName} ({item.typeCode})</div>
                          </td>

                          {/* State */}
                          <td className="py-4 px-4">
                            {item.conversion ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                item.conversion === 'Spare' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${item.conversion === 'Spare' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                {item.conversion === 'Spare' ? 'Spare (R Prefix)' : 'Accessory (O Prefix)'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                Original Code
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.conversion ? (
                                <button
                                  onClick={() => handleRevertConversion(item.code)}
                                  className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                  title="Revert character prefix and restore original code"
                                >
                                  Revert Original
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleConvertCode(item.code, 'Spare')}
                                    className="px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 hover:border-rose-600 rounded-lg transition-all cursor-pointer"
                                    title="Pre-fix character R to code"
                                  >
                                    Spare (R-)
                                  </button>
                                  <button
                                    onClick={() => handleConvertCode(item.code, 'OptionalAccessory')}
                                    className="px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-100 hover:border-amber-600 rounded-lg transition-all cursor-pointer"
                                    title="Pre-fix character O to code"
                                  >
                                    Accessory (O-)
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 3. ADMIN SLAB MANAGER VIEW */}
          {activeTab === 'admin' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              
              {/* Card Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Sliders className="text-indigo-600 h-5 w-5" /> Slabs & Sequences Administrator
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Re-provision boundaries, limits, and toggle state availability</p>
                </div>
              </div>

              {/* Filters */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminStatusFilter(e.target.value)}
                    placeholder="Filter by slab ID, Group name..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <select
                    value={adminCategoryFilter}
                    onChange={(e) => setAdminCategoryFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All">All Categories</option>
                    <option value="MFG-Z">MFG-Z Product Slabs</option>
                    <option value="MFG-R">MFG-R Project Slabs</option>
                    <option value="MFG-SUPPORT">MFG Support Slabs</option>
                    <option value="TRD">Trading Slabs</option>
                    <option value="FA">Fixed Asset Blocks</option>
                  </select>
                </div>
                <div className="text-xs text-slate-400 font-semibold text-right flex items-center justify-end font-mono">
                  Showing {filteredSlabs.length} / {slabs.length} Total
                </div>
              </div>

              {/* Edit range modal/form overlay */}
              {editingSlab && (
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Settings className="h-4.5 w-4.5 text-indigo-600" />
                      Configure Range Limits: <span className="font-mono text-indigo-700">{editingSlab.id}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingSlab(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-800 transition"
                    >
                      Cancel Edit
                    </button>
                  </div>

                  <form onSubmit={handleUpdateSlab} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Start Limit</label>
                      <input
                        type="number"
                        required
                        value={adminStartNum}
                        onChange={(e) => setAdminStartNum(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">End Limit (Capacity)</label>
                      <input
                        type="number"
                        required
                        value={adminEndNum}
                        onChange={(e) => setAdminEndNum(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Next Sequence</label>
                      <input
                        type="number"
                        required
                        value={adminCurrentNum}
                        onChange={(e) => setAdminCurrentNum(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        title="Manual override for next generated sequence number"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Slab Status</label>
                      <select
                        value={adminStatus}
                        onChange={(e) => setAdminStatus(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="Active">Active (In Use)</option>
                        <option value="Inactive">Inactive (Offline)</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isAdminUpdating}
                        className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-md shadow-indigo-100 cursor-pointer"
                      >
                        {isAdminUpdating ? 'Saving...' : 'Save Config'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Slabs list */}
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-12 text-center text-slate-400 text-sm font-medium">Loading slabs matrix...</div>
                ) : filteredSlabs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm font-medium">No system ranges match current filters.</div>
                ) : (
                  filteredSlabs.map((slab) => {
                    const stats = getSlabStats(slab);
                    const isSaturated = slab.currentNum > slab.endNum;

                    return (
                      <div key={slab.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition duration-150">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{slab.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              slab.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {slab.status}
                            </span>
                            {isSaturated && (
                              <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                Saturated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Group: <span className="font-bold text-slate-700">{slab.groupName} ({slab.groupCode})</span> | 
                            Type: <span className="font-bold text-slate-700">{slab.typeName} ({slab.typeCode})</span>
                          </p>
                          <div className="text-[10px] text-slate-400 font-mono font-semibold">
                            Boundary Limit: <span className="text-slate-600 font-bold">{slab.startNum}</span> to <span className="text-slate-600 font-bold">{slab.endNum}</span> | 
                            Next Sequence Counter: <span className="text-indigo-600 font-black">{slab.currentNum}</span>
                          </div>
                        </div>

                        {/* Progress Meter bar */}
                        <div className="flex items-center gap-4 w-full sm:w-64 shrink-0">
                          <div className="flex-1 space-y-1.5 text-right">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-400 uppercase">Saturation Rate</span>
                              <span className={stats.saturationRate >= 90 ? 'text-rose-600' : stats.saturationRate >= 70 ? 'text-amber-600' : 'text-slate-600 font-mono'}>
                                {stats.saturationRate}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  stats.saturationRate >= 90 ? 'bg-rose-500' : stats.saturationRate >= 70 ? 'bg-amber-500' : 'bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                                }`}
                                style={{ width: `${stats.saturationRate}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-slate-400 font-semibold">
                              {stats.itemsAssigned} / {stats.totalCapacity} Assigned sequential indices
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setEditingSlab(slab);
                              setAdminStartNum(slab.startNum);
                              setAdminEndNum(slab.endNum);
                              setAdminCurrentNum(slab.currentNum);
                              setAdminStatus(slab.status);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shrink-0"
                            title="Edit boundaries"
                          >
                            <Settings className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 4. MATRIX & API DOCUMENTATION VIEW */}
          {activeTab === 'docs' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="text-indigo-600 h-5 w-5" /> ERP Item Codification API Specifications
                </h2>
                <p className="text-xs text-slate-400 font-medium">Developer resources, prefix modification structures, and endpoints schema</p>
              </div>

              <div className="p-6 space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[600px] overflow-y-auto">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">1. Global Prefix Conversion Rules</h3>
                  <p className="text-xs text-slate-400 font-medium mb-3">
                    Converts already assigned codes into specific spares or optional accessory classifications:
                  </p>
                  <table className="min-w-full text-xs text-left border border-slate-200 mb-4 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50 font-bold border-b border-slate-200">
                        <th className="p-3">Conversion Type</th>
                        <th className="p-3">Prefix</th>
                        <th className="p-3">Rule Statement</th>
                        <th className="p-3">Example Output Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      <tr>
                        <td className="p-3 font-bold">Spares Conversion</td>
                        <td className="p-3"><span className="bg-rose-50 text-rose-700 font-bold border border-rose-100 px-1.5 py-0.5 rounded">R-</span></td>
                        <td className="p-3">Pre-fix character R- to already registered code</td>
                        <td className="p-3 font-mono text-rose-600 font-bold">R-Z-WA-Z-0001</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">Optional Accessory</td>
                        <td className="p-3"><span className="bg-amber-50 text-amber-700 font-bold border border-amber-100 px-1.5 py-0.5 rounded">O-</span></td>
                        <td className="p-3">Pre-fix character O- to already registered code</td>
                        <td className="p-3 font-mono text-amber-600 font-bold">O-Z-WA-Z-0001</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">2. Data Matrices (Slabs Mapping)</h3>
                  <ul className="space-y-3.5 text-xs text-slate-500 font-medium">
                    <li>
                      <strong className="text-slate-800 block mb-0.5">Matrix A: Manufacturing Product Codes (MFG-Z)</strong>
                      Calculates sequential digit starting from range 1. Pre-pends 'Z' to denote final item. Format: <code className="font-mono bg-slate-50 border border-slate-200 p-1 rounded text-indigo-600">Z-[Group]-[TypeCode]-[Seq]</code>.
                    </li>
                    <li>
                      <strong className="text-slate-800 block mb-0.5">Matrix B: Manufacturing Project Codes (MFG-R)</strong>
                      Formulates design projects using code suffixes for project groups: M, Y, P, B, E, F, MX, X, MA, A, RO, R. Format: <code className="font-mono bg-slate-50 border border-slate-200 p-1 rounded text-indigo-600">R-[ProjGroup]-[TypeCode]-[Seq]</code>.
                    </li>
                    <li>
                      <strong className="text-slate-800 block mb-0.5">Matrix C: Manufacturing Product Support Codes</strong>
                      Pre-populates support ranges: Consumables (H: 0001+), Consumable Tools (HT: 0001+), Design Electronics (DE: 0330+), Machinery Spares SP (0001+).
                    </li>
                    <li>
                      <strong className="text-slate-800 block mb-0.5">Matrix D: Trading Product Codes (TRD)</strong>
                      Maps trading groups matching standard wholesale modules. Format: <code className="font-mono bg-slate-50 border border-slate-200 p-1 rounded text-indigo-600">TRD-[Group]-[TypeCode]-[Seq]</code>.
                    </li>
                    <li>
                      <strong className="text-slate-800 block mb-0.5">Matrix E: Fixed Asset Blocks (FA)</strong>
                      Strict sequential blocks: Building (1000-1999), Plant & Machinery (2000-2999), Furniture (3000-3999), Vehicles (6000-6999), Computers (7000-7999).
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">3. API Endpoints Specification</h3>
                  <div className="space-y-4">
                    
                    {/* GET /api/slabs */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded">GET</span>
                        <code className="font-mono font-bold text-xs text-slate-900">/api/slabs</code>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Retrieves all codification code slab structures, current sequential counters, limits and saturation percentages.</p>
                    </div>

                    {/* PUT /api/slabs/:id */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded">PUT</span>
                        <code className="font-mono font-bold text-xs text-slate-900">/api/slabs/:id</code>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Updates range configuration parameters like startNum, endNum, and status.</p>
                    </div>

                    {/* POST /api/items */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded">POST</span>
                        <code className="font-mono font-bold text-xs text-slate-900">/api/items</code>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Codifies a new item, calculates the next available sequence and auto-increments the database bounds state.</p>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* 4. Footer (Slim Corporate ERP style matching mockup) */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 px-6 sm:px-8 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 shrink-0 font-mono mt-auto">
        <div>LAST AUTO-INCREMENT: 0.04s | SOURCE: SLAB_MASTER_V2</div>
        <div className="hidden sm:block">SYSTEM TIME: {currentTime.replace('T', ' ').substring(0, 19)} UTC</div>
        <div>V_ARCH_02.00.4</div>
      </footer>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiLayout, FiCpu, FiBarChart2, FiFileText, 
  FiSettings, FiPlusCircle, FiBell, FiClock, FiZap, FiActivity 
} from 'react-icons/fi';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useTasks from './hooks/useTasks';

const API_BASE = 'https://zenith-orchestrator.onrender.com';

const App = () => {
  const { 
    tasks, stats, chartData, 
    inventory, network, loading,
    fetchTasks, fetchStats, fetchInventory, fetchNetwork 
  } = useTasks();

  const [activeTab, setActiveTab] = useState('orchestration');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "System Booted Successfully", time: "Just now" },
    { id: 2, text: "Worker-Alpha is under high load", time: "5m ago" }
  ]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

 
  // --- EFFECTS ---

  useEffect(() => {
    if (activeTab === 'orchestration') {
      fetchTasks();
      const interval = setInterval(fetchTasks, 2000);
      return () => clearInterval(interval);
    } else if (activeTab === 'inventory') {
      fetchInventory();
    } else if (activeTab === 'network') {
      fetchNetwork();
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const closeMenus = () => {
      setShowProfileMenu(false);
      setShowNotifications(false);
    };
    if (showProfileMenu || showNotifications) {
      window.addEventListener('click', closeMenus);
    }
    return () => window.removeEventListener('click', closeMenus);
  }, [showProfileMenu, showNotifications]);

  

  // --- ACTIONS ---

  const triggerTasks = async () => {
    try {
      const API_KEY = process.env.REACT_APP_ZENITH_API_KEY;
      await axios.post(`${API_BASE}/tasks/trigger`, {}, {
        headers: {
          'X-API-KEY': 'pro_level_key_123'
        }
      });
      fetchTasks();
    } catch (err) {
      if (err.response?.status === 403) {
        alert("Bhai, API Key galat hai!");
      } else if (err.response?.status === 429) {
        alert("Sabar karo! 1 minute mein sirf 5 tasks allowed hain.");
      } else {
        alert("Check if Backend is running!");
      }
    } finally {
    }
  };

  // --- RENDER ---

  return (
    <div className="flex h-screen bg-[#0b0e14] text-gray-300 overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-gray-800 flex flex-col bg-[#0f1117]">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tighter text-white">ZENITH</h1>
          <p className="text-[10px] text-purple-500 font-mono font-bold">ENGINE V2.4.0 ACTIVE</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<FiLayout />} label="Orchestration" active={activeTab === 'orchestration'} onClick={() => setActiveTab('orchestration')} />
          <NavItem icon={<FiCpu />} label="Nodes" active={activeTab === 'nodes'} onClick={() => setActiveTab('nodes')} />
          <NavItem icon={<FiBarChart2 />} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <NavItem icon={<FiFileText />} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <NavItem icon={<FiSettings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl btn-gradient text-white text-sm font-bold">
            <FiPlusCircle /> <span>Deploy Node</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="flex justify-between items-center px-10 py-6 border-b border-gray-800 bg-[#0b0e14]/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex space-x-8 text-sm font-semibold">
            <span className={`cursor-pointer ${activeTab === 'orchestration' ? 'text-white border-b-2 border-purple-500' : 'text-gray-500'}`} onClick={() => setActiveTab('orchestration')}>Dashboard</span>
            <span className={`cursor-pointer hover:text-white transition-colors ${activeTab === 'inventory' ? 'text-white border-b-2 border-purple-500' : 'text-gray-500'}`} onClick={() => setActiveTab('inventory')}>Inventory</span>
            <span className={`cursor-pointer hover:text-white transition-colors ${activeTab === 'network' ? 'text-white border-b-2 border-purple-500' : 'text-gray-500'}`} onClick={() => setActiveTab('network')}>Network</span>
          </div>
          <div className="flex items-center space-x-5">

            {/* Notification Bell */}
            <div className="relative">
              <FiBell 
                className="text-lg hover:text-white cursor-pointer transition-colors" 
                onClick={(e) => { 
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
              />
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-64 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 p-2">
                  <h3 className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase">Recent Alerts</h3>
                  {notifications.map(n => (
                    <div key={n.id} className="p-2 hover:bg-gray-800 rounded mb-1 cursor-default text-xs">
                      <p className="text-gray-200">{n.text}</p>
                      <span className="text-[10px] text-purple-500">{n.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Clock */}
            <div className="flex items-center space-x-2 text-gray-400 font-mono text-sm border-l border-gray-800 pl-5">
              <FiClock className="text-lg" />
              <span>{time}</span>
            </div>

            {/* User Profile */}
            <div className="relative">
              <div 
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-0.5 cursor-pointer hover:scale-105 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
              >
                <div className="w-full h-full rounded-full bg-gray-900 border border-black/50 flex items-center justify-center text-[10px] font-bold text-white">
                  AD
                </div>
              </div>

              {showProfileMenu && (
                <div className="absolute right-0 mt-4 w-56 bg-[#0b0e14] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
                  <div className="p-4 border-b border-gray-800 bg-purple-500/5">
                    <p className="text-sm font-bold text-white">Admin Dashboard</p>
                    <p className="text-[10px] text-gray-500 font-mono">ID: ZEN-99234-X</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full text-left p-2.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-purple-400 rounded-lg transition-colors flex items-center space-x-2">
                      <span>⚙️</span>
                      <span>System Settings</span>
                    </button>
                    <button className="w-full text-left p-2.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-purple-400 rounded-lg transition-colors flex items-center space-x-2">
                      <span>👤</span>
                      <span>Account Profile</span>
                    </button>
                    <button className="w-full text-left p-2.5 text-xs text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border-t border-gray-800 mt-2 flex items-center space-x-2">
                      <span>🔒</span>
                      <span>Logout Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <div className="p-10">

          {/* --- 1. ORCHESTRATION TAB --- */}
          {activeTab === 'orchestration' && (
            <div className="space-y-10">
              <section className="glass-card rounded-2xl p-6 text-center relative overflow-hidden shadow-xl border border-white/5">
                <div className="bg-purple-500/10 text-purple-400 px-3 py-0.5 rounded-full text-[9px] inline-block uppercase font-black tracking-widest border border-purple-500/20 mb-2">
                  ● ZENITH Engine Status: Prime
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">System Orchestration Node</h2>
                <p className="text-gray-400 max-w-lg mx-auto text-xs leading-relaxed mb-4">
                  Initiate global task distribution across the cluster. V4 protocol enabled.
                </p>
                <button onClick={triggerTasks} disabled={loading} className="btn-gradient px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center space-x-2 mx-auto disabled:opacity-50">
                  <FiCpu className={loading ? "animate-spin" : ""} /> 
                  <span>{loading ? "Waking Workers..." : "Trigger 10 New Tasks"}</span>
                </button>
              </section>

              <div className="grid grid-cols-3 gap-8">
                <StatCard label="Active Workers" value="3" sub="SYSTEM STATUS: STABLE" color="text-emerald-400" />
                <StatCard 
                  sub="Precision Level" 
                  value={`${stats?.success_rate || 0}%`} 
                  label="Success Rate" 
                  color="text-purple-400" 
                  icon={FiZap} 
                />
                <StatCard 
                  sub="Throughput" 
                  value={stats?.total_tasks || 0} 
                  label="Tasks Processed" 
                  color="text-blue-400" 
                  icon={FiActivity} 
                />
              </div>

              <section className="glass-card rounded-2xl overflow-hidden border border-white/5">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="text-base font-bold text-white leading-none">Live Execution Stream</h3>
                </div>
                <div className="overflow-y-auto max-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-gray-800/30">
                      {tasks.map((task) => (
                        <tr key={task.task_id} className="text-xs hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-purple-400">{task.task_id.slice(0, 8)}...</td>
                          <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                          <td className="px-6 py-4 text-gray-400">{task.result ? JSON.stringify(task.result) : 'Processing...'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* --- 2. INVENTORY TAB --- */}
          {activeTab === 'inventory' && (
            <div className="inventory-view">
              <h2 className="text-2xl font-bold mb-4">Cluster Inventory</h2>
              <div className="bg-gray-800 p-4 rounded-lg">
                <table className="w-full text-left text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="p-2">Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.id} className="border-b border-gray-700/50">
                        <td className="p-2 text-purple-400">{item.name}</td>
                        <td className="p-2">{item.type}</td>
                        <td className="p-2 text-green-400">{item.status}</td>
                        <td className="p-2">{item.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- 3. NETWORK TAB --- */}
          {activeTab === 'network' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {network.map((node) => (
                <div key={node.id} className="bg-gray-900 border border-purple-900/30 p-5 rounded-xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-purple-400 font-bold">{node.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${node.status === 'running' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {node.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>IP Address:</span>
                      <span className="text-gray-200 font-mono">{node.ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Container ID:</span>
                      <span className="text-gray-200">{node.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* --- 4. NODES TAB --- */}
          {activeTab === 'nodes' && (
            <div className="space-y-10">
              <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter">ACTIVE CLUSTER NODES</h2>
                <p className="text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-[0.2em]">Live Node Health Monitor</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <NodeCard name="Worker-Alpha" status="Online" region="India-North-1" load="12%" />
                <NodeCard name="Worker-Beta" status="Online" region="India-North-2" load="45%" />
                <NodeCard name="Redis-Cluster" status="Online" region="Internal" load="8%" />
                <NodeCard name="Worker-Gamma" status="Offline" region="US-East" load="0%" />
              </div>
            </div>
          )}

          {/* --- 5. ANALYTICS TAB --- */}
          {activeTab === 'analytics' && (
            <div className="space-y-10">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter italic">NEURAL PERFORMANCE MAP</h2>
                  <p className="text-[10px] text-purple-500 font-mono font-bold tracking-[0.2em]">NODE CLUSTER INFRASTRUCTURE v4.0</p>
                </div>
                <div className="flex space-x-6">
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500 font-black uppercase">Current Efficiency</p>
                    <p className="text-2xl font-black text-purple-400">
                      {chartData.length > 0 ? chartData[chartData.length - 1].efficiency.toFixed(1) : "0"}%
                    </p>
                  </div>
                  <div className="text-right border-l border-white/10 pl-6">
                    <p className="text-[9px] text-gray-500 font-black uppercase">Network Load</p>
                    <p className="text-2xl font-black text-blue-400">
                      {chartData.length > 0 ? chartData[chartData.length - 1].load : "0"} <span className="text-[10px] text-gray-600">req/s</span>
                    </p>
                  </div>
                </div>
              </div>
              <section className="glass-card rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" hide /> 
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorEff)" animationDuration={1000} />
                      <Area type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={3} fill="url(#colorLoad)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}

          {/* --- 6. LOGS TAB --- */}
          {activeTab === 'logs' && (
            <div className="space-y-6 flex flex-col h-full">
              <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter">SYSTEM TELEMETRY</h2>
                <p className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-[0.2em]">Real-time Event Stream v2.0</p>
              </div>
              <div className="flex-1 bg-black/80 rounded-2xl border border-white/5 p-6 font-mono text-sm overflow-hidden flex flex-col shadow-2xl">
                <div className="flex items-center space-x-2 mb-4 border-b border-white/10 pb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                  <span className="text-[10px] text-gray-500 ml-4">root@zenith:~# tail -f /var/log/cluster.log</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                  <p className="text-emerald-400"><span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span> [INFO] Cluster Node Alpha connected successfully.</p>
                  {tasks.map((task, i) => (
                    <p key={i} className="text-gray-300">
                      <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span> 
                      <span className="text-purple-500"> [TASK]</span> ID: {task.task_id.slice(0, 8)} - Status: 
                      <span className={task.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'}> {task.status}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- 7. SETTINGS TAB --- */}
          {activeTab === 'settings' && (
            <div className="space-y-8 max-w-2xl">
              <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter">CORE CONFIGURATION</h2>
                <p className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-[0.2em]">Hardware & Protocol Tweak</p>
              </div>
              <div className="glass-card rounded-2xl p-8 border border-white/5 space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                  <div>
                    <h4 className="text-white font-bold">API Endpoint</h4>
                    <p className="text-xs text-gray-500">Current Gateway: {API_BASE}</p>
                  </div>
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg border border-white/10 transition-all">Edit URL</button>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                  <div>
                    <h4 className="text-white font-bold">Neural Engine V4</h4>
                    <p className="text-xs text-gray-500">Enable advanced task distribution logic</p>
                  </div>
                  <div className="w-12 h-6 bg-purple-600 rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <button className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black text-sm transition-all italic">
                  TERMINATE ALL CLUSTER SESSIONS
                </button>
              </div>
            </div>
          )}

        </div>

        {/* --- DEPLOY NODE MODAL --- */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
            <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-white italic mb-2 tracking-tighter">DEPLOY NEW WORKER</h3>
              <p className="text-xs text-gray-400 mb-6">Initialize a new computation node in the Zenith cluster.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2">Node Identifier</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-all"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2">Target Region</label>
                  <select className="w-full bg-[#1a1d24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-all">
                    <option>India-North-1 (Primary)</option>
                    <option>US-East-2 (Edge)</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex space-x-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/5 text-gray-400 text-xs font-bold hover:bg-white/5">ABORT</button>
                <button onClick={async () => { /* deploy logic */ }} className="flex-[2] py-3 rounded-xl bg-purple-600 text-white text-xs font-black shadow-[0_0_20px_rgba(139,92,246,0.4)]">EXECUTE DEPLOYMENT</button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="bottom-right" theme="dark" />
      </main>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const NavItem = ({ icon, label, active, onClick }) => (
  <div onClick={onClick} className={`flex items-center space-x-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all ${active ? 'sidebar-active text-white bg-white/5' : 'hover:bg-gray-800 text-gray-500'}`}>
    <span className="text-xl">{icon}</span>
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </div>
);

const NodeCard = ({ name, status, region, load }) => (
  <div className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <div className={`w-3 h-3 rounded-full ${status === 'Online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}></div>
      <div>
        <h4 className="text-white font-bold">{name}</h4>
        <p className="text-[10px] text-gray-500 uppercase">{region}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-[10px] text-gray-500 font-black uppercase">CPU Load</p>
      <p className="text-xl font-black text-purple-400">{load}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, sub, dot, failed, color }) => (
  <div className="glass-card p-4 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{sub}</p>
    <h4 className={`text-3xl font-black ${color}`}>{value}</h4>
    <p className="text-[10px] font-bold text-gray-400">{label}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    SUCCESS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PROCESSING: "bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse",
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return <span className={`px-3 py-1 rounded-lg border text-[10px] font-black tracking-widest ${styles[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{status}</span>;
};

export default App;
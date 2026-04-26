import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = 'https://zenith-orchestrator.onrender.com';

const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [network, setNetwork] = useState([]);
  const [stats, setStats] = useState({ 
    success_rate: 0, 
    total_tasks: 0, 
    avg_time: 0, 
    active_workers: 3 
  });
  const [chartData, setChartData] = useState(
    Array.from({ length: 15 }, (_, i) => ({ name: i, efficiency: 70, load: 40 }))
  );

  // --- DATA FETCHING ---

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tasks/all`);
      setTasks(response.data);
    } catch (err) {
      console.error("Backend not reachable", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/analytics/stats`);
      const data = res.data;

      setStats({
        success_rate: data.success_rate || 0,
        total_tasks: data.total_tasks || 0,
        avg_time: data.avg_processing_time || 0
      });

      setChartData(prev => {
        const nextData = [...prev.slice(-14)];
        nextData.push({
          name: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          efficiency: data.success_rate || 0,
          load: (data.total_tasks % 100) || 0
        });
        return nextData;
      });

      console.log("Stats Updated:", data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/inventory`);
      setInventory(response.data);
    } catch (err) {
      console.error("Inventory fetch failed", err);
    }
  };

  const fetchNetwork = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/network`);
      setNetwork(response.data);
    } catch (err) {
      console.error("Network fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- WEBSOCKET ---

  useEffect(() => {
    let socket;
    let reconnectTimeout;
    let isMounted = true;

    const connectWS = () => {
      if (!isMounted) return;

      console.log("🔄 Attempting to connect to WebSocket...");
      socket = new WebSocket('wss://zenith-orchestrator.onrender.com/ws/tasks');

      socket.onopen = () => {
        if (isMounted) {
          console.log("✅ WebSocket Connected!");
        }
      };

      socket.onmessage = (event) => {
        const message = event.data;
        console.log("📩 Message:", message);

        if (message === "REFRESH_TASKS") {
          fetchTasks();
          fetchStats();
          toast.info("Bulk Tasks Triggered! ⚡");
        } else if (message.startsWith("TASK_COMPLETED:")) {
          const id = message.split(":")[1];
          fetchTasks();
          toast.success(`Task Done: ${id.substring(0, 8)}... 🚀`, {
            autoClose: 3000,
            theme: "dark"
          });
        }
      };

      socket.onclose = (e) => {
        if (isMounted) {
          console.log(`❌ Connection Closed (Code: ${e.code}). Retrying in 3s...`);
          reconnectTimeout = setTimeout(connectWS, 3000);
        }
      };

      socket.onerror = () => {
        if (socket.readyState === WebSocket.OPEN) {
          console.error("🔥 WebSocket Error occurred.");
        }
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, []);

  return { 
    tasks, stats, chartData, 
    inventory, network, loading, 
    fetchTasks, fetchStats, fetchInventory, fetchNetwork 
  };
};

export default useTasks;
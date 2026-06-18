import re

file_path = "c:/Users/DELL/Desktop/VXT_2.0/NEXA/frontend/src/components/Dashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
content = re.sub(
    r"import { motion, AnimatePresence } from 'framer-motion';",
    "import { motion, AnimatePresence } from 'framer-motion';\nimport { supabase } from '../supabaseClient';\nimport ScanResults from './ScanResults';",
    content
)

# 2. Add setActiveTab to props
content = re.sub(
    r"export default function Dashboard\(\{ activeTab, theme, setTheme \}\) \{",
    "export default function Dashboard({ activeTab, setActiveTab, theme, setTheme }) {",
    content
)

# 3. Replace handleStartScan and clearAllTimers logic with EventSource
new_logic = """
  useEffect(() => {
    const channel = supabase
      .channel('public:core_scanhistory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core_scanhistory' }, (payload) => {
        console.log('Supabase Realtime Payload:', payload);
        const row = payload.new;
        if (row && row.status === 'COMPLETED') {
          setScanResult(row);
          if (setActiveTab) setActiveTab('results');
          setIsScanning(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [setActiveTab]);

  const eventSourceRef = useRef(null);

  const handleStartScan = async (e) => {
    e.preventDefault();
    if (!target.trim()) return;

    setIsScanning(true);
    setVisibleSteps([]);
    setScanResult(null);
    setSelfScanMessage('');
    setExpandedId(null);
    setConnectionError('');

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `http://127.0.0.1:8000/api/v1/scan/stream/?target=${encodeURIComponent(target.trim())}`;
    const source = new EventSource(url);
    eventSourceRef.current = source;
    
    let stepIndex = 0;

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'blocked') {
           setSelfScanMessage(data.message);
           setIsScanning(false);
           source.close();
           return;
        }
        
        if (data.status === 'error') {
           setConnectionError(data.message);
           setIsScanning(false);
           source.close();
           return;
        }

        setVisibleSteps(prev => [...prev, { text: data.message, index: stepIndex++ }]);

        if (data.status === 'completed') {
           // We keep it scanning true to wait for Supabase Realtime to fire and navigate us
           source.close();
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    source.onerror = (err) => {
      console.error("SSE Error:", err);
      setConnectionError("Connection to NEXA stream lost.");
      setIsScanning(false);
      source.close();
    };
  };
"""

# We need to remove the old clearAllTimers, useEffect, and handleStartScan.
# We'll use a regex to match from `const timersRef` to the end of `handleStartScan`.
content = re.sub(
    r"const timersRef = useRef\(\[\]\);.*?catch \(err\) \{[^}]+\}\s+};\s+};",
    new_logic,
    content,
    flags=re.DOTALL
)

# Wait, handleStartScan ends with `};\n\n  return (`
content = re.sub(
    r"const timersRef = useRef\(\[\]\);.*?};\n\n  return \(",
    new_logic.strip() + "\n\n  return (",
    content,
    flags=re.DOTALL
)

# 4. Add the ScanResults tab rendering
new_tab = """
        {/* TAB: RESULTS */}
        {activeTab === 'results' && (
          <ScanResults scanResult={scanResult} />
        )}
"""

content = re.sub(
    r"(<AnimatePresence mode=\"wait\">)",
    r"\1" + new_tab,
    content
)

# 5. Hide the hardcoded 'Scanning Results Block' inside the 'scanner' tab, since we now use the new 'results' tab!
# The block starts with `{/* Scanning Results Block (Fully responsive grids!) */}`
# We will just remove it or comment it out so it doesn't conflict.
content = re.sub(
    r"\{/\* Scanning Results Block \(Fully responsive grids!\) \*/\}.*?(?=</motion\.div>\n        \)} <!-- end of scanner tab -->)",
    "",
    content,
    flags=re.DOTALL
)

# Let's be safer and use a more precise replacement for the Results Block
content = re.sub(
    r"\{/\* Scanning Results Block \(Fully responsive grids!\) \*/\}.*?</AnimatePresence>",
    "",
    content,
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard patched successfully!")

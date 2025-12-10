'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Car,
  ScanLine,
  Map,
  Mic2,
  MessageSquare,
  ChevronLeft,
  ArrowRight,
  Camera,
  Navigation,
  Anchor
} from 'lucide-react';

// --- Data Types ---
interface TaxiData { destination_kr: string; address_kr: string; driver_note: string; }
interface PriceData { items: { name: string; price: string; verdict: string }[]; total_verdict: 'Fair' | 'Expensive' | 'Rip-off'; advice: string; }
interface RouteData { from: string; to: string; method: 'Subway' | 'Bus' | 'Walk' | 'Taxi'; time: string; steps: string[]; }
interface TranslationData { original: string; translated: string; pronunciation: string; }
interface ChatMessage { role: 'user' | 'assistant'; text: string; }

export default function EnglishPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [destination, setDestination] = useState('');
  const [taxiData, setTaxiData] = useState<TaxiData | null>(null);
  const [priceImage, setPriceImage] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pathDest, setPathDest] = useState('');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [voiceInput, setVoiceInput] = useState('');
  const [translationData, setTranslationData] = useState<TranslationData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const callGenieApi = async (payload: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/en/genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      return result.ok ? result.data : null;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummonTaxi = async (e: React.FormEvent) => { e.preventDefault(); if(!destination) return; const data = await callGenieApi({ message: `I want to go to "${destination}". Create a taxi card.` }); if(data?.content) setTaxiData(data.content); };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(file){ const reader = new FileReader(); reader.onloadend = async () => { setPriceImage(reader.result as string); const data = await callGenieApi({ image: reader.result as string, message: "Analyze price." }); if(data?.content) setPriceData(data.content); }; reader.readAsDataURL(file); }};
  const handleFindPath = async (e: React.FormEvent) => { e.preventDefault(); if(!pathDest) return; const data = await callGenieApi({ message: `Route to ${pathDest}` }); if(data?.content) setRouteData(data.content); };
  const handleTranslation = async (e: React.FormEvent) => { e.preventDefault(); if(!voiceInput) return; const data = await callGenieApi({ message: `Translate: ${voiceInput}` }); if(data?.content) setTranslationData(data.content); };
  const handleChat = async (e: React.FormEvent) => { e.preventDefault(); if(!chatInput) return; const userMsg = chatInput; setChatMessages(p => [...p, {role:'user', text:userMsg}]); setChatInput(''); const data = await callGenieApi({ message: userMsg }); if(data?.content?.message) setChatMessages(p => [...p, {role:'assistant', text:data.content.message}]); };
  const resetView = () => { setActiveTool(null); setDestination(''); setTaxiData(null); setPriceImage(null); setPriceData(null); setPathDest(''); setRouteData(null); setVoiceInput(''); setTranslationData(null); };

  const tools = [
    { id: 'taxi', icon: <Car strokeWidth={1.5} />, title: 'Royal Chauffeur', subtitle: 'Show Driver Card' },
    { id: 'price', icon: <ScanLine strokeWidth={1.5} />, title: 'Price Guardian', subtitle: 'Avoid Tourist Traps' },
    { id: 'path', icon: <Map strokeWidth={1.5} />, title: 'Noble Path', subtitle: 'Smart Navigation' },
    { id: 'voice', icon: <Mic2 strokeWidth={1.5} />, title: 'Elite Translator', subtitle: 'Speak Like a Local' },
  ];

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#D4AF37] selection:text-black">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.div className="absolute inset-0" initial={{ scale: 1.05 }} animate={{ scale: 1.15 }} transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}>
          <Image src="/images/site-main.webp" alt="Seoul Cruise" fill className="object-cover" priority />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050B14]/90 via-[#050B14]/30 to-[#050B14]/20" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full min-h-screen flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div key="home" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-lg flex flex-col items-center">
              
              {/* Logo & Badge */}
              <motion.div className="text-center mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                {/* Small Logo with White Background */}
                <div className="flex justify-center mb-3">
                  <div className="bg-white px-3 py-1.5 rounded-lg shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
                    <Image src="/images/ai-cruise-logo.png" alt="CruiseDot" width={60} height={20} className="object-contain w-auto h-auto" priority />
                  </div>
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 border border-[#D4AF37]/30 rounded-full bg-black/30 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                  <Anchor className="w-3 h-3 text-[#D4AF37]" />
                  <span className="text-[#D4AF37] text-[10px] font-bold tracking-[0.3em] uppercase">Premium Cruise Concierge</span>
                </div>

                {/* KOREA + Cruise Dot.AI */}
                <p className="text-[#D4AF37] text-2xl sm:text-3xl font-bold tracking-[0.5em] uppercase mb-2">KOREA</p>
                <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight drop-shadow-2xl mb-2">
                  Cruise<span className="text-[#D4AF37] italic"> Dot</span>.AI
                </h1>
                <p className="text-white/80 font-light tracking-[0.2em] text-xs uppercase">Navigate Seoul with Elegance</p>
              </motion.div>

              {/* Tools Grid */}
              <div className="grid grid-cols-1 gap-4 w-full mb-10">
                {tools.map((tool, i) => (
                  <motion.button key={tool.id} layoutId={tool.id} onClick={() => setActiveTool(tool.id)} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i, type: "spring", stiffness: 200, damping: 20 }} whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }} className="group relative overflow-hidden flex items-center justify-between p-5 h-24 w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:border-[#D4AF37]/50 hover:bg-white/10 transition-all duration-300 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="flex items-center gap-5 z-10">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white/90 border border-white/10 bg-white/5 group-hover:bg-[#D4AF37] group-hover:text-black transition-all duration-300">{tool.icon}</div>
                      <div className="text-left">
                        <h3 className="text-lg font-serif text-white group-hover:text-[#D4AF37] transition-colors duration-300">{tool.title}</h3>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">{tool.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="text-white/20 w-5 h-5 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
                  </motion.button>
                ))}
              </div>

              {/* Chat Button */}
              <motion.button onClick={() => setActiveTool('chat')} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-3 px-8 py-4 bg-[#D4AF37] text-[#050B14] rounded-full font-bold uppercase tracking-widest text-xs shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:shadow-[0_0_60px_rgba(212,175,55,0.6)] transition-all">
                <MessageSquare className="w-4 h-4" />
                <span>Talk to Concierge</span>
              </motion.button>
            </motion.div>
          ) : (
            /* Detail View */
            <motion.div key="detail" initial={{ opacity: 0, scale: 0.95, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 50, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="w-full max-w-md h-[85vh] flex flex-col bg-[#050B14]/80 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <button onClick={resetView} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5"><ChevronLeft className="w-6 h-6" /></button>
                <span className="text-[10px] font-bold tracking-[0.3em] text-[#D4AF37] uppercase">{tools.find(t => t.id === activeTool)?.title}</span>
                <div className="w-8" />
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {activeTool === 'taxi' && (!taxiData ? (
                  <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSummonTaxi} className="flex flex-col h-full justify-center">
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 mx-auto bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-6 border border-[#D4AF37]/20"><Car className="w-8 h-8 text-[#D4AF37]" /></div>
                      <h3 className="text-3xl font-serif text-white mb-2">Where to?</h3>
                      <p className="text-white/40 font-light text-sm">We will guide your driver.</p>
                    </div>
                    <input type="text" value={destination} onChange={e=>setDestination(e.target.value)} placeholder="e.g. Grand Hyatt Seoul" className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-6 text-xl text-center text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all mb-6 placeholder:text-white/20" autoFocus />
                    <button disabled={isLoading||!destination} className="w-full py-5 bg-[#D4AF37] text-[#050B14] font-bold rounded-2xl uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg">{isLoading ? 'Creating...' : 'Generate Card'}</button>
                  </motion.form>
                ) : (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#fcfbf9] text-[#050B14] p-8 rounded-[2rem] shadow-2xl border-t-4 border-[#D4AF37] h-full flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#D4AF37]/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                      <div className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.3em] mb-8 text-center border-b border-[#D4AF37]/20 pb-4">Destination Card</div>
                      <h2 className="text-4xl sm:text-5xl font-serif font-bold text-center mb-4 leading-tight break-keep">{taxiData.destination_kr}</h2>
                      <p className="text-center text-gray-500 mb-8 font-light text-sm">{taxiData.address_kr}</p>
                      <div className="bg-[#D4AF37]/10 p-5 rounded-xl border border-[#D4AF37]/20">
                        <p className="font-serif text-lg italic text-center mb-2 text-[#050B14]">&quot;Please take me here.&quot;</p>
                        <p className="text-center text-xs text-gray-500">({taxiData.driver_note})</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {activeTool === 'price' && (!priceImage ? (
                  <div className="flex flex-col h-full justify-center items-center gap-8">
                    <button onClick={()=>fileInputRef.current?.click()} className="relative group w-48 h-48 rounded-full border border-white/10 flex items-center justify-center hover:border-[#D4AF37] transition-all duration-500">
                      <div className="absolute inset-0 bg-[#D4AF37]/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <Camera className="w-12 h-12 text-white/50 group-hover:text-[#D4AF37] transition-colors" />
                    </button>
                    <div className="text-center"><h3 className="text-2xl font-serif text-white mb-2">Price Scan</h3><p className="text-white/40 text-sm">Upload menu or receipt</p></div>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                      <img src={priceImage} alt="Uploaded" className="w-full h-full object-cover"/>
                      {isLoading&&<div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[#D4AF37] tracking-[0.2em] text-sm font-bold backdrop-blur-sm">ANALYZING...</div>}
                    </div>
                    {priceData && <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`p-6 rounded-2xl border-l-4 ${priceData.total_verdict==='Rip-off'?'border-red-500 bg-red-500/10':'border-[#10B981] bg-[#10B981]/10'}`}><h3 className="text-2xl font-serif mb-2 text-white">{priceData.total_verdict}</h3><p className="text-white/70 font-light text-sm leading-relaxed">{priceData.advice}</p></motion.div>}
                  </div>
                ))}

                {activeTool === 'path' && (!routeData ? (
                  <form onSubmit={handleFindPath} className="flex flex-col h-full justify-center space-y-8">
                    <div className="text-center"><Navigation className="w-12 h-12 mx-auto mb-6 text-[#3B82F6] opacity-80"/><h3 className="text-2xl font-serif text-white mb-2">Navigation</h3><p className="text-white/40 text-sm">Enter destination</p></div>
                    <input type="text" value={pathDest} onChange={e=>setPathDest(e.target.value)} placeholder="e.g. Coex Mall" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-xl text-center text-white focus:border-[#3B82F6] focus:outline-none transition-all" autoFocus />
                    <button disabled={isLoading||!pathDest} className="w-full py-5 bg-[#3B82F6] text-white font-bold rounded-2xl uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50">{isLoading ? '...' : 'Find Route'}</button>
                  </form>
                ) : (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-2xl">
                    <div className="flex justify-between items-end mb-6 pb-4 border-b border-white/10"><div><p className="text-[#3B82F6] text-[10px] uppercase tracking-widest mb-1">To</p><h3 className="text-xl font-serif text-white">{routeData.to}</h3></div><span className="text-2xl text-white font-light">{routeData.time}</span></div>
                    <div className="space-y-6">{routeData.steps?.map((s,i)=><div key={i} className="flex gap-4"><div className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div><p className="text-gray-300 font-light text-sm">{s}</p></div>)}</div>
                  </motion.div>
                ))}

                {activeTool === 'voice' && (!translationData ? (
                  <form onSubmit={handleTranslation} className="flex flex-col h-full justify-center space-y-8">
                    <div className="text-center"><Mic2 className="w-12 h-12 mx-auto mb-6 text-[#EC4899] opacity-80"/><h3 className="text-2xl font-serif text-white mb-2">Translator</h3><p className="text-white/40 text-sm">Type to translate</p></div>
                    <textarea value={voiceInput} onChange={e=>setVoiceInput(e.target.value)} placeholder="e.g. Can I pay with card?" rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-xl text-center text-white focus:border-[#EC4899] focus:outline-none transition-all resize-none" autoFocus />
                    <button disabled={isLoading||!voiceInput} className="w-full py-5 bg-[#EC4899] text-white font-bold rounded-2xl uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50">{isLoading ? '...' : 'Translate'}</button>
                  </form>
                ) : (
                  <div className="bg-[#fcfbf9] p-8 rounded-[2rem] shadow-2xl border-t-4 border-[#EC4899] text-center h-full flex flex-col justify-center">
                    <p className="text-gray-400 font-serif italic mb-6">&quot;{translationData.original}&quot;</p>
                    <h2 className="text-3xl font-bold text-[#050B14] mb-6 leading-tight break-keep">{translationData.translated}</h2>
                    <div className="inline-block bg-[#EC4899]/10 px-4 py-2 rounded-full"><p className="text-[#EC4899] font-medium text-sm">{translationData.pronunciation}</p></div>
                    <button onClick={()=>setTranslationData(null)} className="mt-8 text-sm text-[#EC4899] hover:underline">Translate Another</button>
                  </div>
                ))}

                {activeTool === 'chat' && (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2">
                      {chatMessages.length===0 && <div className="text-center mt-20 opacity-30"><MessageSquare className="w-12 h-12 mx-auto mb-4"/><p className="text-sm">Concierge is ready.</p></div>}
                      {chatMessages.map((m,i)=>(<div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.role==='user'?'bg-[#D4AF37] text-[#050B14] font-medium':'bg-white/10 text-white font-light'}`}>{m.text}</div></div>))}
                    </div>
                    <form onSubmit={handleChat} className="flex gap-2"><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Type request..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"/><button disabled={!chatInput} className="p-3 bg-[#D4AF37] rounded-full text-[#050B14]"><ArrowRight className="w-5 h-5"/></button></form>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

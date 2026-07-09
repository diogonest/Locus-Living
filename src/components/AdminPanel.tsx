import React, { useState, useEffect } from 'react';
import { Lock, Search, Trash2, Download, Plus, X, Users, Check, AlertCircle, Image, Upload, RefreshCw } from 'lucide-react';
import { Lead } from '../types';
import { saveLogoToFirestore, fetchLogoFromFirestore } from '../firebase';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onAddMockLead: () => void;
  onClearLeads: () => void;
  onDeleteLead: (id: string) => void;
}

export default function AdminPanel({
  isOpen,
  onClose,
  leads,
  onAddMockLead,
  onClearLeads,
  onDeleteLead,
}: AdminPanelProps) {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [darkLogo, setDarkLogo] = useState<string | null>(null);
  const [lightLogo, setLightLogo] = useState<string | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoMessage, setLogoMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const loadLogos = async () => {
        try {
          const result = await fetchLogoFromFirestore();
          if (result) {
            setDarkLogo(result.base64 || null);
            setLightLogo(result.lightBase64 || null);
          }
        } catch (err) {
          console.error("Erro ao carregar logos do Firestore:", err);
        }
      };
      loadLogos();
    }
  }, [isAuthenticated]);

  // Helper to resize and compress logos on the client side to prevent Firestore 1MB document size limit issues.
  const resizeAndCompressLogo = (file: File, maxWidth = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale down if width exceeds maxWidth
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context could not be created'));
            return;
          }

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Preserve transparency for PNGs
          const isPng = file.type === 'image/png';
          const outputType = isPng ? 'image/png' : 'image/jpeg';
          const quality = isPng ? undefined : 0.85;

          try {
            const compressedBase64 = canvas.toDataURL(outputType, quality);
            resolve(compressedBase64);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'dark' | 'light') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP, etc.).');
      return;
    }

    setLogoMessage('Processando e otimizando imagem...');
    try {
      const optimizedBase64 = await resizeAndCompressLogo(file);
      if (type === 'dark') {
        setDarkLogo(optimizedBase64);
      } else {
        setLightLogo(optimizedBase64);
      }
      setLogoMessage('Imagem carregada e otimizada!');
      setTimeout(() => setLogoMessage(''), 2500);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Ocorreu um erro ao otimizar a imagem. Tente outro arquivo.');
      setLogoMessage('');
    }
  };

  const handleSaveLogos = async () => {
    setIsSavingLogo(true);
    setLogoMessage('');
    try {
      await saveLogoToFirestore(darkLogo || '', lightLogo || '');
      
      if (darkLogo) {
        localStorage.setItem('locus_logo_dark', darkLogo);
      } else {
        localStorage.removeItem('locus_logo_dark');
      }

      if (lightLogo) {
        localStorage.setItem('locus_logo_light', lightLogo);
      } else {
        localStorage.removeItem('locus_logo_light');
      }

      window.dispatchEvent(new Event('locus_logo_updated'));
      setLogoMessage('Logos salvos com sucesso no Firebase!');
      setTimeout(() => setLogoMessage(''), 4000);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes('large') || errorMessage.toLowerCase().includes('limit')) {
        setLogoMessage('Erro: A imagem ainda é muito grande para o Firestore.');
      } else {
        setLogoMessage('Erro ao salvar no Firebase.');
      }
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleResetLogos = async () => {
    if (confirm('Deseja realmente remover os logotipos personalizados e voltar ao design serif padrão?')) {
      setIsSavingLogo(true);
      try {
        await saveLogoToFirestore('', '');
        setDarkLogo(null);
        setLightLogo(null);
        localStorage.removeItem('locus_logo_dark');
        localStorage.removeItem('locus_logo_light');
        window.dispatchEvent(new Event('locus_logo_updated'));
        setLogoMessage('Logotipos redefinidos com sucesso!');
        setTimeout(() => setLogoMessage(''), 4000);
      } catch (err) {
        console.error(err);
        setLogoMessage('Erro ao redefinir.');
      } finally {
        setIsSavingLogo(false);
      }
    }
  };

  // Correct passcode is 'locus2026' or 'locus'
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === 'locus2026' || passcode.toLowerCase() === 'locus') {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Senha incorreta. Dica: use "locus2026"');
    }
  };

  const handleDownloadCSV = () => {
    if (leads.length === 0) return;
    const headers = ['ID', 'Nome', 'Contato', 'Data de Cadastro'];
    const rows = leads.map(lead => [
      lead.id,
      lead.name.replace(/,/g, ' '),
      lead.contact.replace(/,/g, ' '),
      lead.date,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(',')),
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_locus_living_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-stone-900 border border-stone-800 rounded-lg shadow-2xl flex flex-col overflow-hidden text-stone-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/50">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-medium font-cap tracking-wider uppercase text-amber-400">
              Painel de Controle : Locus Living
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-stone-800 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-6 h-6 text-stone-400" />
          </button>
        </div>

        {!isAuthenticated ? (
          /* Login Form */
          <div className="flex-1 flex flex-col items-center justify-center p-12 max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-stone-800/80 rounded-full flex items-center justify-center mb-6 border border-stone-700">
              <Lock className="w-8 h-8 text-amber-500/80" />
            </div>
            <h3 className="text-xl font-display mb-2">Acesso Restrito de Administração</h3>
            <p className="text-stone-400 text-sm mb-6">
              Diogo & Jennifer, digite a senha de acesso para visualizar e exportar os contatos da lista de espera.
            </p>
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <input 
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Digite a senha (ex: locus2026)"
                  className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded text-center font-sans tracking-widest text-stone-100 placeholder:tracking-normal placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              {errorMsg && (
                <p className="text-rose-400 text-xs flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorMsg}
                </p>
              )}
              <button 
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold font-cap text-xs tracking-wider uppercase rounded transition-colors"
              >
                Acessar Lista de Leads
              </button>
            </form>
            <div className="mt-8 text-[11px] text-stone-500 font-mono">
              Senha padrão de demonstração: <span className="text-stone-400 font-bold">locus2026</span>
            </div>
          </div>
        ) : (
          /* Dashboard Panel */
          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-stone-950 p-4 rounded-md border border-stone-800 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-stone-400 uppercase tracking-widest font-cap">Total de Leads</div>
                  <div className="text-2xl font-bold font-display">{leads.length}</div>
                </div>
              </div>
              
              <div className="bg-stone-950 p-4 rounded-md border border-stone-800 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-stone-400 uppercase tracking-widest font-cap">Status do Lançamento</div>
                  <div className="text-md font-semibold text-emerald-400 font-cap mt-1">Brevemente Revelado</div>
                </div>
              </div>

              <div className="bg-stone-950 p-4 rounded-md border border-stone-800 flex flex-col justify-center gap-1">
                <div className="text-xs text-stone-400 uppercase tracking-widest font-cap">Ações de Desenvolvimento</div>
                <div className="flex gap-2 mt-1">
                  <button 
                    onClick={onAddMockLead}
                    className="flex-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-[11px] rounded transition-colors font-cap text-stone-200"
                  >
                    + Adicionar Mock
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm("Tem certeza que deseja apagar TODOS os leads?")) {
                        onClearLeads();
                      }
                    }}
                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] rounded transition-colors font-cap"
                  >
                    Resetar Lista
                  </button>
                </div>
              </div>
            </div>

            {/* Logo Configuration Section */}
            <div className="bg-stone-950 p-5 rounded-md border border-stone-800 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-semibold font-cap tracking-wider uppercase text-stone-200">
                  Identidade Visual : Logotipo Personalizado (Firebase)
                </h4>
              </div>
              <p className="text-xs text-stone-400 mb-4 leading-relaxed">
                Envie aqui a imagem exata do logotipo fornecido para substituir o logotipo de texto padrão do site. As imagens serão salvas de forma persistente e recorrente no Firebase Firestore.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dark logo upload (for light backgrounds like header) */}
                <div className="p-4 bg-stone-900/60 rounded border border-stone-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-stone-300 font-cap block mb-1">LOGOTIPO PRINCIPAL / ESCURO</span>
                    <span className="text-[11px] text-stone-500 block mb-3">Usado em fundos claros (Ex: Cabeçalho superior)</span>
                    
                    {darkLogo ? (
                      <div className="h-16 flex items-center justify-center bg-stone-100 rounded border border-stone-700 p-2 mb-3">
                        <img src={darkLogo} alt="Logo Principal Preview" className="max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center bg-stone-950/50 rounded border border-dashed border-stone-800 mb-3 text-stone-600 text-xs">
                        Nenhum logotipo enviado
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <label className="flex-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300 rounded cursor-pointer transition-colors text-center font-cap flex items-center justify-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      Selecionar Arquivo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleLogoFileChange(e, 'dark')} 
                        className="hidden" 
                      />
                    </label>
                    {darkLogo && (
                      <button 
                        onClick={() => setDarkLogo(null)}
                        className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] rounded transition-colors font-cap"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                {/* Light logo upload (for dark backgrounds like footer) */}
                <div className="p-4 bg-stone-900/60 rounded border border-stone-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-stone-300 font-cap block mb-1">LOGOTIPO CLARO / BRANCO</span>
                    <span className="text-[11px] text-stone-500 block mb-3">Usado em fundos escuros (Ex: Rodapé)</span>
                    
                    {lightLogo ? (
                      <div className="h-16 flex items-center justify-center bg-stone-950 rounded border border-stone-700 p-2 mb-3">
                        <img src={lightLogo} alt="Logo Claro Preview" className="max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center bg-stone-950/50 rounded border border-dashed border-stone-800 mb-3 text-stone-600 text-xs">
                        Nenhum logotipo enviado
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <label className="flex-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300 rounded cursor-pointer transition-colors text-center font-cap flex items-center justify-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      Selecionar Arquivo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleLogoFileChange(e, 'light')} 
                        className="hidden" 
                      />
                    </label>
                    {lightLogo && (
                      <button 
                        onClick={() => setLightLogo(null)}
                        className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] rounded transition-colors font-cap"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Logo Action buttons */}
              <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between">
                <button 
                  onClick={handleResetLogos}
                  disabled={isSavingLogo || (!darkLogo && !lightLogo)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-[11px] text-stone-400 hover:text-stone-300 rounded transition-colors font-cap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Voltar ao Padrão
                </button>

                <div className="flex items-center gap-3">
                  {logoMessage && (
                    <span className="text-xs text-amber-400 font-medium">
                      {logoMessage}
                    </span>
                  )}
                  <button 
                    onClick={handleSaveLogos}
                    disabled={isSavingLogo}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-800 text-stone-950 text-xs font-semibold font-cap tracking-wider uppercase rounded flex items-center gap-1.5 transition-all"
                  >
                    {isSavingLogo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        Salvar Logos no Firebase
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou contato..."
                  className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-stone-700"
                />
              </div>

              <button 
                onClick={handleDownloadCSV}
                disabled={leads.length === 0}
                className="w-full md:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed text-stone-950 text-xs font-semibold font-cap tracking-wider uppercase rounded flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Exportar CSV para Excel
              </button>
            </div>

            {/* Leads Table */}
            <div className="flex-1 overflow-y-auto border border-stone-800 rounded bg-stone-950">
              {filteredLeads.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-sm">
                  {leads.length === 0 ? 'Nenhum lead cadastrado ainda.' : 'Nenhum lead corresponde à busca.'}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 bg-stone-900/40 text-stone-400 text-xs font-cap tracking-wider uppercase">
                      <th className="p-4 font-semibold">Nome</th>
                      <th className="p-4 font-semibold">Contato (Email / Whatsapp)</th>
                      <th className="p-4 font-semibold">Data Cadastro</th>
                      <th className="p-4 font-semibold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900 text-sm">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-stone-900/30 transition-colors">
                        <td className="p-4 font-medium text-stone-100">{lead.name}</td>
                        <td className="p-4 text-stone-300 font-mono">{lead.contact}</td>
                        <td className="p-4 text-stone-400 text-xs">{lead.date}</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => {
                              if(confirm(`Remover "${lead.name}"?`)) {
                                onDeleteLead(lead.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-500/10 text-stone-500 hover:text-rose-400 rounded transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
              <div>
                Mostrando {filteredLeads.length} de {leads.length} leads
              </div>
              <div>
                Locus Living Security · Local Sandbox
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronDown, 
  ArrowRight, 
  Check, 
  Menu, 
  X, 
  Instagram, 
  Mail, 
  Phone,
  Shield,
  Home,
  Eye,
  Clock,
  ExternalLink
} from 'lucide-react';
import KeyIcon from './components/KeyIcon';
import Logo from './components/Logo';
import FAQAccordion from './components/FAQAccordion';
import AdminPanel from './components/AdminPanel';
import { Lead } from './types';
import { 
  saveLeadToFirestore, 
  fetchLeadsFromFirestore, 
  deleteLeadFromFirestore,
  fetchSheetsConfig,
  getCachedAccessToken,
  syncLeadsToSpreadsheet
} from './firebase';

export default function App() {
  // Mobile Nav Toggle
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Admin Panel Toggle
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Nav Scroll Style
  const [isScrolled, setIsScrolled] = useState(false);

  // Leads state
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('locus_living_leads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Seed with high-quality demo leads on first load
    return [
      { id: 'lead-1', name: 'Rodrigo Albuquerque da Silva', contact: 'rodrigo.albuquerque@outlook.com', date: '08/07/2026, 17:34' },
      { id: 'lead-2', name: 'Dr. Fernando L. Guimarães', contact: '(27) 99841-2050', date: '08/07/2026, 17:55' },
      { id: 'lead-3', name: 'Beatriz Vasconcellos Melo', contact: 'b.melo@meloarquitetura.com', date: '08/07/2026, 18:02' }
    ];
  });

  // Early access form states
  const [formName, setFormName] = useState('');
  const [formTypology, setFormTypology] = useState('');
  const [formProject, setFormProject] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [isEarlyUnlocked, setIsEarlyUnlocked] = useState(false);

  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 24) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch leads from Firebase Firestore on mount
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const firebaseLeads = await fetchLeadsFromFirestore();
        if (firebaseLeads && firebaseLeads.length > 0) {
          setLeads(firebaseLeads);
        }
      } catch (error) {
        console.error("Erro ao carregar leads do Firestore:", error);
      }
    };
    loadLeads();
  }, []);

  // Sync leads to localStorage
  useEffect(() => {
    localStorage.setItem('locus_living_leads', JSON.stringify(leads));
  }, [leads]);

  // Form submission handler
  const handleFormSubmit = async () => {
    setFormError('');

    const trimmedName = formName.trim();
    const trimmedTypology = formTypology.trim();
    const trimmedProject = formProject.trim();

    if (trimmedName.length < 2) {
      setFormError('Por favor, informe seu nome completo.');
      return;
    }

    if (trimmedTypology.length < 2) {
      setFormError('Por favor, informe a tipologia (ex: Apartamento, Cobertura, etc.).');
      return;
    }

    if (trimmedProject.length < 2) {
      setFormError('Por favor, informe o nome do empreendimento.');
      return;
    }

    // Combine info to store in 'contact' field for full backward compatibility
    const contactString = `Tipologia: ${trimmedTypology} | Empreendimento: ${trimmedProject}`;

    try {
      // Save new lead to Firebase Firestore
      const savedLead = await saveLeadToFirestore(trimmedName, contactString, trimmedTypology, trimmedProject);
      const updatedLeads = [savedLead, ...leads];
      setLeads(updatedLeads);
      setFormSuccess(true);

      // Auto-sync to Google Sheets if connected
      try {
        const token = getCachedAccessToken();
        if (token) {
          const config = await fetchSheetsConfig();
          if (config && config.spreadsheetId) {
            await syncLeadsToSpreadsheet(config.spreadsheetId, updatedLeads, token);
            console.log("Lead sincronizado automaticamente com o Google Sheets!");
          }
        }
      } catch (sheetErr) {
        console.error("Erro ao sincronizar novo lead com Google Sheets automaticamente:", sheetErr);
      }
    } catch (err) {
      console.error("Erro ao salvar lead no Firebase:", err);
      setFormError("Ocorreu um erro ao enviar seus dados. Por favor, tente novamente.");
    }
  };

  // Helper actions for admin panel
  const handleAddMockLead = async () => {
    const mockNames = [
      'Geraldo Fontes Filho', 
      'Karina Mendes Silveira', 
      'Cláudia P. Marcondes', 
      'Sérgio Augusto Viana'
    ];
    const mockContacts = [
      '(27) 99124-5544', 
      'karina.mendes@gmail.com', 
      'c_marcondes@terra.com.br', 
      '(27) 98841-3311'
    ];
    const randomIdx = Math.floor(Math.random() * mockNames.length);
    
    try {
      const savedLead = await saveLeadToFirestore(mockNames[randomIdx], mockContacts[randomIdx]);
      setLeads(prev => [savedLead, ...prev]);
    } catch (err) {
      console.error("Erro ao adicionar lead mock no Firebase:", err);
    }
  };

  const handleClearLeads = async () => {
    try {
      for (const lead of leads) {
        if (lead.id) {
          await deleteLeadFromFirestore(lead.id);
        }
      }
      setLeads([]);
    } catch (err) {
      console.error("Erro ao limpar leads no Firebase:", err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteLeadFromFirestore(id);
      setLeads(prev => prev.filter(lead => lead.id !== id));
    } catch (err) {
      console.error("Erro ao deletar lead no Firebase:", err);
    }
  };

  // Motion animation presets
  const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (delay: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: delay * 0.1,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1]
      }
    })
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const faqItems = [
    {
      question: 'O que é governança patrimonial?',
      answer: 'É o cuidado integral com o seu imóvel para que ele permaneça protegido, conservado e valorizado ao longo do tempo, sem que você precise se envolver na rotina. A Locus assume essa responsabilidade por você, com a discrição e o padrão da alta hospitalidade.'
    },
    {
      question: 'Preciso morar longe para contratar a Locus Living?',
      answer: 'Não. A Locus Living é para quem valoriza tempo e tranquilidade, esteja você a mil quilômetros ou na mesma cidade. O que unifica nossos clientes é o desejo de ter um patrimônio bem cuidado sem carregar o peso da operação.'
    },
    {
      question: 'Meu imóvel precisa estar alugado?',
      answer: 'Não. A governança existe para proteger e conservar o seu bem, esteja ele reservado para uso da família, disponível para temporada ou simplesmente guardado como patrimônio. O cuidado é exatamente o mesmo.'
    },
    {
      question: 'Quando os valores serão divulgados?',
      answer: 'Em breve. Quem entrar na lista de espera agora será avisado em primeira mão e garante uma condição especial exclusiva que não estará disponível para o público geral.'
    },
    {
      question: 'Como funciona o acesso antecipado?',
      answer: 'Basta deixar seu contato na lista de espera. Você receberá a comunicação oficial antes de todo mundo, entrará com prioridade absoluta e manterá as vantagens e a condição especial exclusiva durante toda a permanência.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#3D2F22] selection:bg-[#D9C8B4] selection:text-[#3D2F22]">
      
      {/* ===================== NAV ===================== */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-[76px] flex items-center transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#FAF7F1]/95 border-b border-[#3D2F22]/10 shadow-[0_6px_30px_-22px_rgba(61,47,34,0.3)] backdrop-blur-md' 
          : 'bg-transparent border-b border-transparent'
      }`}>
        <div className="w-full max-w-[1160px] mx-auto px-6 flex items-center justify-between gap-4">
          
          {/* Brand logo */}
          <a href="#top" className="flex items-center" aria-label="Locus Living, Início">
            <Logo />
          </a>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-9" aria-label="Navegação principal">
            <a href="#o-servico" className="font-cap text-xs font-semibold tracking-wider text-[#3D2F22] hover:text-[#73573F] transition-colors relative py-1 group">
              O Serviço
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#73573F] transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#para-quem" className="font-cap text-xs font-semibold tracking-wider text-[#3D2F22] hover:text-[#73573F] transition-colors relative py-1 group">
              Para Quem
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#73573F] transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#acesso-antecipado" className="font-cap text-xs font-semibold tracking-wider text-[#3D2F22] hover:text-[#73573F] transition-colors relative py-1 group">
              Acesso Antecipado
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#73573F] transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a 
              href="https://wa.me/5527998956775" 
              target="_blank"
              rel="noopener noreferrer"
              className="font-cap text-[11px] font-bold tracking-wider uppercase bg-[#594432] text-[#FAF7F1] px-5 py-3 rounded hover:bg-[#3D2F22] hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              Falar com a Locus
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden w-10 h-10 flex flex-col justify-center items-center gap-1.5 focus:outline-none"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMenuOpen}
          >
            <span className={`block w-6 h-[2px] bg-[#3D2F22] rounded transition-all duration-350 ${
              isMenuOpen ? 'rotate-45 translate-y-[8px]' : ''
            }`} />
            <span className={`block w-6 h-[2px] bg-[#3D2F22] rounded transition-all duration-200 ${
              isMenuOpen ? 'opacity-0' : 'opacity-100'
            }`} />
            <span className={`block w-6 h-[2px] bg-[#3D2F22] rounded transition-all duration-350 ${
              isMenuOpen ? '-rotate-45 -translate-y-[8px]' : ''
            }`} />
          </button>
        </div>

        {/* Mobile Navigation Panel */}
        {isMenuOpen && (
          <div className="absolute top-[76px] left-0 right-0 bg-[#FAF7F1] border-b border-[#3D2F22]/10 py-6 px-6 shadow-xl flex flex-col gap-1 md:hidden animate-fadeUp z-30">
            <a 
              href="#o-servico" 
              onClick={() => setIsMenuOpen(false)}
              className="font-cap text-sm font-semibold tracking-wider text-[#3D2F22] py-4 border-b border-[#3D2F22]/10"
            >
              O Serviço
            </a>
            <a 
              href="#para-quem" 
              onClick={() => setIsMenuOpen(false)}
              className="font-cap text-sm font-semibold tracking-wider text-[#3D2F22] py-4 border-b border-[#3D2F22]/10"
            >
              Para Quem
            </a>
            <a 
              href="#acesso-antecipado" 
              onClick={() => setIsMenuOpen(false)}
              className="font-cap text-sm font-semibold tracking-wider text-[#3D2F22] py-4 border-b border-[#3D2F22]/10"
            >
              Acesso Antecipado
            </a>
            <a 
              href="https://wa.me/5527998956775" 
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="mt-6 font-cap text-xs font-bold tracking-wider uppercase bg-[#594432] text-[#FAF7F1] py-4 rounded text-center block"
            >
              Falar com a Locus
            </a>
          </div>
        )}
      </header>

      <main id="top">

        {/* ===================== HERO ===================== */}
        <section className="relative pt-[120px] md:pt-[150px] pb-16 md:pb-24 overflow-hidden">
          <div className="w-full max-w-[1160px] mx-auto px-6">
            <div className="flex flex-col items-center justify-center text-center">
              
              {/* Copywriting Column */}
              <div className="w-full max-w-4xl flex flex-col items-center text-center">
                <motion.span 
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  custom={0}
                  className="font-cap text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-[#73573F] uppercase mb-5 block text-center"
                >
                  Locus Living · Governança Patrimonial
                </motion.span>
                
                <motion.h1 
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  custom={1}
                  className="font-display font-medium text-4xl sm:text-5xl lg:text-6xl text-[#3D2F22] leading-[1.12] tracking-tight mb-6 max-w-[24ch] mx-auto text-center"
                >
                  Você investiu em um patrimônio. <span className="text-[#73573F] italic font-normal">Quem cuida dele quando você não pode?</span>
                </motion.h1>
 
                <motion.p 
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  custom={2}
                  className="text-[#594432] text-base sm:text-lg lg:text-xl font-light leading-relaxed mb-8 max-w-[54ch] mx-auto text-center"
                >
                  Locus Living é a governança que zela pelo seu imóvel como se fosse o nosso: protegido, conservado e sempre pronto. Você recebe de volta o que mais importa: o seu tempo e a sua paz.
                </motion.p>
 
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  custom={3}
                  className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto"
                >
                  <a 
                    href="https://forms.gle/CWKbWPZ4U97XgmRx7" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-cap text-xs font-bold tracking-wider uppercase bg-[#594432] hover:bg-[#3D2F22] text-[#FAF7F1] px-8 py-4 rounded transition-all duration-300 hover:-translate-y-0.5 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group w-full sm:w-auto"
                  >
                    Quero proteger meu patrimônio
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                  
                  <a 
                    href="#o-servico" 
                    className="font-cap text-[11px] font-semibold tracking-[0.16em] uppercase text-[#73573F] hover:text-[#3D2F22] transition-colors py-2 flex items-center justify-center gap-2 group"
                  >
                    Conheça o serviço
                    <ChevronDown className="w-4 h-4 animate-bob text-[#73573F]" />
                  </a>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* ===================== BRIDGE ===================== */}
        <section className="py-12 border-t border-b border-[#3D2F22]/10 bg-[#FAF7F1]">
          <div className="w-full max-w-[1160px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-center">
              <div className="md:col-span-5">
                <motion.h2 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-10%" }}
                  variants={fadeInUp}
                  className="font-display font-medium text-3xl sm:text-4xl text-[#3D2F22] leading-tight max-w-[15ch]"
                >
                  Um patrimônio parado não descansa.
                </motion.h2>
              </div>
              <div className="md:col-span-7">
                <motion.p 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-10%" }}
                  variants={fadeInUp}
                  custom={1}
                  className="text-[#594432] text-[16px] sm:text-lg font-light leading-relaxed max-w-[58ch]"
                >
                  A poeira que se acumula, o pequeno reparo que vira um problema grande, a distância que transforma cada detalhe em uma ligação urgente. Um imóvel sem cuidado se desgasta e rouba justamente a tranquilidade que ele deveria oferecer. A Locus existe para inverter essa conta.
                </motion.p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== SERVIÇO ===================== */}
        <section id="o-servico" className="py-20 md:py-28 bg-[#FAF7F1]">
          <div className="w-full max-w-[1160px] mx-auto px-6">
            
            {/* Section Head */}
            <div className="max-w-[70ch] mb-16">
              <motion.span 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="font-cap text-xs font-semibold tracking-[0.2em] text-[#73573F] uppercase block mb-4"
              >
                O Serviço
              </motion.span>
              <motion.h2 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                custom={1}
                className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl text-[#3D2F22] leading-tight mb-5"
              >
                Governança patrimonial do jeito que o alto padrão pede
              </motion.h2>
              <motion.p 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                custom={2}
                className="text-[#594432] text-base sm:text-lg font-light leading-relaxed"
              >
                Assumimos a responsabilidade integral pelo seu imóvel para que ele permaneça protegido, valorizado e pronto para viver ou render. Sem fricção. Sem surpresas. Sem que você precise administrar nada.
              </motion.p>
            </div>

            {/* Pillars Grid */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10%" }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {/* Pillar 1 */}
              <motion.article 
                variants={fadeInUp}
                className="bg-[#FAF7F1] border border-[#3D2F22]/13 rounded-lg p-8 hover:border-[#73573F]/45 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-11 h-11 text-[#73573F] mb-6 flex items-center justify-center">
                  <Shield className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="font-display font-semibold text-lg text-[#3D2F22] mb-3">Patrimônio protegido</h3>
                <p className="text-[#594432] text-[14px] leading-relaxed font-light">
                  Seu imóvel sob cuidado contínuo e olhar atento, blindado contra os pequenos problemas antes que virem grandes.
                </p>
              </motion.article>

              {/* Pillar 2 */}
              <motion.article 
                variants={fadeInUp}
                className="bg-[#FAF7F1] border border-[#3D2F22]/13 rounded-lg p-8 hover:border-[#73573F]/45 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-11 h-11 text-[#73573F] mb-6 flex items-center justify-center">
                  <Home className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="font-display font-semibold text-lg text-[#3D2F22] mb-3">Conservação que valoriza</h3>
                <p className="text-[#594432] text-[14px] leading-relaxed font-light">
                  Materiais nobres, acabamentos e ambientes preservados com rigor, o padrão que sustenta o valor do seu bem ao longo do tempo.
                </p>
              </motion.article>

              {/* Pillar 3 */}
              <motion.article 
                variants={fadeInUp}
                className="bg-[#FAF7F1] border border-[#3D2F22]/13 rounded-lg p-8 hover:border-[#73573F]/45 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-11 h-11 text-[#73573F] mb-6 flex items-center justify-center">
                  <Eye className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="font-display font-semibold text-lg text-[#3D2F22] mb-3">Gestão invisível</h3>
                <p className="text-[#594432] text-[14px] leading-relaxed font-light">
                  Você não gerencia crises. Nós antecipamos, resolvemos e cuidamos nos bastidores, com relatórios claros e transparência total.
                </p>
              </motion.article>

              {/* Pillar 4 */}
              <motion.article 
                variants={fadeInUp}
                className="bg-[#FAF7F1] border border-[#3D2F22]/13 rounded-lg p-8 hover:border-[#73573F]/45 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-11 h-11 text-[#73573F] mb-6 flex items-center justify-center">
                  <Clock className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="font-display font-semibold text-lg text-[#3D2F22] mb-3">Sempre pronto</h3>
                <p className="text-[#594432] text-[14px] leading-relaxed font-light">
                  Pronto para receber você, sua família ou seus hóspedes a qualquer momento, como se o tempo nunca tivesse passado.
                </p>
              </motion.article>
            </motion.div>

          </div>
        </section>

        {/* ===================== PARA QUEM ===================== */}
        <section id="para-quem" className="py-20 md:py-28 bg-[#594432] text-[#FAF7F1]">
          <div className="w-full max-w-[1160px] mx-auto px-6">
            
            {/* Section Head */}
            <div className="max-w-[64ch] mb-16">
              <span className="font-cap text-xs font-semibold tracking-[0.2em] text-[#D9C8B4] uppercase block mb-4">
                Para Quem
              </span>
              <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl text-[#FAF7F1] leading-tight mb-5">
                Feito para quem tem patrimônio e não tem tempo a perder
              </h2>
              <p className="text-[#D9C8B4] text-base sm:text-lg font-light leading-relaxed">
                Se o seu imóvel é conquista, investimento ou refúgio, e merece cuidado o ano inteiro, a Locus Living foi desenhada para você.
              </p>
            </div>

            {/* Grid of Segments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#FAF7F1]/15 rounded-lg overflow-hidden bg-[#FAF7F1]/5 gap-px">
              
              <article className="bg-[#594432] p-8 hover:bg-[#4d3a2a] transition-colors duration-300">
                <span className="font-logo text-xl text-[#D9C8B4] block mb-4 font-semibold">01</span>
                <h3 className="font-display text-lg text-[#FAF7F1] mb-2 font-medium">Investidores de alto padrão</h3>
                <p className="text-[#D9C8B4] text-sm leading-relaxed font-light">
                  Quem enxerga o imóvel como ativo e quer rentabilidade de longo prazo sem virar refém da rotina e da operação cotidiana.
                </p>
              </article>

              <article className="bg-[#594432] p-8 hover:bg-[#4d3a2a] transition-colors duration-300">
                <span className="font-logo text-xl text-[#D9C8B4] block mb-4 font-semibold">02</span>
                <h3 className="font-display text-lg text-[#FAF7F1] mb-2 font-medium">Proprietários à distância</h3>
                <p className="text-[#D9C8B4] text-sm leading-relaxed font-light">
                  Quem vive ou trabalha longe e precisa de uma governança profissional, de extrema confiança, zelando pelo bem localmente.
                </p>
              </article>

              <article className="bg-[#594432] p-8 hover:bg-[#4d3a2a] transition-colors duration-300">
                <span className="font-logo text-xl text-[#D9C8B4] block mb-4 font-semibold">03</span>
                <h3 className="font-display text-lg text-[#FAF7F1] mb-2 font-medium">Segundo imóvel e temporada</h3>
                <p className="text-[#D9C8B4] text-sm leading-relaxed font-light">
                  A casa de praia, o refúgio das montanhas ou o apartamento de uso esporádico que merece carinho permanente mesmo vazio.
                </p>
              </article>

              <article className="bg-[#594432] p-8 hover:bg-[#4d3a2a] transition-colors duration-300">
                <span className="font-logo text-xl text-[#D9C8B4] block mb-4 font-semibold">04</span>
                <h3 className="font-display text-lg text-[#FAF7F1] mb-2 font-medium">Quem valoriza o próprio tempo</h3>
                <p className="text-[#D9C8B4] text-sm leading-relaxed font-light">
                  Quem já gerencia múltiplas frentes de negócios e família, e não quer novos problemas ou dores de cabeça na agenda.
                </p>
              </article>

            </div>

          </div>
        </section>

        {/* ===================== PROPÓSITO (MANIFESTO) ===================== */}
        <section className="py-24 bg-[#FAF7F1] relative">
          <div className="w-full max-w-[760px] mx-auto px-6 text-center">
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10%" }}
              variants={fadeInUp}
              className="w-11 h-16 text-[#73573F] mx-auto mb-8"
            >
              <KeyIcon />
            </motion.div>

            <motion.blockquote 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10%" }}
              variants={fadeInUp}
              custom={1}
              className="font-display text-2xl sm:text-3.5xl lg:text-4xl text-[#3D2F22] leading-snug tracking-tight mb-8"
            >
              Nós não vendemos administração de imóveis. <span className="text-[#73573F] italic font-normal">Devolvemos tempo, paz e liberdade.</span>
            </motion.blockquote>

            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10%" }}
              variants={fadeInUp}
              custom={2}
              className="text-[#594432] text-[16px] sm:text-lg font-light leading-relaxed mb-10 max-w-[60ch] mx-auto"
            >
              A Locus enxerga cada imóvel como um patrimônio construído com esforço, sonhos e expectativa de futuro. Por isso cuidamos com a dedicação de um artesão: com precisão, respeito e discrição absoluta. Enquanto você vive o que verdadeiramente importa (a família, o descanso, os próximos projetos), nós cuidamos de todo o resto.
            </motion.p>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10%" }}
              variants={fadeInUp}
              custom={3}
              className="font-cap text-xs font-bold tracking-widest text-[#73573F]"
            >
              Diogo Oliveira Santos &amp; Jennifer Stefani Nascimento Soares
              <span className="block font-normal tracking-[0.24em] text-[9px] uppercase mt-2.5 opacity-80 text-[#73573F]">
                Idealizadores da Locus
              </span>
            </motion.div>

          </div>
        </section>

        {/* ===================== ACESSO ANTECIPADO ===================== */}
        <section 
          id="acesso-antecipado" 
          className="py-24 bg-[#3D2F22] text-[#FAF7F1] relative overflow-hidden"
        >
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,_rgba(89,68,50,0.55),_transparent_60%)] pointer-events-none" />
          
          <div className="w-full max-w-[1160px] mx-auto px-6 relative z-10">
            
            {/* Section Head */}
            <div className="text-center max-w-[64ch] mx-auto mb-16">
              <span className="font-cap text-xs font-semibold tracking-[0.2em] text-[#D9C8B4] uppercase block mb-3">
                Acesso Antecipado
              </span>
              <h2 className="font-display font-medium text-3xl sm:text-4xl text-[#FAF7F1] leading-tight mb-4">
                Os valores serão revelados em breve
              </h2>
              <p className="text-[#D9C8B4] text-base sm:text-lg font-light">
                E os primeiros membros que entrarem na lista de espera terão condições que não vão se repetir.
              </p>
            </div>

            {/* Interactive Reveal Card */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              onViewportEnter={() => setIsEarlyUnlocked(true)}
              viewport={{ once: true, margin: "-10%" }}
              variants={fadeInUp}
              className="max-w-[920px] mx-auto grid grid-cols-1 md:grid-cols-2 rounded-lg border border-[#FAF7F1]/15 overflow-hidden bg-[#594432]/30 shadow-2xl"
            >
              
              {/* Left Column (Condition of Founder) */}
              <div className="p-8 sm:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#FAF7F1]/15">
                
                {/* Lock Animation Indicator */}
                <div className="flex items-center gap-5 mb-8">
                  <span className="relative w-16 h-16 rounded-full border border-[#FAF7F1]/15 flex items-center justify-center bg-[#FAF7F1]/5 overflow-hidden">
                    {/* Ring animation triggered when section is visible */}
                    {isEarlyUnlocked && (
                      <span className="absolute inset-0 rounded-full border border-[#D9C8B4] animate-ring pointer-events-none" />
                    )}
                    <span className={`w-6 h-10 text-[#D9C8B4] transform transition-transform duration-[1.2s] cubic-bezier(.22,.61,.36,1) ${
                      isEarlyUnlocked ? 'rotate-90' : 'rotate-0'
                    }`}>
                      <KeyIcon />
                    </span>
                  </span>
                  <div>
                    <span className="font-cap text-[10px] font-bold tracking-widest text-[#D9C8B4] uppercase block mb-0.5">
                      Condição Especial
                    </span>
                    <span className="font-display text-lg text-[#FAF7F1]">
                      Acesso privilegiado antes do lançamento
                    </span>
                  </div>
                </div>

                {/* Shimmer Price Veil */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-display text-2xl text-[#D9C8B4]">R$</span>
                    {/* Pulsing Dots representing masked value */}
                    <span className="w-32 h-7 rounded bg-gradient-to-r from-[#FAF7F1]/10 via-[#FAF7F1]/20 to-[#FAF7F1]/10 animate-shimmer" />
                  </div>
                  <span className="font-cap text-[10px] font-semibold tracking-widest uppercase text-[#D9C8B4]/80">
                    Em breve · Você será o primeiro a saber
                  </span>
                </div>

                {/* Benefits list */}
                <ul className="space-y-4">
                  <li className="flex gap-3 text-sm font-light text-[#FAF7F1]/95">
                    <Check className="w-5 h-5 text-[#D9C8B4] flex-shrink-0 mt-0.5" />
                    <span>Garantia vitalícia de atendimento e benefícios exclusivos associados a esta condição especial.</span>
                  </li>
                  <li className="flex gap-3 text-sm font-light text-[#FAF7F1]/95">
                    <Check className="w-5 h-5 text-[#D9C8B4] flex-shrink-0 mt-0.5" />
                    <span>Prioridade máxima no agendamento de vistorias técnicas e setup.</span>
                  </li>
                  <li className="flex gap-3 text-sm font-light text-[#FAF7F1]/95">
                    <Check className="w-5 h-5 text-[#D9C8B4] flex-shrink-0 mt-0.5" />
                    <span>Acesso a vantagens e amenities exclusivas reservadas só para o primeiro grupo.</span>
                  </li>
                </ul>
              </div>

              {/* Right Column (Registration Form / Success Feedback) */}
              <div className="p-8 sm:p-12 bg-[#FAF7F1]/5 flex flex-col justify-center min-h-[420px]">
                {!formSuccess ? (
                  /* Form Wrapper */
                  <div className="space-y-5">
                    <h3 className="font-display text-xl text-[#FAF7F1] font-medium">
                      Garanta sua condição especial
                    </h3>
                    <p className="text-[#D9C8B4] text-xs sm:text-sm font-light leading-relaxed mb-6">
                      Deixe seus dados de contato preferidos. Assim que definirmos o cronograma oficial de expansão, entraremos em contato pessoalmente.
                    </p>

                    <div className="space-y-4">
                      {/* Name input */}
                      <div>
                        <label htmlFor="fName" className="block font-cap text-[10px] font-semibold tracking-widest text-[#D9C8B4] uppercase mb-2">
                          Nome
                        </label>
                        <input 
                          type="text" 
                          id="fName" 
                          value={formName}
                          onChange={(e) => {
                            setFormName(e.target.value);
                            if (formError) setFormError('');
                          }}
                          placeholder="Seu nome completo" 
                          className="w-full px-4 py-3 rounded text-[#3D2F22] bg-[#FAF7F1] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#D9C8B4] transition-all text-sm font-sans"
                        />
                      </div>

                      {/* Typology input */}
                      <div>
                        <label htmlFor="fTypology" className="block font-cap text-[10px] font-semibold tracking-widest text-[#D9C8B4] uppercase mb-2">
                          Tipologia
                        </label>
                        <input 
                          type="text" 
                          id="fTypology" 
                          value={formTypology}
                          onChange={(e) => {
                            setFormTypology(e.target.value);
                            if (formError) setFormError('');
                          }}
                          placeholder="Ex: Apartamento, Cobertura, Estúdio" 
                          className="w-full px-4 py-3 rounded text-[#3D2F22] bg-[#FAF7F1] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#D9C8B4] transition-all text-sm font-sans"
                        />
                      </div>

                      {/* Project input */}
                      <div>
                        <label htmlFor="fProject" className="block font-cap text-[10px] font-semibold tracking-widest text-[#D9C8B4] uppercase mb-2">
                          Empreendimento
                        </label>
                        <input 
                          type="text" 
                          id="fProject" 
                          value={formProject}
                          onChange={(e) => {
                            setFormProject(e.target.value);
                            if (formError) setFormError('');
                          }}
                          placeholder="Nome do condomínio ou prédio" 
                          className="w-full px-4 py-3 rounded text-[#3D2F22] bg-[#FAF7F1] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#D9C8B4] transition-all text-sm font-sans"
                        />
                      </div>
                    </div>

                    {/* Validation Error Message */}
                    {formError && (
                      <p className="text-rose-300 text-xs font-medium font-sans flex items-center gap-1.5 mt-2 animate-fadeUp">
                        {formError}
                      </p>
                    )}

                    <button 
                      onClick={handleFormSubmit}
                      className="w-full py-4 mt-2 bg-[#D9C8B4] text-[#3D2F22] hover:bg-[#FAF7F1] font-bold font-cap text-xs tracking-wider uppercase rounded transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      Quero minha condição especial
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <p className="text-[10px] text-[#D9C8B4]/70 leading-relaxed font-sans pt-1">
                      Sem obrigações. Respeitamos sua privacidade e usaremos seus dados exclusivamente para notificar sobre sua elegibilidade à condição especial.
                    </p>
                  </div>
                ) : (
                  /* Success Feedback Wrapper */
                  <div className="text-center py-6 animate-fadeUp flex flex-col items-center">
                    <span className="w-16 h-16 rounded-full border-2 border-[#D9C8B4] flex items-center justify-center mb-6 text-[#D9C8B4]">
                      <Check className="w-8 h-8 stroke-[2.5]" />
                    </span>
                    <h3 className="font-display text-2xl text-[#FAF7F1] mb-3 font-semibold">
                      Seu lugar está reservado.
                    </h3>
                    <p className="text-[#D9C8B4] text-sm leading-relaxed max-w-[34ch] font-light">
                      Obrigado pelo seu interesse! Você será um dos primeiros a receber a confirmação dos valores, com a sua condição especial integralmente resguardada.
                    </p>
                    <button 
                      onClick={() => {
                        setFormSuccess(false);
                        setFormName('');
                        setFormTypology('');
                        setFormProject('');
                      }}
                      className="mt-8 text-xs font-cap tracking-wider text-[#D9C8B4] underline hover:text-[#FAF7F1] transition-colors"
                    >
                      Cadastrar outra condição especial
                    </button>
                  </div>
                )}
              </div>

            </motion.div>

          </div>
        </section>

        {/* ===================== FAQ ===================== */}
        <section className="py-20 md:py-28 bg-[#FAF7F1]">
          <div className="w-full max-w-[1160px] mx-auto px-6">
            
            {/* Section Head */}
            <div className="max-w-[60ch] mb-12">
              <span className="font-cap text-xs font-semibold tracking-[0.2em] text-[#73573F] uppercase block mb-4">
                Perguntas frequentes
              </span>
              <h2 className="font-display font-medium text-3xl sm:text-4xl text-[#3D2F22] leading-tight">
                Antes de você decidir
              </h2>
            </div>

            {/* Interactive FAQ list component */}
            <FAQAccordion items={faqItems} />

          </div>
        </section>

        {/* ===================== CTA FINAL ===================== */}
        <section className="py-24 bg-[#594432] text-[#FAF7F1] text-center relative overflow-hidden">
          <div className="w-full max-w-[720px] mx-auto px-6 relative z-10">
            <h2 className="font-display font-medium text-3xl sm:text-4.5xl lg:text-5xl text-[#FAF7F1] leading-tight mb-6">
              Seu patrimônio merece esse cuidado. E você merece o seu tempo de volta.
            </h2>
            <p className="text-[#D9C8B4] text-base sm:text-lg font-light leading-relaxed mb-8 max-w-[52ch] mx-auto">
              Dê o primeiro passo. Garanta a sua condição especial e deixe o restante da preocupação com a inteligência operacional da Locus.
            </p>
            <a 
              href="https://wa.me/5527998956775" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-cap text-xs font-bold tracking-wider uppercase border border-[#D9C8B4] text-[#FAF7F1] hover:bg-[#D9C8B4] hover:text-[#3D2F22] px-8 py-4 rounded transition-all duration-300 hover:-translate-y-0.5 group"
            >
              Falar com a Locus
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </section>

      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-[#3D2F22] text-[#D9C8B4] py-16 border-t border-[#FAF7F1]/5">
        <div className="w-full max-w-[1160px] mx-auto px-6">
          
          {/* Top Footer Block */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 pb-12 border-b border-[#FAF7F1]/10 items-start">
            
            {/* Branding area */}
            <div className="lg:col-span-5 flex flex-col items-start">
              <a href="#top" className="flex items-center mb-5" aria-label="Locus Living, Início">
                <Logo light />
              </a>
              <p className="font-display text-lg text-[#FAF7F1] mt-3 max-w-[26ch] leading-snug">
                Tempo para viver. Nós cuidamos do resto.
              </p>
            </div>

            {/* Links Lists Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
              
              {/* Col 1 */}
              <div>
                <h4 className="font-cap text-[10px] font-bold tracking-[0.2em] text-[#FAF7F1] uppercase mb-5 opacity-70">
                  Navegar
                </h4>
                <ul className="space-y-3">
                  <li>
                    <a href="#o-servico" className="text-sm font-light hover:text-[#FAF7F1] transition-colors">
                      O Serviço
                    </a>
                  </li>
                  <li>
                    <a href="#para-quem" className="text-sm font-light hover:text-[#FAF7F1] transition-colors">
                      Para Quem
                    </a>
                  </li>
                  <li>
                    <a href="#acesso-antecipado" className="text-sm font-light hover:text-[#FAF7F1] transition-colors">
                      Acesso Antecipado
                    </a>
                  </li>
                </ul>
              </div>

              {/* Col 2 */}
              <div>
                <h4 className="font-cap text-[10px] font-bold tracking-[0.2em] text-[#FAF7F1] uppercase mb-5 opacity-70">
                  Contato
                </h4>
                <ul className="space-y-3">
                  <li>
                    <a 
                      href="https://instagram.com/locushost" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm font-light hover:text-[#FAF7F1] transition-colors flex items-center gap-2"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://wa.me/5527998956775" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm font-light hover:text-[#FAF7F1] transition-colors flex items-center gap-2"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </li>
                </ul>
              </div>

              {/* Col 3 */}
              <div>
                <h4 className="font-cap text-[10px] font-bold tracking-[0.2em] text-[#FAF7F1] uppercase mb-5 opacity-70">
                  Onde estamos
                </h4>
                <p className="text-sm font-light text-[#D9C8B4] leading-relaxed">
                  Guarapari · Espírito Santo <br />
                  Brasil
                </p>
              </div>

            </div>

          </div>

          {/* Bottom Footer Block */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="font-cap text-[10px] text-[#D9C8B4]/70">
              &copy; {new Date().getFullYear()} Locus Gestão Imobiliária. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <span className="font-cap text-[10px] text-[#D9C8B4]/70">
                Governança Patrimonial · Locus Living
              </span>
              <span className="text-[#D9C8B4]/30">·</span>
              <button
                onClick={() => setIsAdminOpen(true)}
                className="font-cap text-[10px] text-[#D9C8B4]/70 hover:text-[#FAF7F1] underline cursor-pointer transition-colors"
              >
                Painel do Administrador
              </button>
            </div>
          </div>

        </div>
      </footer>

      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        leads={leads}
        onAddMockLead={handleAddMockLead}
        onClearLeads={handleClearLeads}
        onDeleteLead={handleDeleteLead}
      />

    </div>
  );
}

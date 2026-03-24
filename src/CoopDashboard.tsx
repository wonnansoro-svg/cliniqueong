import React, { useState } from 'react';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, ShieldPlus, Stethoscope as GenMed,
  Scan, Search, Trash2, AlertCircle, ShoppingCart, Camera,
  Clock, CheckCircle2, Thermometer, Weight, HeartPulse
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// --- TYPES DE DONNÉES ---
type Role = 'Responsable' | 'Medecin' | 'Infirmier' | 'Caissiere' | 'Accueil';
type ServiceType = 'PED' | 'GEN' | 'MAT' | 'CHIR';

interface Patient {
  id: string;
  ticket: string;
  nom: string;
  service: ServiceType;
  age?: number;
  sexe?: 'M' | 'F';
  statut: 'Accueil' | 'Triage' | 'Consultation' | 'Pharmacie' | 'Caisse' | 'Terminé';
  heureArrivee: string;
}

interface Medicament {
  id: string;
  codeBarre: string;
  nom: string;
  stock: number;
  prix: number;
}

interface LignePanier {
  medicament: Medicament;
  quantite: number;
}

const ClinicDashboard: React.FC = () => {
  // --- ÉTATS GLOBAUX ---
  const [currentUserRole, setCurrentUserRole] = useState<Role>('Responsable');
  const [activeTab, setActiveTab] = useState<'accueil' | 'triage' | 'medecin' | 'pharmacie' | 'caisse' | 'admin'>('accueil');
  
  // Base de données simulée (Patients et Médicaments)
  const [patients, setPatients] = useState<Patient[]>([
    { id: 'DOS-0012', ticket: 'GEN-001', nom: 'Kouassi Aya', age: 34, sexe: 'F', service: 'GEN', statut: 'Triage', heureArrivee: '08:15' },
    { id: 'DOS-0045', ticket: 'PED-001', nom: 'Traoré Seydou', age: 8, sexe: 'M', service: 'PED', statut: 'Triage', heureArrivee: '08:45' },
  ]);
  
  const [medicaments] = useState<Medicament[]>([
    { id: 'M1', codeBarre: '123456789', nom: 'Paracétamol 500mg', stock: 150, prix: 1500 },
    { id: 'M2', codeBarre: '987654321', nom: 'Amoxicilline Sachet', stock: 5, prix: 3500 },
    { id: 'M3', codeBarre: '111222333', nom: 'Sirop Toux Enfant', stock: 42, prix: 2500 },
  ]);

  // --- ÉTATS ACCUEIL ---
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauService, setNouveauService] = useState<ServiceType>('GEN');
  const [ticketGenere, setTicketGenere] = useState<Patient | null>(null);

  // --- ÉTATS TRIAGE (Infirmerie) ---
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [tensionSys, setTensionSys] = useState<number | ''>('');
  const [tensionDia, setTensionDia] = useState<number | ''>('');
  const [temperature, setTemperature] = useState<number | ''>('');
  const [poids, setPoids] = useState<number | ''>('');
  const isTensionHigh = (tensionSys !== '' && tensionSys >= 140) || (tensionDia !== '' && tensionDia >= 90);

  // --- ÉTATS PHARMACIE ---
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [modeScanner, setModeScanner] = useState(false);
  const [messageErreur, setMessageErreur] = useState('');

  // --- FONCTIONS ACCUEIL ---
  const genererTicket = () => {
    if (!nouveauNom.trim()) return;
    const countService = patients.filter(p => p.service === nouveauService).length + 1;
    const numeroFormatte = countService.toString().padStart(3, '0');
    
    const newPatient: Patient = {
      id: `DOS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      ticket: `${nouveauService}-${numeroFormatte}`,
      nom: nouveauNom,
      service: nouveauService,
      statut: 'Triage',
      heureArrivee: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setPatients([...patients, newPatient]);
    setTicketGenere(newPatient);
    setNouveauNom('');
  };

  // --- FONCTIONS PHARMACIE ---
  const ajouterAuPanier = (codeBarre: string) => {
    setMessageErreur('');
    const med = medicaments.find(m => m.codeBarre === codeBarre);
    
    if (!med) {
      setMessageErreur('Médicament introuvable ou code erroné.');
      return;
    }
    if (med.stock <= 0) {
      setMessageErreur(`Rupture de stock pour : ${med.nom}`);
      return;
    }

    const ligneExistante = panier.find(l => l.medicament.id === med.id);
    if (ligneExistante) {
      if (ligneExistante.quantite >= med.stock) {
        setMessageErreur('Stock maximum atteint pour ce produit.');
        return;
      }
      setPanier(panier.map(l => l.medicament.id === med.id ? { ...l, quantite: l.quantite + 1 } : l));
    } else {
      setPanier([...panier, { medicament: med, quantite: 1 }]);
    }
    setCodeSaisi('');
  };

  const simulerScanCamera = () => {
    setModeScanner(true);
    setTimeout(() => {
      ajouterAuPanier('123456789'); // Simule le scan
      setModeScanner(false);
    }, 2000);
  };

  const totalPanier = panier.reduce((total, ligne) => total + (ligne.medicament.prix * ligne.quantite), 0);

  // --- GESTION DES ACCÈS ---
  const canSee = (tab: string) => {
    if (currentUserRole === 'Responsable') return true;
    if (currentUserRole === 'Accueil' && tab === 'accueil') return true;
    if (currentUserRole === 'Infirmier' && tab === 'triage') return true;
    if (currentUserRole === 'Medecin' && tab === 'medecin') return true;
    if (currentUserRole === 'Caissiere' && tab === 'pharmacie') return true;
    return false;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* --- BANDEAU HAUT --- */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <ShieldPlus size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-wide hidden sm:block">ONG SANTE PLUS</h1>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400 pl-2">Connecté:</span>
          <select 
            className="bg-slate-700 text-white border-none rounded-lg text-sm p-2 focus:ring-0 cursor-pointer outline-none"
            value={currentUserRole}
            onChange={(e) => {
              const newRole = e.target.value as Role;
              setCurrentUserRole(newRole);
              // Redirection automatique selon le rôle
              if (newRole === 'Caissiere') setActiveTab('pharmacie');
              else if (newRole === 'Infirmier') setActiveTab('triage');
              else if (newRole === 'Medecin') setActiveTab('medecin');
              else setActiveTab('accueil');
            }}
          >
            <option value="Responsable">Responsable (Admin)</option>
            <option value="Accueil">Secrétaire Accueil</option>
            <option value="Infirmier">Infirmier (Triage)</option>
            <option value="Medecin">Médecin</option>
            <option value="Caissiere">Caissière Pharmacie</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- MENU LATÉRAL --- */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 shadow-sm z-0">
          <nav className="flex flex-col gap-2 px-4">
            {canSee('accueil') && (
              <button onClick={() => setActiveTab('accueil')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Réception</button>
            )}
            {canSee('triage') && (
              <button onClick={() => setActiveTab('triage')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={20} /> Infirmerie</button>
            )}
            {canSee('medecin') && (
              <button onClick={() => setActiveTab('medecin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Stethoscope size={20} /> Consultation</button>
            )}
            {canSee('pharmacie') && (
              <button onClick={() => setActiveTab('pharmacie')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Pill size={20} /> Pharmacie & Caisse</button>
            )}
          </nav>
        </aside>

        {/* --- ZONE PRINCIPALE --- */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50 relative">
          
          {/* ========================================== */}
          {/* MODULE 1 : ACCUEIL (LE CODE PARFAIT INTACT)  */}
          {/* ========================================== */}
          {activeTab === 'accueil' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Accueil & Enregistrement</h2>
              <p className="text-slate-500 mb-8">Génération automatique des dossiers et tickets d'attente</p>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet du patient</label>
                    <input 
                      type="text" 
                      value={nouveauNom}
                      onChange={(e) => setNouveauNom(e.target.value)}
                      placeholder="Ex: Koffi Emmanuel"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Service demandé</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setNouveauService('GEN')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'GEN' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <GenMed size={18}/> Général
                      </button>
                      <button onClick={() => setNouveauService('PED')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'PED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Baby size={18}/> Pédiatrie
                      </button>
                      <button onClick={() => setNouveauService('MAT')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'MAT' ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Heart size={18}/> Maternité
                      </button>
                      <button onClick={() => setNouveauService('CHIR')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'CHIR' ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Activity size={18}/> Chirurgie
                      </button>
                    </div>
                  </div>

                </div>

                <button 
                  onClick={genererTicket}
                  disabled={!nouveauNom.trim()}
                  className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <QrCode size={20} /> Générer le Dossier et le Ticket
                </button>
              </div>

              {/* MODAL TICKET GÉNÉRÉ (INTACT) */}
              {ticketGenere && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                    
                    <div className="bg-slate-900 text-white text-center p-6 pb-8 rounded-b-[2rem] shadow-inner relative">
                      <p className="text-slate-300 text-sm font-medium uppercase tracking-widest mb-1">Votre Numéro</p>
                      <h1 className="text-5xl font-black tracking-tighter">{ticketGenere.ticket}</h1>
                    </div>

                    <div className="p-8 text-center -mt-6">
                      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 mx-auto inline-block border border-slate-100">
                        <QRCodeSVG value={ticketGenere.id} size={140} level="H" />
                      </div>
                      
                      <h2 className="text-xl font-bold text-slate-800">{ticketGenere.nom}</h2>
                      <p className="text-slate-500 mt-1">Dossier: <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded">{ticketGenere.id}</span></p>
                      
                      <div className="mt-6 flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-left">
                          <p className="text-xs text-blue-600/70 font-bold uppercase">Prochaine étape</p>
                          <p className="font-bold text-blue-800">Salle de Triage</p>
                        </div>
                        <Activity className="text-blue-500" size={24} />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
                      <button onClick={() => setTicketGenere(null)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-100">Fermer</button>
                      <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                        <Printer size={18} /> Imprimer
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 2 : INFIRMERIE / TRIAGE             */}
          {/* ========================================== */}
          {activeTab === 'triage' && (
             <div className="h-full flex flex-col">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Infirmerie - Triage</h2>
                  <p className="text-slate-500 mt-1">Saisie des constantes vitales des patients</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                {/* Liste des patients */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-blue-500"/> Patients en attente
                  </h3>
                  <div className="flex flex-col gap-3">
                    {patients.filter(p => p.statut === 'Triage').map(patient => (
                      <div 
                        key={patient.id} 
                        onClick={() => setSelectedPatient(patient)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${selectedPatient?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">{patient.nom}</span>
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{patient.ticket}</span>
                        </div>
                        <p className="text-sm text-slate-500">Dossier: {patient.id} • Arrivé à {patient.heureArrivee}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulaire des constantes */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-y-auto">
                  {selectedPatient ? (
                    <>
                      <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">Patient: {selectedPatient.nom}</h3>
                          <p className="text-slate-500">Prise des constantes</p>
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                          <Activity size={18}/> Phase de Triage
                        </div>
                      </div>

                      {isTensionHigh && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mb-6 animate-pulse">
                          <AlertCircle className="text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold">Alerte Hypertension Détectée</h4>
                            <p className="text-sm mt-1 text-red-600/80">La tension artérielle du patient est élevée. Un marquage d'urgence sera ajouté.</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            <HeartPulse size={16} className="text-rose-500"/> Tension Artérielle
                          </label>
                          <div className="flex items-center gap-3">
                            <input type="number" value={tensionSys} onChange={(e) => setTensionSys(e.target.value === '' ? '' : Number(e.target.value))} className={`w-full p-3 border rounded-lg outline-none ${isTensionHigh ? 'border-red-300 bg-red-50 text-red-700 font-bold' : 'border-slate-200'}`} placeholder="Sys (120)"/>
                            <span className="text-slate-400 text-xl font-light">/</span>
                            <input type="number" value={tensionDia} onChange={(e) => setTensionDia(e.target.value === '' ? '' : Number(e.target.value))} className={`w-full p-3 border rounded-lg outline-none ${isTensionHigh ? 'border-red-300 bg-red-50 text-red-700 font-bold' : 'border-slate-200'}`} placeholder="Dia (80)"/>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3"><Thermometer size={16} className="text-orange-500"/> Température (°C)</label>
                          <input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 border border-slate-200 rounded-lg outline-none"/>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3"><Weight size={16} className="text-emerald-500"/> Poids (kg)</label>
                          <input type="number" value={poids} onChange={(e) => setPoids(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 border border-slate-200 rounded-lg outline-none"/>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-end">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                          <CheckCircle2 size={20} /> Envoyer au médecin
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Activity size={48} className="mb-4 opacity-20" />
                      <p>Sélectionnez un patient pour commencer le triage.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 3 : PHARMACIE                       */}
          {/* ========================================== */}
          {activeTab === 'pharmacie' && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Caisse Pharmacie</h2>
                  <p className="text-slate-500 mt-1">Scanner les médicaments et facturer</p>
                </div>
                {currentUserRole === 'Responsable' && (
                  <button className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                    <Settings size={18} /> Gérer les stocks
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                
                {/* Colonne Gauche : Le Scanner */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                  
                  {/* Zone Caméra Simulée */}
                  <div className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-all ${modeScanner ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}>
                    {modeScanner ? (
                      <>
                        <Scan className="text-blue-500 w-16 h-16 animate-pulse mb-4" />
                        <p className="text-blue-700 font-bold text-center">Recherche de code-barres...<br/><span className="text-xs font-normal">Veuillez patienter</span></p>
                      </>
                    ) : (
                      <>
                        <Camera className="text-slate-400 w-16 h-16 mb-4" />
                        <button onClick={simulerScanCamera} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-blue-700">Ouvrir Caméra</button>
                      </>
                    )}
                  </div>

                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs text-slate-400 font-bold uppercase">OU DOUCHETTE USB</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  {/* Saisie Manuelle / Douchette */}
                  <form onSubmit={(e) => { e.preventDefault(); ajouterAuPanier(codeSaisi); }} className="relative">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      value={codeSaisi}
                      onChange={(e) => setCodeSaisi(e.target.value)}
                      placeholder="Code (ex: 123456789)"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                    <button type="submit" className="hidden">Ajouter</button>
                  </form>

                  {messageErreur && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg flex gap-2 items-start text-sm font-medium">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" /> {messageErreur}
                    </div>
                  )}

                  <div className="mt-auto pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">Codes pour tester :</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded font-mono cursor-pointer hover:bg-slate-200" onClick={() => setCodeSaisi('123456789')}>123456789 (Para)</span>
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded font-mono cursor-pointer hover:bg-slate-200" onClick={() => setCodeSaisi('987654321')}>987654321 (Amox)</span>
                    </div>
                  </div>
                </div>

                {/* Colonne Droite : Le Ticket de Caisse */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><ShoppingCart size={20}/> Panier du patient</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{panier.length} article(s)</span>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                    {panier.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <Scan size={64} className="mb-4 opacity-20" />
                        <p className="text-slate-500">Scannez un produit pour l'ajouter au panier</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {panier.map((ligne, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-800">{ligne.medicament.nom}</h4>
                              <p className="text-xs text-slate-400 font-mono mt-1">Ref: {ligne.medicament.codeBarre}</p>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-xs text-slate-400">Qté</p>
                                <p className="font-bold text-slate-800">x{ligne.quantite}</p>
                              </div>
                              <div className="text-right w-24">
                                <p className="text-xs text-slate-400">Prix</p>
                                <p className="font-bold text-blue-600">{(ligne.medicament.prix * ligne.quantite).toLocaleString()} FCFA</p>
                              </div>
                              <button 
                                onClick={() => setPanier(panier.filter(l => l.medicament.id !== ligne.medicament.id))}
                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-slate-900 text-white rounded-t-3xl mt-auto">
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-slate-400 font-medium">Net à payer</p>
                      <p className="text-4xl font-black text-emerald-400">{totalPanier.toLocaleString()} <span className="text-xl text-emerald-600">FCFA</span></p>
                    </div>
                    <button 
                      disabled={panier.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Printer size={20} /> Imprimer le reçu et Encaisser
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VUE TEMPORAIRE (Médecin) */}
          {activeTab === 'medecin' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Stethoscope size={48} className="mb-4 opacity-20" />
              <h2 className="text-2xl font-bold text-slate-600 mb-2">Consultation Médicale</h2>
              <p>Ce module sera développé à la prochaine étape.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ClinicDashboard;
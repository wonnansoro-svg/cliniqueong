import React, { useState } from 'react';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, ShieldPlus, Stethoscope as GenMed,
  Scan, Search, Trash2, AlertCircle, ShoppingCart, Camera,
  Clock, CheckCircle2, Thermometer, Weight, HeartPulse,
  FileText, PlusCircle, Check,
  BarChart3, Package, TrendingUp, AlertTriangle, Plus,
  Lock, UserPlus, LogOut, Save, X, FileBarChart, Ban
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// --- TYPES DE DONNÉES ---
type Role = 'Responsable' | 'Medecin' | 'Infirmier' | 'Caissiere' | 'Accueil';
type ServiceType = 'PED' | 'GEN' | 'MAT' | 'CHIR';

interface User { id: string; username: string; mdp: string; role: Role; nomComplet: string; }
interface ConstantesVitales { sys: number; dia: number; temp: number; poids: number; }
interface Medicament { id: string; codeBarre: string; nom: string; stock: number; prix: number; }
interface LignePanier { medicament: Medicament; quantite: number; }
interface RapportVente { id: string; patientNom: string; montant: number; heure: string; }

interface Patient {
  id: string; ticket: string; nom: string; service: ServiceType;
  statut: 'Accueil' | 'Triage' | 'Consultation' | 'Pharmacie' | 'Terminé';
  heureArrivee: string; constantes?: ConstantesVitales; ordonnance?: Medicament[];
}

const ClinicDashboard: React.FC = () => {
  // --- ÉTATS GLOBAUX & AUTHENTIFICATION ---
  const [utilisateurs, setUtilisateurs] = useState<User[]>([
    { id: 'U1', username: 'admin', mdp: '1234', role: 'Responsable', nomComplet: 'Directeur Général' },
    { id: 'U2', username: 'medecin', mdp: '1234', role: 'Medecin', nomComplet: 'Dr. Koffi' },
    { id: 'U3', username: 'infirmier', mdp: '1234', role: 'Infirmier', nomComplet: 'Inf. Traoré' },
    { id: 'U4', username: 'caisse', mdp: '1234', role: 'Caissiere', nomComplet: 'Caisse Principale' },
    { id: 'U5', username: 'accueil', mdp: '1234', role: 'Accueil', nomComplet: 'Secrétariat' },
  ]);

  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'accueil' | 'triage' | 'medecin' | 'pharmacie' | 'admin'>('accueil');
  const [adminSubTab, setAdminSubTab] = useState<'stats' | 'stock' | 'personnel' | 'rapports'>('stats');
  
  // --- BASE DE DONNÉES SIMULÉE ---
  const [patients, setPatients] = useState<Patient[]>([
    { id: 'DOS-0012', ticket: 'GEN-001', nom: 'Kouassi Aya', service: 'GEN', statut: 'Triage', heureArrivee: '08:15' },
    { id: 'DOS-0045', ticket: 'PED-001', nom: 'Traoré Seydou', service: 'PED', statut: 'Consultation', heureArrivee: '08:45', constantes: { sys: 145, dia: 95, temp: 38.2, poids: 25 } },
  ]);
  
  const [medicaments, setMedicaments] = useState<Medicament[]>([
    { id: 'M1', codeBarre: '123456789', nom: 'Paracétamol 500mg', stock: 150, prix: 1500 },
    { id: 'M2', codeBarre: '987654321', nom: 'Amoxicilline Sachet', stock: 5, prix: 3500 },
    { id: 'M3', codeBarre: '111222333', nom: 'Sirop Toux Enfant', stock: 42, prix: 2500 },
  ]);

  const [historiqueVentes, setHistoriqueVentes] = useState<RapportVente[]>([]);

  // --- ÉTATS SPÉCIFIQUES ---
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauService, setNouveauService] = useState<ServiceType>('GEN');
  const [ticketGenere, setTicketGenere] = useState<Patient | null>(null);

  const [selectedPatientTriage, setSelectedPatientTriage] = useState<Patient | null>(null);
  const [tensionSys, setTensionSys] = useState<number | ''>('');
  const [tensionDia, setTensionDia] = useState<number | ''>('');
  const [temperature, setTemperature] = useState<number | ''>('');
  const [poids, setPoids] = useState<number | ''>('');

  const [selectedPatientMed, setSelectedPatientMed] = useState<Patient | null>(null);
  const [notesCliniques, setNotesCliniques] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [ordonnance, setOrdonnance] = useState<Medicament[]>([]);

  const [selectedPatientPharmacie, setSelectedPatientPharmacie] = useState<Patient | null>(null);
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [messageErreur, setMessageErreur] = useState('');

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'Medecin' });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Medicament>>({ stock: 0, prix: 0 });

  // --- FONCTIONS AUTHENTIFICATION ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = utilisateurs.find(u => u.username === loginUsername && u.mdp === loginPwd);
    if (user) {
      setLoggedInUser(user);
      setLoginError('');
      // Redirection stricte
      if (user.role === 'Responsable') setActiveTab('admin');
      else if (user.role === 'Caissiere') setActiveTab('pharmacie');
      else if (user.role === 'Infirmier') setActiveTab('triage');
      else if (user.role === 'Medecin') setActiveTab('medecin');
      else setActiveTab('accueil');
    } else {
      setLoginError('Identifiant ou mot de passe incorrect.');
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null); setLoginUsername(''); setLoginPwd(''); setTicketGenere(null);
  };

  // --- FONCTIONS MÉTIER ---
  const genererTicket = () => {
    if (!nouveauNom.trim()) return;
    const numeroFormatte = (patients.filter(p => p.service === nouveauService).length + 1).toString().padStart(3, '0');
    const newPatient: Patient = {
      id: `DOS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      ticket: `${nouveauService}-${numeroFormatte}`, nom: nouveauNom, service: nouveauService,
      statut: 'Triage', heureArrivee: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setPatients([...patients, newPatient]); setTicketGenere(newPatient); setNouveauNom('');
  };

  const validerTriage = () => {
    if (!selectedPatientTriage) return;
    setPatients(patients.map(p => p.id === selectedPatientTriage.id ? { 
      ...p, statut: 'Consultation', constantes: { sys: Number(tensionSys), dia: Number(tensionDia), temp: Number(temperature), poids: Number(poids) }
    } : p));
    setSelectedPatientTriage(null); setTensionSys(''); setTensionDia(''); setTemperature(''); setPoids('');
  };

  // Fonctions Médecin
  const totalOrdonnance = ordonnance.reduce((sum, med) => sum + med.prix, 0);

  const envoyerPharmacie = () => {
    if (!selectedPatientMed) return;
    setPatients(patients.map(p => p.id === selectedPatientMed.id ? { ...p, statut: 'Pharmacie', ordonnance: ordonnance } : p));
    setSelectedPatientMed(null); setNotesCliniques(''); setDiagnostic(''); setOrdonnance([]);
  };

  const terminerSansOrdonnance = () => {
    if (!selectedPatientMed) return;
    setPatients(patients.map(p => p.id === selectedPatientMed.id ? { ...p, statut: 'Terminé' } : p));
    setSelectedPatientMed(null); setNotesCliniques(''); setDiagnostic(''); setOrdonnance([]);
  };

  const annulerOrdonnance = () => {
    setOrdonnance([]); // Vide juste la liste des médicaments sélectionnés
  };

  // Fonctions Pharmacie
  const ajouterAuPanier = (codeBarre: string) => {
    setMessageErreur('');
    const med = medicaments.find(m => m.codeBarre === codeBarre);
    if (!med) return setMessageErreur('Médicament introuvable. Code erroné.');
    if (med.stock <= 0) return setMessageErreur('Rupture de stock.');
    
    const existant = panier.find(l => l.medicament.id === med.id);
    if (existant) {
      if (existant.quantite >= med.stock) return setMessageErreur('Stock max atteint.');
      setPanier(panier.map(l => l.medicament.id === med.id ? { ...l, quantite: l.quantite + 1 } : l));
    } else setPanier([...panier, { medicament: med, quantite: 1 }]);
    setCodeSaisi('');
  };

  const validerPaiement = () => {
    setMedicaments(medicaments.map(med => {
      const ligne = panier.find(l => l.medicament.id === med.id);
      return ligne ? { ...med, stock: med.stock - ligne.quantite } : med;
    }));
    const montantTotal = panier.reduce((sum, l) => sum + (l.medicament.prix * l.quantite), 0);
    setHistoriqueVentes([{
      id: `FA-${Math.floor(Math.random() * 10000)}`, patientNom: selectedPatientPharmacie?.nom || 'Client Externe',
      montant: montantTotal, heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...historiqueVentes]);
    if (selectedPatientPharmacie) {
      setPatients(patients.map(p => p.id === selectedPatientPharmacie.id ? { ...p, statut: 'Terminé' } : p));
      setSelectedPatientPharmacie(null);
    }
    setPanier([]);
    alert("Paiement validé avec succès ! Les stocks ont été déduits.");
  };

  // Fonctions Admin
  const saveUser = () => {
    if (!newUser.username || !newUser.mdp || !newUser.nomComplet) return;
    setUtilisateurs([...utilisateurs, { ...newUser, id: `U${Date.now()}` } as User]);
    setShowAddUser(false); setNewUser({ role: 'Medecin' });
  };

  const deleteUser = (id: string) => {
    if(id === loggedInUser?.id) return alert("Impossible de supprimer votre propre compte.");
    setUtilisateurs(utilisateurs.filter(u => u.id !== id));
  };

  const simulerScanAdmin = () => {
    // Génère un faux code barre aléatoire pour simuler la douchette
    const codeGenere = Math.floor(100000000 + Math.random() * 900000000).toString();
    setNewProduct({...newProduct, codeBarre: codeGenere});
  };

  const saveProduct = () => {
    if (!newProduct.nom || !newProduct.codeBarre) return alert("Le nom et le code barre sont obligatoires.");
    setMedicaments([...medicaments, { ...newProduct, id: `M${Date.now()}` } as Medicament]);
    setShowAddProduct(false); setNewProduct({ stock: 0, prix: 0 });
  };


  // --- VUE LOGIN ---
  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30"><ShieldPlus size={32} className="text-white" /></div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clinique Ong Notre Grenier</h1>
            <p className="text-slate-500 text-sm mt-1">Portail de Gestion Sécurisé</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle size={16}/> {loginError}</div>}
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Identifiant</label><input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ex: admin" required /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Mot de passe</label><input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" required /></div>
            <button type="submit" className="mt-4 w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"><Lock size={18} /> Connexion</button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 border border-blue-100">
            <strong>Tests :</strong> admin, medecin, infirmier, caisse, accueil (Mdp: 1234)
          </div>
        </div>
      </div>
    );
  }

  // --- VUE APPLICATION PRINCIPALE ---
  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg"><ShieldPlus size={24} className="text-white" /></div>
          <h1 className="text-xl font-bold hidden sm:block">ONG SANTE PLUS</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-emerald-400">Connecté(e)</p>
            <p className="text-sm font-bold">{loggedInUser.nomComplet} ({loggedInUser.role})</p>
          </div>
          <button onClick={handleLogout} className="bg-slate-800 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors border border-slate-700 text-slate-300" title="Déconnexion"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR AVEC CLOISONNEMENT STRICT */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 z-0">
          <nav className="flex flex-col gap-2 px-4">
            {loggedInUser.role === 'Responsable' && (
              <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><BarChart3 size={20} /> Administration</button>
            )}
            {loggedInUser.role === 'Accueil' && (
              <button onClick={() => setActiveTab('accueil')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Réception</button>
            )}
            {loggedInUser.role === 'Infirmier' && (
              <button onClick={() => setActiveTab('triage')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={20} /> Infirmerie</button>
            )}
            {loggedInUser.role === 'Medecin' && (
              <button onClick={() => setActiveTab('medecin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Stethoscope size={20} /> Consultation</button>
            )}
            {loggedInUser.role === 'Caissiere' && (
              <button onClick={() => setActiveTab('pharmacie')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Pill size={20} /> Pharmacie & Caisse</button>
            )}
          </nav>

          <div className="mt-auto px-4">
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 flex flex-col gap-2">
              <span className="font-bold flex items-center gap-1 text-slate-700"><Lock size={12}/> Accès Restreint</span>
              Votre session est verrouillée sur le module : <strong>{loggedInUser.role}</strong>.
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50">

          {/* === MODULE 0: ADMIN === */}
          {activeTab === 'admin' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Espace Administrateur</h2>
                  <p className="text-slate-500 mt-1">Supervision globale de la clinique. Modification des autres services interdite.</p>
                </div>
              </div>

              <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
                <button onClick={() => setAdminSubTab('stats')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Tableau de bord</button>
                <button onClick={() => setAdminSubTab('stock')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Stock Pharmacie</button>
                <button onClick={() => setAdminSubTab('personnel')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'personnel' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Personnel (Accès)</button>
                <button onClick={() => setAdminSubTab('rapports')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'rapports' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Rapports Financiers</button>
              </div>

              {adminSubTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-xl text-blue-600"><Users size={24} /></div>
                    <div><p className="text-sm font-bold text-slate-500 uppercase">Patients du jour</p><p className="text-3xl font-black text-slate-800">{patients.length}</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600"><TrendingUp size={24} /></div>
                    <div><p className="text-sm font-bold text-slate-500 uppercase">Revenus (FCFA)</p><p className="text-3xl font-black text-slate-800">{historiqueVentes.reduce((acc, v) => acc + v.montant, 0).toLocaleString()}</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm flex items-center gap-4 relative">
                    <div className="bg-red-100 p-4 rounded-xl text-red-600"><AlertTriangle size={24} /></div>
                    <div><p className="text-sm font-bold text-slate-500 uppercase">Alertes Stocks</p><p className="text-3xl font-black text-red-600">{medicaments.filter(m => m.stock < 10).length}</p></div>
                  </div>
                </div>
              )}

              {adminSubTab === 'stock' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package size={20}/> Base de données des médicaments</h3>
                    <button onClick={() => setShowAddProduct(!showAddProduct)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
                      {showAddProduct ? <X size={16}/> : <Plus size={16}/>} {showAddProduct ? 'Fermer' : 'Nouveau Produit'}
                    </button>
                  </div>

                  {showAddProduct && (
                    <div className="p-5 bg-blue-50 border-b border-blue-100 grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-3">
                        <label className="text-xs font-bold text-slate-500">Nom du médicament</label>
                        <input type="text" value={newProduct.nom || ''} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500" placeholder="Ex: Doliprane 1000" />
                      </div>
                      <div className="col-span-4 relative">
                        <label className="text-xs font-bold text-slate-500">Code Barre (Scan Douchette)</label>
                        <div className="flex gap-2">
                          <input type="text" value={newProduct.codeBarre || ''} onChange={e => setNewProduct({...newProduct, codeBarre: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg font-mono outline-none focus:border-blue-500" placeholder="Scannez ici..." />
                          <button onClick={simulerScanAdmin} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg flex items-center justify-center" title="Simuler la douchette"><Scan size={20}/></button>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500">Prix (FCFA)</label>
                        <input type="number" value={newProduct.prix || ''} onChange={e => setNewProduct({...newProduct, prix: Number(e.target.value)})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-bold text-slate-500">Stock initial</label>
                        <div className="flex gap-2">
                          <input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" />
                          <button onClick={saveProduct} className="bg-slate-900 hover:bg-black text-white px-4 rounded-lg flex items-center justify-center gap-2 font-bold"><Save size={18}/> Créer</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Médicament</th><th className="p-4">Code Barre</th><th className="p-4">Prix de vente</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Action</th></tr></thead>
                    <tbody>
                      {medicaments.map(med => (
                        <tr key={med.id} className="border-b hover:bg-slate-50">
                          <td className="p-4 font-bold text-slate-800">{med.nom}</td><td className="p-4 font-mono text-slate-500">{med.codeBarre}</td><td className="p-4 font-medium">{med.prix.toLocaleString()} F</td>
                          <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full font-bold text-xs ${med.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{med.stock}</span></td>
                          <td className="p-4 text-right"><button onClick={() => setMedicaments(medicaments.map(m => m.id === med.id ? {...m, stock: m.stock + 50} : m))} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors">+50 Unités</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminSubTab === 'personnel' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserPlus size={20}/> Comptes Utilisateurs</h3>
                    <button onClick={() => setShowAddUser(!showAddUser)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">{showAddUser ? <X size={16}/> : <Plus size={16}/>} Créer un compte</button>
                  </div>
                  {showAddUser && (
                     <div className="p-4 bg-blue-50 border-b border-blue-100 grid grid-cols-5 gap-4 items-end">
                      <div className="col-span-1"><label className="text-xs font-bold text-slate-500">Nom Complet</label><input type="text" onChange={e => setNewUser({...newUser, nomComplet: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="text-xs font-bold text-slate-500">Login</label><input type="text" onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="text-xs font-bold text-slate-500">Mot de passe</label><input type="text" onChange={e => setNewUser({...newUser, mdp: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="text-xs font-bold text-slate-500">Rôle</label><select onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full p-2 border rounded-lg"><option value="Medecin">Médecin</option><option value="Infirmier">Infirmier</option><option value="Caissiere">Caissière</option><option value="Accueil">Accueil</option><option value="Responsable">Admin</option></select></div>
                      <div><button onClick={saveUser} className="w-full bg-slate-900 text-white p-2 rounded-lg flex items-center justify-center gap-2"><Save size={18}/> Enregistrer</button></div>
                    </div>
                  )}
                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Nom Complet</th><th className="p-4">Rôle</th><th className="p-4">Login</th><th className="p-4">Mot de passe</th><th className="p-4 text-right">Actions</th></tr></thead>
                    <tbody>
                      {utilisateurs.map(u => (
                        <tr key={u.id} className="border-b hover:bg-slate-50">
                          <td className="p-4 font-bold">{u.nomComplet}</td>
                          <td className="p-4"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td>
                          <td className="p-4 font-mono">{u.username}</td><td className="p-4 font-mono text-slate-400">{u.mdp}</td>
                          <td className="p-4 text-right"><button onClick={() => deleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminSubTab === 'rapports' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col p-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><FileBarChart size={20}/> Historique des encaissements (Caisse Pharmacie)</h3>
                  {historiqueVentes.length === 0 ? <p className="text-slate-400 text-center py-10">Aucune vente enregistrée pour le moment.</p> : (
                    <table className="w-full text-left text-sm border">
                      <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-3">Ref Facture</th><th className="p-3">Heure</th><th className="p-3">Patient</th><th className="p-3 text-right">Montant Encaissé</th></tr></thead>
                      <tbody>
                        {historiqueVentes.map(v => (
                          <tr key={v.id} className="border-b"><td className="p-3 font-mono text-slate-500">{v.id}</td><td className="p-3">{v.heure}</td><td className="p-3 font-bold">{v.patientNom}</td><td className="p-3 text-right font-bold text-emerald-600">{v.montant.toLocaleString()} F</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === MODULE 1: ACCUEIL (RESTAURÉ) === */}
          {activeTab === 'accueil' && (
             <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Accueil & Enregistrement</h2>
              <p className="text-slate-500 mb-8">Génération automatique des dossiers, tickets d'attente et QR Codes</p>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet du patient</label>
                    <input type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} placeholder="Ex: Koffi Emmanuel" className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Service demandé (Boutons)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setNouveauService('GEN')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'GEN' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><GenMed size={18}/> Général</button>
                      <button onClick={() => setNouveauService('PED')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'PED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Baby size={18}/> Pédiatrie</button>
                      <button onClick={() => setNouveauService('MAT')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'MAT' ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Heart size={18}/> Maternité</button>
                      <button onClick={() => setNouveauService('CHIR')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all ${nouveauService === 'CHIR' ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Activity size={18}/> Chirurgie</button>
                    </div>
                  </div>
                </div>
                <button onClick={genererTicket} disabled={!nouveauNom.trim()} className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  <QrCode size={20} /> Générer le Dossier et le Ticket
                </button>
              </div>

              {/* POPUP TICKET & QR CODE RESTAURÉ */}
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
                    </div>
                    <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
                      <button onClick={() => setTicketGenere(null)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-100">Fermer</button>
                      <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Printer size={18} /> Imprimer</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODULE 2: INFIRMERIE === */}
          {activeTab === 'triage' && (
             <div className="h-full flex flex-col">
               <h2 className="text-3xl font-bold text-slate-800 mb-8">Infirmerie - Triage</h2>
               <div className="grid grid-cols-3 gap-8 flex-1">
                 <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto">
                   <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Patients en attente</h3>
                   {patients.filter(p => p.statut === 'Triage').map(patient => (
                     <div key={patient.id} onClick={() => setSelectedPatientTriage(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientTriage?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">{patient.nom}</span>
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{patient.ticket}</span>
                        </div>
                     </div>
                   ))}
                 </div>
                 <div className="col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
                   {selectedPatientTriage ? (
                     <>
                        <h3 className="text-xl font-bold mb-6 border-b pb-4">Prise de constantes : {selectedPatientTriage.nom}</h3>
                        <div className="grid grid-cols-2 gap-6 mb-8">
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Systolique (mmHg)</label><input type="number" placeholder="Ex: 120" value={tensionSys} onChange={e => setTensionSys(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none focus:border-blue-500" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Diastolique (mmHg)</label><input type="number" placeholder="Ex: 80" value={tensionDia} onChange={e => setTensionDia(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none focus:border-blue-500" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><Thermometer size={16} className="text-orange-500"/> Température (°C)</label><input type="number" placeholder="Ex: 37.5" value={temperature} onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none focus:border-blue-500" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><Weight size={16} className="text-emerald-500"/> Poids (kg)</label><input type="number" placeholder="Ex: 70" value={poids} onChange={e => setPoids(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none focus:border-blue-500" /></div>
                        </div>
                        <div className="flex justify-end">
                          <button onClick={validerTriage} disabled={!tensionSys || !tensionDia || !temperature || !poids} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-blue-700 transition-all"><CheckCircle2 size={20}/> Transférer au Médecin</button>
                        </div>
                     </>
                   ) : <div className="h-full flex flex-col items-center justify-center text-slate-400"><Activity size={48} className="mb-4 opacity-20" /><p>Sélectionnez un patient à gauche.</p></div>}
                 </div>
               </div>
             </div>
          )}

          {/* === MODULE 3: MÉDECIN (TRANSPARENCE DES PRIX) === */}
          {activeTab === 'medecin' && (
            <div className="h-full flex flex-col">
              <h2 className="text-3xl font-bold text-slate-800 mb-6">Bureau du Médecin</h2>
              <div className="grid grid-cols-4 gap-8 flex-1">
                <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Salle d'attente</h3>
                  {patients.filter(p => p.statut === 'Consultation').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientMed(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 ${selectedPatientMed?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block text-slate-800">{patient.nom}</span>
                      <span className="text-xs text-slate-500 font-medium">{patient.constantes?.sys}/{patient.constantes?.dia} mmHg • {patient.constantes?.temp}°C</span>
                    </div>
                  ))}
                  {patients.filter(p => p.statut === 'Consultation').length === 0 && <p className="text-sm text-slate-400 italic">Aucun patient.</p>}
                </div>

                <div className="col-span-3 bg-white border rounded-2xl flex flex-col shadow-sm">
                  {selectedPatientMed ? (
                    <div className="flex-1 flex flex-col">
                      <div className="bg-slate-900 text-white p-6"><h2 className="text-2xl font-bold">{selectedPatientMed.nom}</h2><p className="text-slate-400 font-mono text-sm">Dossier N° {selectedPatientMed.id}</p></div>
                      
                      <div className="p-6 grid grid-cols-2 gap-6 flex-1">
                        <div className="flex flex-col gap-4">
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Notes Cliniques</label><textarea className="w-full p-4 border rounded-xl h-40 outline-none focus:border-blue-400" placeholder="Observations..." value={notesCliniques} onChange={e => setNotesCliniques(e.target.value)} /></div>
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Diagnostic Retenu</label><input type="text" className="w-full p-4 border rounded-xl font-bold outline-none focus:border-blue-400 text-slate-800" placeholder="Ex: Paludisme" value={diagnostic} onChange={e => setDiagnostic(e.target.value)} /></div>
                        </div>

                        <div className="bg-blue-50 rounded-2xl p-5 flex flex-col border border-blue-100">
                          <h4 className="font-bold text-blue-900 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Pill size={18}/> Ordonnance Numérique</span>
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Prix transparents</span>
                          </h4>
                          
                          {/* Liste des médicaments avec prix pour le médecin */}
                          <div className="bg-white rounded-xl border p-2 mb-4 max-h-40 overflow-y-auto">
                            {medicaments.map(med => {
                              const isSelected = ordonnance.some(m => m.id === med.id);
                              return (
                                <div key={med.id} onClick={() => setOrdonnance(isSelected ? ordonnance.filter(m => m.id !== med.id) : [...ordonnance, med])} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                                  <div>
                                    <span className="text-sm font-bold block">{med.nom}</span>
                                    <span className="text-xs font-medium text-slate-500">{med.prix.toLocaleString()} FCFA</span>
                                  </div>
                                  {isSelected ? <Check size={18} className="text-blue-600"/> : <PlusCircle size={18} className="text-slate-300"/>}
                                </div>
                              );
                            })}
                          </div>

                          {/* Résumé de l'ordonnance et Total pour accord patient */}
                          <div className="bg-white border rounded-xl p-4 flex-1 flex flex-col">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-2 border-b pb-2">Accord Patient :</p>
                            <ul className="list-disc pl-4 text-sm font-bold text-slate-700 mb-4 flex-1 overflow-y-auto">
                              {ordonnance.map(m => <li key={m.id}>{m.nom}</li>)}
                              {ordonnance.length === 0 && <li className="text-slate-400 font-normal list-none -ml-4">Aucun médicament sélectionné</li>}
                            </ul>
                            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-end">
                              <span className="text-sm text-slate-500 font-bold">Total estimé :</span>
                              <span className="text-2xl font-black text-blue-600">{totalOrdonnance.toLocaleString()} F</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                        <button onClick={terminerSansOrdonnance} className="px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl flex items-center gap-2"><Ban size={18}/> Clôturer le dossier sans médication</button>
                        <div className="flex gap-3">
                          <button onClick={annulerOrdonnance} disabled={ordonnance.length === 0} className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 disabled:opacity-50">Vider l'ordonnance</button>
                          <button onClick={envoyerPharmacie} disabled={!diagnostic} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-emerald-700 shadow-lg shadow-emerald-200"><CheckCircle2 size={20}/> Valider & Envoyer en Pharmacie</button>
                        </div>
                      </div>
                    </div>
                  ) : <div className="p-12 h-full flex flex-col items-center justify-center text-slate-400"><Stethoscope size={64} className="mb-4 opacity-20" /><p>Sélectionnez un patient.</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* === MODULE 4: PHARMACIE === */}
          {activeTab === 'pharmacie' && (
            <div className="h-full flex flex-col">
              <h2 className="text-3xl font-bold text-slate-800 mb-6">Caisse Pharmacie</h2>
              <div className="grid grid-cols-4 gap-8 flex-1">
                
                <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18}/> Patients envoyés</h3>
                  {patients.filter(p => p.statut === 'Pharmacie').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientPharmacie(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientPharmacie?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block text-slate-800">{patient.nom}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mt-1 inline-block font-bold">Ordonnance: {patient.ordonnance?.length || 0} produit(s)</span>
                    </div>
                  ))}
                  {patients.filter(p => p.statut === 'Pharmacie').length === 0 && <p className="text-sm text-slate-400">Aucun patient en attente.</p>}
                </div>

                <div className="col-span-1 bg-white border rounded-2xl p-6 shadow-sm flex flex-col">
                  {selectedPatientPharmacie ? (
                    <div className="mb-6 p-5 bg-yellow-50 border border-yellow-200 rounded-xl shadow-inner">
                      <h4 className="text-xs font-black text-yellow-800 uppercase mb-3 flex items-center gap-2"><FileText size={16}/> À délivrer :</h4>
                      <ul className="text-sm font-bold text-slate-800 space-y-2">
                        {selectedPatientPharmacie.ordonnance?.map(m => <li key={m.id} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5"></div>{m.nom}</li>)}
                      </ul>
                    </div>
                  ) : <div className="mb-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-400 text-center border border-dashed border-slate-300">Sélectionnez un patient à gauche pour voir son ordonnance validée.</div>}

                  <div className="mt-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Scanner les produits</label>
                    <form onSubmit={e => { e.preventDefault(); ajouterAuPanier(codeSaisi); }} className="relative">
                      <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                      <input type="text" value={codeSaisi} onChange={(e) => setCodeSaisi(e.target.value)} placeholder="Code Barre (Scan)" className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl font-mono text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
                    </form>
                    {messageErreur && <div className="mt-3 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2"><AlertCircle size={16}/> {messageErreur}</div>}
                  </div>
                </div>

                <div className="col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm overflow-hidden">
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                    {panier.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300"><Scan size={64} className="mb-4 opacity-20" /><p className="text-slate-500 font-medium">Le panier est vide</p></div> : (
                      <div className="flex flex-col gap-3">
                        {panier.map((ligne, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div><h4 className="font-bold text-slate-800">{ligne.medicament.nom}</h4><p className="text-xs text-slate-400 font-mono mt-1">Ref: {ligne.medicament.codeBarre}</p></div>
                            <div className="flex items-center gap-6">
                              <div className="text-center"><p className="text-xs text-slate-400">Qté</p><p className="font-bold">x{ligne.quantite}</p></div>
                              <div className="text-right w-24"><p className="text-xs text-slate-400">Prix</p><p className="font-bold text-blue-600">{(ligne.medicament.prix * ligne.quantite).toLocaleString()} F</p></div>
                              <button onClick={() => setPanier(panier.filter(l => l.medicament.id !== ligne.medicament.id))} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-8 bg-slate-900 text-white mt-auto rounded-t-3xl shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-slate-400 font-medium text-lg">Net à payer</p>
                      <p className="text-5xl font-black text-emerald-400">{panier.reduce((t, l) => t + (l.medicament.prix * l.quantite), 0).toLocaleString()} <span className="text-2xl text-emerald-600">FCFA</span></p>
                    </div>
                    <button onClick={validerPaiement} disabled={panier.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white p-5 rounded-xl font-bold flex justify-center items-center gap-3 text-lg transition-all">
                      <Printer size={24} /> Valider, Imprimer le reçu et Encaisser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClinicDashboard;
import React, { useState } from 'react';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, ShieldPlus, Stethoscope as GenMed,
  Scan, Search, Trash2, AlertCircle, ShoppingCart, Camera,
  Clock, CheckCircle2, Thermometer, Weight, HeartPulse,
  FileText, PlusCircle, Check,
  BarChart3, Package, TrendingUp, AlertTriangle, Plus,
  Lock, UserPlus, LogOut, Save, X, FileBarChart
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

  // Formulaires Admin
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
    setLoggedInUser(null);
    setLoginUsername('');
    setLoginPwd('');
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

  const validerConsultation = () => {
    if (!selectedPatientMed) return;
    // CORRECTION : On sauvegarde l'ordonnance dans le dossier du patient
    setPatients(patients.map(p => p.id === selectedPatientMed.id ? { ...p, statut: 'Pharmacie', ordonnance: ordonnance } : p));
    setSelectedPatientMed(null); setNotesCliniques(''); setDiagnostic(''); setOrdonnance([]);
  };

  const ajouterAuPanier = (codeBarre: string) => {
    setMessageErreur('');
    const med = medicaments.find(m => m.codeBarre === codeBarre);
    if (!med) return setMessageErreur('Médicament introuvable.');
    if (med.stock <= 0) return setMessageErreur('Rupture de stock.');
    
    const existant = panier.find(l => l.medicament.id === med.id);
    if (existant) {
      if (existant.quantite >= med.stock) return setMessageErreur('Stock max atteint.');
      setPanier(panier.map(l => l.medicament.id === med.id ? { ...l, quantite: l.quantite + 1 } : l));
    } else setPanier([...panier, { medicament: med, quantite: 1 }]);
    setCodeSaisi('');
  };

  const validerPaiement = () => {
    // 1. Déduire les stocks
    setMedicaments(medicaments.map(med => {
      const ligne = panier.find(l => l.medicament.id === med.id);
      return ligne ? { ...med, stock: med.stock - ligne.quantite } : med;
    }));
    
    // 2. Créer le rapport
    const montantTotal = panier.reduce((sum, l) => sum + (l.medicament.prix * l.quantite), 0);
    setHistoriqueVentes([{
      id: `FA-${Math.floor(Math.random() * 10000)}`, patientNom: selectedPatientPharmacie?.nom || 'Client Externe',
      montant: montantTotal, heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...historiqueVentes]);

    // 3. Terminer le patient
    if (selectedPatientPharmacie) {
      setPatients(patients.map(p => p.id === selectedPatientPharmacie.id ? { ...p, statut: 'Terminé' } : p));
      setSelectedPatientPharmacie(null);
    }
    
    setPanier([]);
    alert("Paiement validé avec succès ! Reçu imprimé.");
  };

  // --- FONCTIONS ADMIN (CRUD) ---
  const saveUser = () => {
    if (!newUser.username || !newUser.mdp || !newUser.nomComplet) return;
    setUtilisateurs([...utilisateurs, { ...newUser, id: `U${Date.now()}` } as User]);
    setShowAddUser(false); setNewUser({ role: 'Medecin' });
  };

  const deleteUser = (id: string) => {
    if(id === loggedInUser?.id) return alert("Vous ne pouvez pas supprimer votre propre compte.");
    setUtilisateurs(utilisateurs.filter(u => u.id !== id));
  };

  const saveProduct = () => {
    if (!newProduct.nom || !newProduct.codeBarre) return;
    setMedicaments([...medicaments, { ...newProduct, id: `M${Date.now()}` } as Medicament]);
    setShowAddProduct(false); setNewProduct({ stock: 0, prix: 0 });
  };

  // --- VUE LOGIN ---
  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <ShieldPlus size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">ONG SANTE PLUS</h1>
            <p className="text-slate-500 text-sm mt-1">Portail de Gestion Sécurisé</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle size={16}/> {loginError}</div>}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Nom d'utilisateur</label>
              <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="ex: admin" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Mot de passe</label>
              <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••" required />
            </div>
            <button type="submit" className="mt-4 w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
              <Lock size={18} /> Se Connecter
            </button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 border border-blue-100">
            <strong>Identifiants de test :</strong><br/>
            Admin: <code>admin / 1234</code><br/>
            Médecin: <code>medecin / 1234</code>
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
            <p className="text-sm font-bold">{loggedInUser.nomComplet}</p>
            <p className="text-xs text-blue-400">{loggedInUser.role}</p>
          </div>
          <button onClick={handleLogout} className="bg-slate-800 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors border border-slate-700 text-slate-300">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 z-0">
          <nav className="flex flex-col gap-2 px-4">
            {loggedInUser.role === 'Responsable' && (
              <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><BarChart3 size={20} /> Administration</button>
            )}
            {['Responsable', 'Accueil'].includes(loggedInUser.role) && (
              <button onClick={() => setActiveTab('accueil')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Réception</button>
            )}
            {['Responsable', 'Infirmier'].includes(loggedInUser.role) && (
              <button onClick={() => setActiveTab('triage')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={20} /> Infirmerie</button>
            )}
            {['Responsable', 'Medecin'].includes(loggedInUser.role) && (
              <button onClick={() => setActiveTab('medecin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Stethoscope size={20} /> Consultation</button>
            )}
            {['Responsable', 'Caissiere'].includes(loggedInUser.role) && (
              <button onClick={() => setActiveTab('pharmacie')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Pill size={20} /> Pharmacie & Caisse</button>
            )}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50">

          {/* === MODULE 0: ADMIN === */}
          {activeTab === 'admin' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Espace Administrateur</h2>
                  <p className="text-slate-500 mt-1">Gérez le personnel, les stocks et suivez les revenus.</p>
                </div>
              </div>

              {/* Sous-navigation Admin */}
              <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
                <button onClick={() => setAdminSubTab('stats')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Tableau de bord</button>
                <button onClick={() => setAdminSubTab('stock')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Stock Pharmacie</button>
                <button onClick={() => setAdminSubTab('personnel')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'personnel' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Personnel (Accès)</button>
                <button onClick={() => setAdminSubTab('rapports')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'rapports' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Rapports Financiers</button>
              </div>

              {/* Sous-onglets */}
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
                    <div className="p-4 bg-blue-50 border-b border-blue-100 grid grid-cols-5 gap-4 items-end">
                      <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Nom du médicament</label><input type="text" onChange={e => setNewProduct({...newProduct, nom: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="text-xs font-bold text-slate-500">Code Barre</label><input type="text" onChange={e => setNewProduct({...newProduct, codeBarre: e.target.value})} className="w-full p-2 border rounded-lg font-mono" /></div>
                      <div><label className="text-xs font-bold text-slate-500">Prix (FCFA)</label><input type="number" onChange={e => setNewProduct({...newProduct, prix: Number(e.target.value)})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="text-xs font-bold text-slate-500">Stock initial</label><div className="flex gap-2"><input type="number" onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-2 border rounded-lg" /><button onClick={saveProduct} className="bg-slate-900 text-white px-4 rounded-lg"><Save size={18}/></button></div></div>
                    </div>
                  )}

                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Médicament</th><th className="p-4">Code</th><th className="p-4">Prix</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Action</th></tr></thead>
                    <tbody>
                      {medicaments.map(med => (
                        <tr key={med.id} className="border-b hover:bg-slate-50">
                          <td className="p-4 font-bold">{med.nom}</td><td className="p-4 font-mono text-slate-500">{med.codeBarre}</td><td className="p-4">{med.prix} F</td>
                          <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full font-bold text-xs ${med.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{med.stock}</span></td>
                          <td className="p-4 text-right"><button onClick={() => setMedicaments(medicaments.map(m => m.id === med.id ? {...m, stock: m.stock + 50} : m))} className="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg font-bold text-xs hover:bg-blue-100">+50</button></td>
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
                    <button onClick={() => setShowAddUser(!showAddUser)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                      {showAddUser ? <X size={16}/> : <Plus size={16}/>} Créer un compte
                    </button>
                  </div>
                  
                  {showAddUser && (
                     <div className="p-4 bg-blue-50 border-b border-blue-100 grid grid-cols-5 gap-4 items-end">
                      <div className="col-span-1"><label className="text-xs font-bold text-slate-500">Nom Complet</label><input type="text" onChange={e => setNewUser({...newUser, nomComplet: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="text-xs font-bold text-slate-500">Identifiant (Login)</label><input type="text" onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
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
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><FileBarChart size={20}/> Historique des encaissements</h3>
                  {historiqueVentes.length === 0 ? <p className="text-slate-400 text-center py-10">Aucune vente enregistrée pour le moment.</p> : (
                    <table className="w-full text-left text-sm border">
                      <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-3">Ref Facture</th><th className="p-3">Heure</th><th className="p-3">Patient</th><th className="p-3 text-right">Montant</th></tr></thead>
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

          {/* === MODULES CLINIQUES (Code existant allégé et connecté) === */}
          {/* L'Accueil et le Triage restent inchangés... */}
          {activeTab === 'accueil' && (
             <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-800 mb-8">Accueil & Enregistrement</h2>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Nom complet</label><input type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" /></div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Service</label>
                    <select value={nouveauService} onChange={(e)=>setNouveauService(e.target.value as ServiceType)} className="w-full p-3 border border-slate-200 rounded-xl">
                      <option value="GEN">Médecine Générale</option><option value="PED">Pédiatrie</option>
                    </select>
                  </div>
                </div>
                <button onClick={genererTicket} disabled={!nouveauNom.trim()} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold">Générer le Dossier</button>
              </div>
            </div>
          )}

          {activeTab === 'triage' && (
             <div className="h-full flex flex-col">
               <h2 className="text-3xl font-bold text-slate-800 mb-8">Infirmerie - Triage</h2>
               <div className="grid grid-cols-3 gap-8 flex-1">
                 <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm">
                   <h3 className="font-bold mb-4">Patients en attente</h3>
                   {patients.filter(p => p.statut === 'Triage').map(patient => (
                     <div key={patient.id} onClick={() => setSelectedPatientTriage(patient)} className="p-3 rounded-xl cursor-pointer border hover:bg-slate-50 mb-2">
                       <span className="font-bold">{patient.nom}</span>
                     </div>
                   ))}
                 </div>
                 <div className="col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
                   {selectedPatientTriage ? (
                     <>
                        <h3 className="text-xl font-bold mb-6">Prise de constantes : {selectedPatientTriage.nom}</h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <input type="number" placeholder="Tension Systolique (ex: 120)" onChange={e => setTensionSys(Number(e.target.value))} className="p-3 border rounded-xl" />
                          <input type="number" placeholder="Tension Diastolique (ex: 80)" onChange={e => setTensionDia(Number(e.target.value))} className="p-3 border rounded-xl" />
                          <input type="number" placeholder="Température (°C)" onChange={e => setTemperature(Number(e.target.value))} className="p-3 border rounded-xl" />
                          <input type="number" placeholder="Poids (kg)" onChange={e => setPoids(Number(e.target.value))} className="p-3 border rounded-xl" />
                        </div>
                        <button onClick={validerTriage} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold float-right">Transférer au Médecin</button>
                     </>
                   ) : <p className="text-slate-400">Sélectionnez un patient.</p>}
                 </div>
               </div>
             </div>
          )}

          {/* === MODULE MÉDECIN === */}
          {activeTab === 'medecin' && (
            <div className="h-full flex flex-col">
              <h2 className="text-3xl font-bold text-slate-800 mb-6">Bureau du Médecin</h2>
              <div className="grid grid-cols-4 gap-8 flex-1">
                <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto">
                  <h3 className="font-bold mb-4">Salle d'attente</h3>
                  {patients.filter(p => p.statut === 'Consultation').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientMed(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 ${selectedPatientMed?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block">{patient.nom}</span>
                      <span className="text-xs text-slate-500">{patient.constantes?.sys}/{patient.constantes?.dia} mmHg • {patient.constantes?.temp}°C</span>
                    </div>
                  ))}
                </div>
                <div className="col-span-3 bg-white border rounded-2xl flex flex-col shadow-sm">
                  {selectedPatientMed ? (
                    <div className="flex-1 flex flex-col">
                      <div className="bg-slate-900 text-white p-6"><h2 className="text-2xl font-bold">{selectedPatientMed.nom}</h2></div>
                      <div className="p-6 grid grid-cols-2 gap-6 flex-1">
                        <div>
                          <textarea className="w-full p-4 border rounded-xl h-32 mb-4" placeholder="Notes d'observation..." value={notesCliniques} onChange={e => setNotesCliniques(e.target.value)} />
                          <input type="text" className="w-full p-4 border rounded-xl font-bold" placeholder="Diagnostic retenu..." value={diagnostic} onChange={e => setDiagnostic(e.target.value)} />
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-5">
                          <h4 className="font-bold text-blue-900 mb-4">Créer l'Ordonnance Numérique</h4>
                          <div className="bg-white rounded-xl border p-2 mb-4 max-h-32 overflow-y-auto">
                            {medicaments.map(med => {
                              const isSelected = ordonnance.some(m => m.id === med.id);
                              return (
                                <div key={med.id} onClick={() => setOrdonnance(isSelected ? ordonnance.filter(m => m.id !== med.id) : [...ordonnance, med])} className={`p-2 rounded-lg cursor-pointer ${isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-50'}`}>
                                  <span className="text-sm font-medium">{med.nom}</span> {isSelected && <Check size={16} className="inline text-blue-600 float-right"/>}
                                </div>
                              );
                            })}
                          </div>
                          <div className="bg-white border rounded-xl p-4 min-h-[100px]">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-2">Prescription :</p>
                            <ul className="list-disc pl-4 text-sm font-bold">{ordonnance.map(m => <li key={m.id}>{m.nom}</li>)}</ul>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border-t text-right">
                        <button onClick={validerConsultation} disabled={!diagnostic} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50">Valider & Envoyer en Pharmacie</button>
                      </div>
                    </div>
                  ) : <div className="p-12 text-center text-slate-400"><p>Sélectionnez un patient.</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* === MODULE PHARMACIE === */}
          {activeTab === 'pharmacie' && (
            <div className="h-full flex flex-col">
              <h2 className="text-3xl font-bold text-slate-800 mb-6">Caisse Pharmacie</h2>
              <div className="grid grid-cols-4 gap-8 flex-1">
                
                {/* NOUVEAU: File d'attente de la pharmacie pour voir l'ordonnance */}
                <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18}/> Patients envoyés</h3>
                  {patients.filter(p => p.statut === 'Pharmacie').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientPharmacie(patient)} className={`p-3 rounded-xl cursor-pointer border mb-2 ${selectedPatientPharmacie?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block">{patient.nom}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Ordonnance: {patient.ordonnance?.length || 0} prod.</span>
                    </div>
                  ))}
                  {patients.filter(p => p.statut === 'Pharmacie').length === 0 && <p className="text-xs text-slate-400">Aucun patient en attente de médicaments.</p>}
                </div>

                <div className="col-span-1 bg-white border rounded-2xl p-6 shadow-sm flex flex-col">
                  {/* Affichage de l'ordonnance du patient sélectionné */}
                  {selectedPatientPharmacie ? (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <h4 className="text-xs font-bold text-yellow-800 uppercase mb-2">Ordonnance du médecin :</h4>
                      <ul className="text-sm font-bold text-slate-800 space-y-1">
                        {selectedPatientPharmacie.ordonnance?.map(m => <li key={m.id}>- {m.nom}</li>)}
                      </ul>
                    </div>
                  ) : <div className="mb-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-400">Sélectionnez un patient pour voir son ordonnance.</div>}

                  <form onSubmit={e => { e.preventDefault(); ajouterAuPanier(codeSaisi); }} className="relative mt-auto">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                    <input type="text" value={codeSaisi} onChange={(e) => setCodeSaisi(e.target.value)} placeholder="Code Barre (ex: 123456789)" className="w-full pl-10 pr-4 py-3 border rounded-xl font-mono"/>
                  </form>
                  {messageErreur && <div className="mt-2 text-red-600 text-sm font-bold">{messageErreur}</div>}
                </div>

                <div className="col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm">
                  <div className="flex-1 p-6 overflow-y-auto">
                    {panier.length === 0 ? <p className="text-slate-400 text-center">Panier vide</p> : (
                      panier.map((ligne, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border mb-2">
                          <div><h4 className="font-bold">{ligne.medicament.nom}</h4></div>
                          <div className="flex items-center gap-6">
                            <p className="font-bold">x{ligne.quantite}</p>
                            <p className="font-bold text-blue-600">{(ligne.medicament.prix * ligne.quantite).toLocaleString()} F</p>
                            <button onClick={() => setPanier(panier.filter(l => l.medicament.id !== ligne.medicament.id))} className="text-red-400"><Trash2 size={20}/></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-6 bg-slate-900 text-white rounded-t-3xl mt-auto">
                    <div className="flex justify-between items-end mb-4">
                      <p className="text-slate-400">Net à payer</p>
                      <p className="text-4xl font-black text-emerald-400">{panier.reduce((t, l) => t + (l.medicament.prix * l.quantite), 0).toLocaleString()} F</p>
                    </div>
                    <button onClick={validerPaiement} disabled={panier.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-4 rounded-xl font-bold flex justify-center gap-2">
                      <Printer size={20} /> Valider et Encaisser
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
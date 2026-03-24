import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, ShieldPlus, Stethoscope as GenMed,
  Scan, Search, Trash2, AlertCircle, ShoppingCart, Camera,
  Clock, CheckCircle2, Thermometer, Weight, HeartPulse,
  FileText, PlusCircle, Check,
  BarChart3, Package, TrendingUp, AlertTriangle, Plus,
  Lock, UserPlus, LogOut, Save, X, FileBarChart, Ban, Download
} from 'lucide-react';

// --- TYPES DE DONNÉES ---
type Role = 'Responsable' | 'Medecin' | 'Infirmier' | 'Caissiere' | 'Accueil';
type ServiceType = 'PED' | 'GEN' | 'MAT' | 'CHIR';

interface User { id: string; username: string; mdp: string; role: Role; nomComplet: string; }
interface ConstantesVitales { sys: number; dia: number; temp: number; poids: number; }
interface Medicament { id: string; codeBarre: string; nom: string; stock: number; prix: number; }
interface LignePanier { medicament: Medicament; quantite: number; }
interface RapportVente { id: string; patientNom: string; montant: number; heure: string; date: string; detailsPanier: LignePanier[]; }

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
  const [recuApercu, setRecuApercu] = useState<RapportVente | null>(null); 
  const inputScanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'pharmacie' && inputScanRef.current && !recuApercu) {
      inputScanRef.current.focus();
    }
  }, [activeTab, recuApercu]);

  // --- FONCTIONS AUTHENTIFICATION ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = utilisateurs.find(u => u.username === loginUsername && u.mdp === loginPwd);
    if (user) {
      setLoggedInUser(user); setLoginError('');
      if (user.role === 'Responsable') setActiveTab('admin');
      else if (user.role === 'Caissiere') setActiveTab('pharmacie');
      else if (user.role === 'Infirmier') setActiveTab('triage');
      else if (user.role === 'Medecin') setActiveTab('medecin');
      else setActiveTab('accueil');
    } else { setLoginError('Identifiant ou mot de passe incorrect.'); }
  };

  const handleLogout = () => {
    setLoggedInUser(null); setLoginUsername(''); setLoginPwd(''); setTicketGenere(null); setRecuApercu(null);
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

  const imprimerTicketAccueil = () => {
    if (!ticketGenere) return;
    const printWindow = window.open('', '_blank', 'width=300,height=500');
    if (!printWindow) return;
    const htmlTicket = `
      <html><head><title>Ticket Patient</title>
      <style>
        body { font-family: 'Arial', sans-serif; width: 58mm; padding: 10px; margin: 0; text-align: center; }
        .bold { font-weight: bold; }
        .ticket-num { font-size: 28px; margin: 10px 0; border: 2px solid #000; padding: 5px; }
        .qr-img { width: 120px; height: 120px; margin: 10px auto; }
      </style></head><body>
        <div class="bold" style="font-size:16px;">Clinique ONG Notre Grenier</div>
        <div style="font-size:12px; margin-bottom: 10px;">${new Date().toLocaleDateString()} - ${ticketGenere.heureArrivee}</div>
        <div>Ticket d'attente</div>
        <div class="ticket-num bold">${ticketGenere.ticket}</div>
        <div>${ticketGenere.nom}</div>
        <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketGenere.id}" />
        <div style="font-size:10px;">Conservez ce ticket pour la caisse</div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body></html>
    `;
    printWindow.document.write(htmlTicket); printWindow.document.close();
  };

  const validerTriage = () => {
    if (!selectedPatientTriage) return;
    setPatients(patients.map(p => p.id === selectedPatientTriage.id ? { 
      ...p, statut: 'Consultation', constantes: { sys: Number(tensionSys), dia: Number(tensionDia), temp: Number(temperature), poids: Number(poids) }
    } : p));
    setSelectedPatientTriage(null); setTensionSys(''); setTensionDia(''); setTemperature(''); setPoids('');
  };

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

  const annulerOrdonnance = () => { setOrdonnance([]); };

  const handleTraitementScan = (code: string) => {
    setMessageErreur('');
    if (code.startsWith('DOS-')) {
      const patientTrouve = patients.find(p => p.id === code);
      if (patientTrouve) {
        if (patientTrouve.statut === 'Pharmacie') setSelectedPatientPharmacie(patientTrouve);
        else setMessageErreur(`Le patient ${patientTrouve.nom} n'est pas en pharmacie.`);
      } else setMessageErreur('Dossier patient introuvable.');
    } else {
      const med = medicaments.find(m => m.codeBarre === code);
      if (!med) return setMessageErreur('Médicament introuvable.');
      if (med.stock <= 0) return setMessageErreur(`Rupture de stock pour ${med.nom}.`);
      
      const existant = panier.find(l => l.medicament.id === med.id);
      if (existant) {
        if (existant.quantite >= med.stock) return setMessageErreur('Stock maximum atteint.');
        setPanier(panier.map(l => l.medicament.id === med.id ? { ...l, quantite: l.quantite + 1 } : l));
      } else setPanier([...panier, { medicament: med, quantite: 1 }]);
    }
    setCodeSaisi(''); 
  };

  const validerPaiement = () => {
    setMedicaments(medicaments.map(med => {
      const ligne = panier.find(l => l.medicament.id === med.id);
      return ligne ? { ...med, stock: med.stock - ligne.quantite } : med;
    }));
    
    const montantTotal = panier.reduce((sum, l) => sum + (l.medicament.prix * l.quantite), 0);
    const dateActuelle = new Date();
    const nouvelleTransaction: RapportVente = {
      id: `FA-${Math.floor(Math.random() * 10000)}`, 
      patientNom: selectedPatientPharmacie?.nom || 'Client Externe',
      montant: montantTotal, 
      heure: dateActuelle.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: dateActuelle.toLocaleDateString(),
      detailsPanier: [...panier] 
    };
    
    setHistoriqueVentes([nouvelleTransaction, ...historiqueVentes]);
    
    if (selectedPatientPharmacie) {
      setPatients(patients.map(p => p.id === selectedPatientPharmacie.id ? { ...p, statut: 'Terminé' } : p));
      setSelectedPatientPharmacie(null);
    }
    setPanier([]);
    
    setRecuApercu(nouvelleTransaction);
  };

  const lancerImpressionThermique = (transaction: RapportVente) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    // NOUVEAU : Ajout de la balise <img> pour le QR code au centre du ticket imprimé
    const htmlTicket = `
      <html>
        <head>
          <title>Ticket de Caisse - ${transaction.id}</title>
          <style>
            @page { margin: 0; size: 58mm auto; }
            body { font-family: 'Courier New', Courier, monospace; width: 58mm; padding: 5px; margin: 0; font-size: 12px; color: #000; }
            .center { text-align: center; } .bold { font-weight: bold; }
            .flex { display: flex; justify-content: space-between; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .item-row { margin-bottom: 3px; }
            .qr-code { width: 100px; height: 100px; margin: 10px auto; display: block; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size:14px; margin-bottom: 2px;">Clinique ONG Notre Grenier</div>
          <div class="center">Reçu de Caisse</div>
          <div class="center" style="font-size:10px;">Le ${transaction.date} à ${transaction.heure}</div>
          <div class="divider"></div>
          <div>Ticket N°: <span class="bold">${transaction.id}</span></div>
          <div>Patient: ${transaction.patientNom}</div>
          <div>Caissier: ${loggedInUser?.nomComplet}</div>
          <div class="divider"></div>
          <div class="flex bold"><span>Désignation</span><span>Prix</span></div>
          <div class="divider"></div>
          ${transaction.detailsPanier.map(l => `
            <div class="item-row">
              <div>${l.medicament.nom}</div>
              <div class="flex"><span>${l.quantite} x ${l.medicament.prix}F</span><span>${l.quantite * l.medicament.prix}F</span></div>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="flex bold" style="font-size: 14px;"><span>TOTAL NET:</span><span>${transaction.montant} F</span></div>
          <div class="divider"></div>
          
          <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${transaction.id}" alt="QR Code Reçu" />
          
          <div class="center" style="margin-top:5px; font-size:10px;">Bonne guérison !</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlTicket);
    printWindow.document.close();
    setRecuApercu(null); 
  };

  // --- FONCTIONS ADMIN & EXPORT ---
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'Medecin' });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Medicament>>({ stock: 0, prix: 0 });

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
    const codeGenere = Math.floor(100000000 + Math.random() * 900000000).toString();
    setNewProduct({...newProduct, codeBarre: codeGenere});
  };

  const saveProduct = () => {
    if (!newProduct.nom || !newProduct.codeBarre) return alert("Le nom et le code barre sont obligatoires.");
    setMedicaments([...medicaments, { ...newProduct, id: `M${Date.now()}` } as Medicament]);
    setShowAddProduct(false); setNewProduct({ stock: 0, prix: 0 });
  };

  const exporterExcel = () => {
    const enTetes = "Ref Facture;Date;Heure;Patient;Montant(FCFA)\n";
    const lignes = historiqueVentes.map(v => `${v.id};${v.date};${v.heure};${v.patientNom};${v.montant}`).join('\n');
    const blob = new Blob([enTetes + lignes], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    link.download = `Rapport_Caisse_${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
  };

  const exporterPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    let html = `<html><head><title>Rapport Financier</title>
      <style>body { font-family: Arial; padding: 20px; } table { border-collapse: collapse; width: 100%; margin-top: 20px;} th, td { border: 1px solid #ccc; padding: 10px; text-align: left; } th { background-color: #f0f0f0; } .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; text-align: right;}</style></head><body>
      <h2>Rapport des Encaissements - Clinique ONG Notre Grenier</h2><p>Date : ${new Date().toLocaleDateString()}</p>
      <table><tr><th>Ref Facture</th><th>Date/Heure</th><th>Patient</th><th>Montant (FCFA)</th></tr>`;
    let total = 0;
    historiqueVentes.forEach(v => {
      html += `<tr><td>${v.id}</td><td>${v.date} ${v.heure}</td><td>${v.patientNom}</td><td>${v.montant}</td></tr>`;
      total += v.montant;
    });
    html += `</table><div class="total">Total Général : ${total.toLocaleString()} FCFA</div><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
  };


  // --- RENDU UI PRINCIPAL ---
  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30"><ShieldPlus size={32} className="text-white" /></div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clinique ONG Notre Grenier</h1>
            <p className="text-slate-500 text-sm mt-1">Portail de Gestion Sécurisé</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle size={16}/> {loginError}</div>}
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Identifiant</label><input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="ex: admin" required /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Mot de passe</label><input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="••••••••" required /></div>
            <button type="submit" className="mt-4 w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-all"><Lock size={18} /> Connexion</button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 border border-blue-100">
            <strong>Tests :</strong> admin, medecin, infirmier, caisse, accueil (Mdp: 1234)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3"><div className="bg-blue-500 p-2 rounded-lg"><ShieldPlus size={24} className="text-white" /></div><h1 className="text-xl font-bold hidden sm:block">Clinique ONG Notre Grenier</h1></div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block"><p className="text-sm font-bold text-emerald-400">Connecté(e)</p><p className="text-sm font-bold">{loggedInUser.nomComplet} ({loggedInUser.role})</p></div>
          <button onClick={handleLogout} className="bg-slate-800 hover:bg-red-500 p-2.5 rounded-xl border border-slate-700 text-slate-300"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 z-0">
          <nav className="flex flex-col gap-2 px-4">
            {loggedInUser.role === 'Responsable' && <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><BarChart3 size={20} /> Administration</button>}
            {loggedInUser.role === 'Accueil' && <button onClick={() => setActiveTab('accueil')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Réception</button>}
            {loggedInUser.role === 'Infirmier' && <button onClick={() => setActiveTab('triage')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={20} /> Infirmerie</button>}
            {loggedInUser.role === 'Medecin' && <button onClick={() => setActiveTab('medecin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Stethoscope size={20} /> Consultation</button>}
            {loggedInUser.role === 'Caissiere' && <button onClick={() => setActiveTab('pharmacie')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Pill size={20} /> Pharmacie & Caisse</button>}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50 relative">

          {/* === MODULE 0: ADMIN === */}
          {activeTab === 'admin' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full">
              <div className="flex justify-between items-end mb-8">
                <div><h2 className="text-3xl font-bold text-slate-800">Espace Administrateur</h2></div>
              </div>
              <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
                <button onClick={() => setAdminSubTab('stats')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Tableau de bord</button>
                <button onClick={() => setAdminSubTab('stock')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Stock Pharmacie</button>
                <button onClick={() => setAdminSubTab('personnel')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'personnel' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Personnel</button>
                <button onClick={() => setAdminSubTab('rapports')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${adminSubTab === 'rapports' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Rapports Financiers</button>
              </div>

              {adminSubTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border flex items-center gap-4"><div className="bg-blue-100 p-4 rounded-xl text-blue-600"><Users size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Patients du jour</p><p className="text-3xl font-black">{patients.length}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border flex items-center gap-4"><div className="bg-emerald-100 p-4 rounded-xl text-emerald-600"><TrendingUp size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Revenus (FCFA)</p><p className="text-3xl font-black">{historiqueVentes.reduce((acc, v) => acc + v.montant, 0).toLocaleString()}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border border-red-200 flex items-center gap-4"><div className="bg-red-100 p-4 rounded-xl text-red-600"><AlertTriangle size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Alertes Stocks</p><p className="text-3xl font-black text-red-600">{medicaments.filter(m => m.stock < 10).length}</p></div></div>
                </div>
              )}

              {adminSubTab === 'stock' && (
                 <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col">
                 <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold flex items-center gap-2"><Package size={20}/> Base de médicaments</h3><button onClick={() => setShowAddProduct(!showAddProduct)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">{showAddProduct ? 'Fermer' : 'Nouveau Produit'}</button></div>
                 {showAddProduct && (
                   <div className="p-5 bg-blue-50 border-b grid grid-cols-12 gap-4 items-end">
                     <div className="col-span-3"><label className="text-xs font-bold text-slate-500">Nom</label><input type="text" value={newProduct.nom || ''} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} className="w-full p-2.5 border rounded-lg" /></div>
                     <div className="col-span-4"><label className="text-xs font-bold text-slate-500">Code Barre</label><div className="flex gap-2"><input type="text" value={newProduct.codeBarre || ''} onChange={e => setNewProduct({...newProduct, codeBarre: e.target.value})} className="w-full p-2.5 border rounded-lg font-mono" /><button onClick={simulerScanAdmin} className="bg-blue-600 text-white p-2.5 rounded-lg"><Scan size={20}/></button></div></div>
                     <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Prix</label><input type="number" value={newProduct.prix || ''} onChange={e => setNewProduct({...newProduct, prix: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg" /></div>
                     <div className="col-span-3"><label className="text-xs font-bold text-slate-500">Stock</label><div className="flex gap-2"><input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg" /><button onClick={saveProduct} className="bg-slate-900 text-white px-4 rounded-lg font-bold">Créer</button></div></div>
                   </div>
                 )}
                 <table className="w-full text-left text-sm">
                   <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Médicament</th><th className="p-4">Code Barre</th><th className="p-4">Prix</th><th className="p-4">Stock</th><th className="p-4">Action</th></tr></thead>
                   <tbody>
                     {medicaments.map(med => (
                       <tr key={med.id} className="border-b"><td className="p-4 font-bold">{med.nom}</td><td className="p-4 font-mono">{med.codeBarre}</td><td className="p-4">{med.prix.toLocaleString()} F</td><td className="p-4">{med.stock}</td><td className="p-4"><button onClick={() => setMedicaments(medicaments.map(m => m.id === med.id ? {...m, stock: m.stock + 50} : m))} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold">+50</button></td></tr>
                     ))}
                   </tbody>
                 </table>
               </div>
              )}

              {adminSubTab === 'personnel' && (
                 <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col">
                 <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold flex items-center gap-2"><UserPlus size={20}/> Utilisateurs</h3><button onClick={() => setShowAddUser(!showAddUser)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Créer un compte</button></div>
                 {showAddUser && (
                    <div className="p-4 bg-blue-50 border-b grid grid-cols-5 gap-4 items-end">
                     <div><label className="text-xs font-bold">Nom</label><input type="text" onChange={e => setNewUser({...newUser, nomComplet: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                     <div><label className="text-xs font-bold">Login</label><input type="text" onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                     <div><label className="text-xs font-bold">Mdp</label><input type="text" onChange={e => setNewUser({...newUser, mdp: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                     <div><label className="text-xs font-bold">Rôle</label><select onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full p-2 border rounded-lg"><option value="Medecin">Médecin</option><option value="Responsable">Admin</option></select></div>
                     <div><button onClick={saveUser} className="w-full bg-slate-900 text-white p-2 rounded-lg">Enregistrer</button></div>
                   </div>
                 )}
                 <table className="w-full text-left text-sm">
                   <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Nom</th><th className="p-4">Rôle</th><th className="p-4">Login</th><th className="p-4">Actions</th></tr></thead>
                   <tbody>{utilisateurs.map(u => (<tr key={u.id} className="border-b"><td className="p-4 font-bold">{u.nomComplet}</td><td className="p-4">{u.role}</td><td className="p-4">{u.username}</td><td className="p-4"><button onClick={() => deleteUser(u.id)} className="text-red-500"><Trash2 size={16}/></button></td></tr>))}</tbody>
                 </table>
               </div>
              )}

              {adminSubTab === 'rapports' && (
                <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold flex items-center gap-2"><FileBarChart size={20}/> Historique</h3>
                    <div className="flex gap-3"><button onClick={exporterExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Download size={16}/> Exporter Excel</button><button onClick={exporterPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileText size={16}/> Enregistrer PDF</button></div>
                  </div>
                  <div className="p-6">
                    <table className="w-full text-left text-sm border">
                      <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-3">Facture</th><th className="p-3">Date/Heure</th><th className="p-3">Patient</th><th className="p-3 text-right">Montant</th></tr></thead>
                      <tbody>{historiqueVentes.map(v => (<tr key={v.id} className="border-b"><td className="p-3 font-mono text-slate-500">{v.id}</td><td className="p-3">{v.date} {v.heure}</td><td className="p-3 font-bold">{v.patientNom}</td><td className="p-3 text-right font-bold text-emerald-600">{v.montant.toLocaleString()} F</td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODULE 1: ACCUEIL === */}
          {activeTab === 'accueil' && (
             <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Accueil & Enregistrement</h2>
              <p className="text-slate-500 mb-8">Génération automatique des dossiers, tickets d'attente et QR Codes</p>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet du patient</label>
                    <input type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} placeholder="Ex: Koffi Emmanuel" className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Service demandé</label>
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

              {ticketGenere && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-900 text-white text-center p-6 pb-8 rounded-b-[2rem] shadow-inner relative">
                      <p className="text-slate-300 text-sm font-medium uppercase tracking-widest mb-1">Votre Numéro</p>
                      <h1 className="text-5xl font-black tracking-tighter">{ticketGenere.ticket}</h1>
                    </div>
                    <div className="p-8 text-center -mt-6">
                      <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 mx-auto inline-block border border-slate-100">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketGenere.id}`} 
                          alt="QR Code Patient" 
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">{ticketGenere.nom}</h2>
                      <p className="text-slate-500 mt-1">Dossier: <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded">{ticketGenere.id}</span></p>
                    </div>
                    <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
                      <button onClick={() => setTicketGenere(null)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-100">Fermer</button>
                      <button onClick={imprimerTicketAccueil} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Printer size={18} /> Imprimer</button>
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
                       <div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-800">{patient.nom}</span><span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{patient.ticket}</span></div>
                     </div>
                   ))}
                 </div>
                 <div className="col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
                   {selectedPatientTriage ? (
                     <>
                        <h3 className="text-xl font-bold mb-6 border-b pb-4">Prise de constantes : {selectedPatientTriage.nom}</h3>
                        <div className="grid grid-cols-2 gap-6 mb-8">
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Sys</label><input type="number" value={tensionSys} onChange={e => setTensionSys(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Dia</label><input type="number" value={tensionDia} onChange={e => setTensionDia(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><Thermometer size={16} className="text-orange-500"/> Température (°C)</label><input type="number" value={temperature} onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><Weight size={16} className="text-emerald-500"/> Poids (kg)</label><input type="number" value={poids} onChange={e => setPoids(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                        </div>
                        <div className="flex justify-end"><button onClick={validerTriage} disabled={!tensionSys || !tensionDia || !temperature || !poids} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"><CheckCircle2 size={20}/> Transférer au Médecin</button></div>
                     </>
                   ) : <div className="h-full flex flex-col items-center justify-center text-slate-400"><Activity size={48} className="mb-4 opacity-20" /><p>Sélectionnez un patient.</p></div>}
                 </div>
               </div>
             </div>
          )}

          {/* === MODULE 3: MÉDECIN === */}
          {activeTab === 'medecin' && (
            <div className="h-full flex flex-col">
              <h2 className="text-3xl font-bold text-slate-800 mb-6">Bureau du Médecin</h2>
              <div className="grid grid-cols-4 gap-8 flex-1">
                <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Salle d'attente</h3>
                  {patients.filter(p => p.statut === 'Consultation').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientMed(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 ${selectedPatientMed?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block text-slate-800">{patient.nom}</span><span className="text-xs text-slate-500">{patient.constantes?.sys}/{patient.constantes?.dia} mmHg</span>
                    </div>
                  ))}
                </div>

                <div className="col-span-3 bg-white border rounded-2xl flex flex-col shadow-sm">
                  {selectedPatientMed ? (
                    <div className="flex-1 flex flex-col">
                      <div className="bg-slate-900 text-white p-6"><h2 className="text-2xl font-bold">{selectedPatientMed.nom}</h2><p className="text-slate-400 font-mono text-sm">Dossier N° {selectedPatientMed.id}</p></div>
                      <div className="p-6 grid grid-cols-2 gap-6 flex-1">
                        <div className="flex flex-col gap-4">
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Notes Cliniques</label><textarea className="w-full p-4 border rounded-xl h-40 outline-none focus:border-blue-400" value={notesCliniques} onChange={e => setNotesCliniques(e.target.value)} /></div>
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Diagnostic Retenu</label><input type="text" className="w-full p-4 border rounded-xl font-bold outline-none focus:border-blue-400" value={diagnostic} onChange={e => setDiagnostic(e.target.value)} /></div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-5 flex flex-col border border-blue-100">
                          <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Pill size={18}/> Ordonnance Numérique</h4>
                          <div className="bg-white rounded-xl border p-2 mb-4 max-h-40 overflow-y-auto">
                            {medicaments.map(med => {
                              const isSelected = ordonnance.some(m => m.id === med.id);
                              return (
                                <div key={med.id} onClick={() => setOrdonnance(isSelected ? ordonnance.filter(m => m.id !== med.id) : [...ordonnance, med])} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-50'}`}>
                                  <div><span className="text-sm font-bold block">{med.nom}</span><span className="text-xs text-slate-500">{med.prix.toLocaleString()} F</span></div>
                                  {isSelected ? <Check size={18} className="text-blue-600"/> : <PlusCircle size={18} className="text-slate-300"/>}
                                </div>
                              );
                            })}
                          </div>
                          <div className="bg-white border rounded-xl p-4 flex-1 flex flex-col">
                            <ul className="list-disc pl-4 text-sm font-bold text-slate-700 mb-4 flex-1 overflow-y-auto">{ordonnance.map(m => <li key={m.id}>{m.nom}</li>)}</ul>
                            <div className="mt-auto pt-3 border-t flex justify-between items-end"><span className="text-sm text-slate-500 font-bold">Total estimé :</span><span className="text-2xl font-black text-blue-600">{totalOrdonnance.toLocaleString()} F</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                        <button onClick={terminerSansOrdonnance} className="px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl flex items-center gap-2"><Ban size={18}/> Clôturer</button>
                        <div className="flex gap-3"><button onClick={annulerOrdonnance} className="px-6 py-3 bg-white border rounded-xl font-bold">Vider</button><button onClick={envoyerPharmacie} disabled={!diagnostic} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"><CheckCircle2 size={20}/> Envoyer en Pharmacie</button></div>
                      </div>
                    </div>
                  ) : <div className="p-12 h-full flex flex-col items-center justify-center text-slate-400"><Stethoscope size={64} className="mb-4 opacity-20" /><p>Sélectionnez un patient.</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* === MODULE 4: PHARMACIE === */}
          {activeTab === 'pharmacie' && (
            <div className="h-full flex flex-col relative">
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
                </div>

                <div className="col-span-1 bg-white border rounded-2xl p-6 shadow-sm flex flex-col">
                  {selectedPatientPharmacie ? (
                    <div className="mb-6 p-5 bg-yellow-50 border border-yellow-200 rounded-xl shadow-inner">
                      <h4 className="text-xs font-black text-yellow-800 uppercase mb-3 flex items-center gap-2"><FileText size={16}/> À délivrer :</h4>
                      <ul className="text-sm font-bold text-slate-800 space-y-2">
                        {selectedPatientPharmacie.ordonnance?.map(m => <li key={m.id} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5"></div>{m.nom}</li>)}
                      </ul>
                    </div>
                  ) : <div className="mb-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-400 text-center border border-dashed border-slate-300">Scannez le QR Code du patient ou sélectionnez-le à gauche.</div>}

                  <div className="mt-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><Scan size={14}/> Scanner Actif</label>
                    <form onSubmit={e => { e.preventDefault(); handleTraitementScan(codeSaisi); }} className="relative">
                      <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                      <input 
                        ref={inputScanRef} 
                        type="text" 
                        value={codeSaisi} 
                        onChange={(e) => setCodeSaisi(e.target.value)} 
                        placeholder="Scan QR ou Code Barre" 
                        className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl font-mono text-lg outline-none focus:border-blue-500 focus:ring-2"
                      />
                    </form>
                    {messageErreur && <div className="mt-3 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2"><AlertCircle size={16}/> {messageErreur}</div>}
                  </div>
                </div>

                <div className="col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm overflow-hidden relative">
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                    {panier.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300"><Scan size={64} className="mb-4 opacity-20" /><p className="text-slate-500 font-medium">Scannez un produit pour l'ajouter</p></div> : (
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
                  <div className="p-8 bg-slate-900 text-white mt-auto rounded-t-3xl">
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-slate-400 font-medium text-lg">Net à payer</p>
                      <p className="text-5xl font-black text-emerald-400">{panier.reduce((t, l) => t + (l.medicament.prix * l.quantite), 0).toLocaleString()} <span className="text-2xl text-emerald-600">FCFA</span></p>
                    </div>
                    <button onClick={validerPaiement} disabled={panier.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white p-5 rounded-xl font-bold flex justify-center items-center gap-3 text-lg transition-all">
                      <CheckCircle2 size={24} /> Valider l'Encaissement
                    </button>
                  </div>

                  {/* APERÇU DU REÇU (Modal interne de la Pharmacie) */}
                  {recuApercu && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-100 p-6 rounded-2xl shadow-2xl flex flex-col items-center">
                        <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2"><Search size={20}/> Aperçu du ticket 58mm</h3>
                        
                        <div className="bg-white p-4 w-[58mm] min-h-[100mm] shadow-lg mb-6 font-mono text-[10px] text-black border border-slate-300">
                          <div className="text-center font-bold text-sm mb-1">Clinique ONG Notre Grenier</div>
                          <div className="text-center mb-1">Reçu de Caisse</div>
                          <div className="text-center text-[8px]">Le {recuApercu.date} à {recuApercu.heure}</div>
                          <div className="border-t border-dashed border-black my-2"></div>
                          <div>Ticket N°: <span className="font-bold">{recuApercu.id}</span></div>
                          <div>Patient: {recuApercu.patientNom}</div>
                          <div>Caissier: {loggedInUser?.nomComplet}</div>
                          <div className="border-t border-dashed border-black my-2"></div>
                          <div className="flex justify-between font-bold"><span>Désignation</span><span>Prix</span></div>
                          <div className="border-t border-dashed border-black my-2"></div>
                          {recuApercu.detailsPanier.map((l, idx) => (
                            <div key={idx} className="mb-1">
                              <div>{l.medicament.nom}</div>
                              <div className="flex justify-between"><span>{l.quantite} x {l.medicament.prix}F</span><span>{l.quantite * l.medicament.prix}F</span></div>
                            </div>
                          ))}
                          <div className="border-t border-dashed border-black my-2"></div>
                          <div className="flex justify-between font-bold text-xs"><span>TOTAL NET:</span><span>{recuApercu.montant} F</span></div>
                          <div className="border-t border-dashed border-black my-2"></div>
                          
                          {/* NOUVEAU: Le QR code intégré à la maquette du reçu de la caisse */}
                          <div className="flex justify-center my-2">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${recuApercu.id}`} 
                              alt="QR Code Reçu" 
                              className="w-16 h-16 object-contain"
                            />
                          </div>

                          <div className="text-center mt-2 text-[8px]">Bonne guérison !</div>
                        </div>

                        <div className="flex gap-3 w-full">
                          <button onClick={() => setRecuApercu(null)} className="flex-1 bg-slate-300 text-slate-800 p-3 rounded-xl font-bold hover:bg-slate-400">Annuler</button>
                          <button onClick={() => lancerImpressionThermique(recuApercu)} className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2"><Printer size={18}/> Imprimer</button>
                        </div>
                      </div>
                    </div>
                  )}

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
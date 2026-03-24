import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, setDoc, getDocs } from 'firebase/firestore';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, ShieldPlus, Stethoscope as GenMed,
  Scan, Search, Trash2, AlertCircle, ShoppingCart, Camera,
  Clock, CheckCircle2, Thermometer, Weight, HeartPulse,
  FileText, PlusCircle, Check,
  BarChart3, Package, TrendingUp, AlertTriangle, Plus,
  Lock, UserPlus, LogOut, Save, X, FileBarChart, Ban, Download, Menu
} from 'lucide-react';

// ============================================================================
// CONFIGURATION FIREBASE (À remplacer par vos vraies clés Firebase)
// ============================================================================
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmeFkD6L_U9eYymnO8rBGddUisJb0ysqA",
  authDomain: "onggrenier.firebaseapp.com",
  projectId: "onggrenier",
  storageBucket: "onggrenier.firebasestorage.app",
  messagingSenderId: "728693944134",
  appId: "1:728693944134:web:e9d20c5ff05462a0cfff47"
};


let app: any, auth: any, db: any;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase non initialisé. Fonctionnement en mode local (hors ligne).", error);
}

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- BASE DE DONNÉES HYBRIDE (Local + Firebase) ---
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

  // --- ÉTATS RECHERCHES ---
  const [searchMedecin, setSearchMedecin] = useState('');
  const [searchAdminStock, setSearchAdminStock] = useState('');

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

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAdminCameraActive, setIsAdminCameraActive] = useState(false);

  // Focus automatique Scanner Pharmacie
  useEffect(() => {
    if (activeTab === 'pharmacie' && inputScanRef.current && !recuApercu && !isCameraActive) {
      inputScanRef.current.focus();
    }
  }, [activeTab, recuApercu, isCameraActive]);

  // Logique du Scanner avec la caméra (Pharmacie) - CORRIGÉ POUR MOBILE (Caméra arrière)
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;
    if (isCameraActive) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: "environment" } }, false
      );
      html5QrcodeScanner.render(
        (decodedText) => {
          handleTraitementScan(decodedText);
          setIsCameraActive(false); 
        },
        (error) => { /* Ignorer les erreurs de frame vide */ }
      );
    }
    return () => {
      if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(e => console.error(e));
    };
  }, [isCameraActive]);

  // Logique du Scanner (Admin - Ajout Produit)
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;
    if (isAdminCameraActive) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "admin-reader", { fps: 10, qrbox: { width: 250, height: 100 }, videoConstraints: { facingMode: "environment" } }, false
      );
      html5QrcodeScanner.render(
        (decodedText) => {
          setNewProduct({...newProduct, codeBarre: decodedText});
          setIsAdminCameraActive(false);
        },
        (error) => { /* Ignorer les erreurs de frame vide */ }
      );
    }
    return () => {
      if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(e => console.error(e));
    };
  }, [isAdminCameraActive]);


  // --- FONCTIONS SYNCHRONISATION FIREBASE (Optimiste) ---
  const syncToFirebase = async (colName: string, docId: string, data: any) => {
    if (!db) return; // Si Firebase n'est pas configuré, on ignore silencieusement
    try {
      await setDoc(doc(db, colName, docId), data, { merge: true });
    } catch (e) { console.error("Erreur de sync Firebase:", e); }
  };


  // --- FONCTIONS AUTHENTIFICATION (Gère Local ET Firebase) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Si l'identifiant est un email (contient '@'), on tente Firebase Auth
    if (loginUsername.includes('@')) {
      try {
        if (!auth) throw new Error("Firebase n'est pas configuré.");
        const userCredential = await signInWithEmailAndPassword(auth, loginUsername, loginPwd);
        setLoggedInUser({
          id: userCredential.user.uid,
          username: userCredential.user.email || 'Admin',
          mdp: '***',
          role: 'Responsable',
          nomComplet: 'Directeur (Sécurisé)'
        });
        setActiveTab('admin');
      } catch (error: any) {
        setLoginError("Authentification Firebase échouée. Vérifiez vos accès.");
      }
    } else {
      // Sinon, on utilise la base locale pour le personnel (Médecin, Caissière, etc.)
      const user = utilisateurs.find(u => u.username === loginUsername && u.mdp === loginPwd);
      if (user) {
        setLoggedInUser(user);
        if (user.role === 'Responsable') setActiveTab('admin');
        else if (user.role === 'Caissiere') setActiveTab('pharmacie');
        else if (user.role === 'Infirmier') setActiveTab('triage');
        else if (user.role === 'Medecin') setActiveTab('medecin');
        else setActiveTab('accueil');
      } else {
        setLoginError('Identifiant ou mot de passe incorrect.');
      }
    }
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
    
    const newPatientsList = [...patients, newPatient];
    setPatients(newPatientsList); 
    setTicketGenere(newPatient); 
    setNouveauNom('');
    syncToFirebase('patients', newPatient.id, newPatient); // Sync Firebase
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
        <div class="bold" style="font-size:16px;">Clinique Ong Notre Grenier</div>
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
    const patientAjourne = { ...selectedPatientTriage, statut: 'Consultation' as const, constantes: { sys: Number(tensionSys), dia: Number(tensionDia), temp: Number(temperature), poids: Number(poids) } };
    setPatients(patients.map(p => p.id === selectedPatientTriage.id ? patientAjourne : p));
    setSelectedPatientTriage(null); setTensionSys(''); setTensionDia(''); setTemperature(''); setPoids('');
    syncToFirebase('patients', patientAjourne.id, patientAjourne);
  };

  const totalOrdonnance = ordonnance.reduce((sum, med) => sum + med.prix, 0);

  const envoyerPharmacie = () => {
    if (!selectedPatientMed) return;
    const patientAjourne = { ...selectedPatientMed, statut: 'Pharmacie' as const, ordonnance: ordonnance };
    setPatients(patients.map(p => p.id === selectedPatientMed.id ? patientAjourne : p));
    setSelectedPatientMed(null); setNotesCliniques(''); setDiagnostic(''); setOrdonnance([]);
    syncToFirebase('patients', patientAjourne.id, patientAjourne);
  };

  const terminerSansOrdonnance = () => {
    if (!selectedPatientMed) return;
    const patientAjourne = { ...selectedPatientMed, statut: 'Terminé' as const };
    setPatients(patients.map(p => p.id === selectedPatientMed.id ? patientAjourne : p));
    setSelectedPatientMed(null); setNotesCliniques(''); setDiagnostic(''); setOrdonnance([]);
    syncToFirebase('patients', patientAjourne.id, patientAjourne);
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
    const newMeds = medicaments.map(med => {
      const ligne = panier.find(l => l.medicament.id === med.id);
      if (ligne) {
        const medAjourne = { ...med, stock: med.stock - ligne.quantite };
        syncToFirebase('medicaments', medAjourne.id, medAjourne);
        return medAjourne;
      }
      return med;
    });
    setMedicaments(newMeds);
    
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
    syncToFirebase('ventes', nouvelleTransaction.id, nouvelleTransaction);
    
    if (selectedPatientPharmacie) {
      const patientAjourne = { ...selectedPatientPharmacie, statut: 'Terminé' as const };
      setPatients(patients.map(p => p.id === selectedPatientPharmacie.id ? patientAjourne : p));
      setSelectedPatientPharmacie(null);
      syncToFirebase('patients', patientAjourne.id, patientAjourne);
    }
    setPanier([]);
    setRecuApercu(nouvelleTransaction);
  };

  const lancerImpressionThermique = (transaction: RapportVente) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

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
          <div class="center bold" style="font-size:14px; margin-bottom: 2px;">Clinique Ong Notre Grenier</div>
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
    const medFinal = { ...newProduct, id: `M${Date.now()}` } as Medicament;
    setMedicaments([...medicaments, medFinal]);
    syncToFirebase('medicaments', medFinal.id, medFinal);
    setShowAddProduct(false); setNewProduct({ stock: 0, prix: 0 });
    setIsAdminCameraActive(false);
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
      <h2>Rapport des Encaissements - Clinique Ong Notre Grenier</h2><p>Date : ${new Date().toLocaleDateString()}</p>
      <table><tr><th>Ref Facture</th><th>Date/Heure</th><th>Patient</th><th>Montant (FCFA)</th></tr>`;
    let total = 0;
    historiqueVentes.forEach(v => {
      html += `<tr><td>${v.id}</td><td>${v.date} ${v.heure}</td><td>${v.patientNom}</td><td>${v.montant}</td></tr>`;
      total += v.montant;
    });
    html += `</table><div class="total">Total Général : ${total.toLocaleString()} FCFA</div><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
  };

  // --- FILTRES DE RECHERCHE DYNAMIQUES ---
  const filteredAdminStock = medicaments.filter(m => m.nom.toLowerCase().includes(searchAdminStock.toLowerCase()) || m.codeBarre.includes(searchAdminStock));
  const filteredMedecinStock = medicaments.filter(m => m.nom.toLowerCase().includes(searchMedecin.toLowerCase()) || m.codeBarre.includes(searchMedecin));


  // --- RENDU UI PRINCIPAL ---
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
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Identifiant ou Email Admin</label>
              <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="ex: admin@ong.com ou medecin" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Mot de passe</label>
              <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" required />
            </div>
            <button type="submit" className="mt-4 w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-all"><Lock size={18} /> Connexion</button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 border border-blue-100 text-center">
            <strong>Tests Locaux :</strong> admin, medecin, infirmier, caisse, accueil (Mdp: 1234)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      {/* HEADER RESPONSIVE */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-30 relative">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 bg-slate-800 rounded-lg text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="bg-blue-500 p-2 rounded-lg"><ShieldPlus size={24} className="text-white" /></div>
          <h1 className="text-xl font-bold hidden sm:block">Clinique Ong Notre Grenier</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block"><p className="text-sm font-bold text-emerald-400">Connecté(e)</p><p className="text-sm font-bold">{loggedInUser.nomComplet} ({loggedInUser.role})</p></div>
          <button onClick={handleLogout} className="bg-slate-800 hover:bg-red-500 p-2.5 rounded-xl border border-slate-700 text-slate-300"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR RESPONSIVE */}
        <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-white border-r border-slate-200 py-6 absolute md:relative z-20 h-full shadow-xl md:shadow-none transition-all`}>
          <nav className="flex flex-col gap-2 px-4">
            {loggedInUser.role === 'Responsable' && <button onClick={() => {setActiveTab('admin'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><BarChart3 size={20} /> Administration</button>}
            {loggedInUser.role === 'Accueil' && <button onClick={() => {setActiveTab('accueil'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Réception</button>}
            {loggedInUser.role === 'Infirmier' && <button onClick={() => {setActiveTab('triage'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={20} /> Infirmerie</button>}
            {loggedInUser.role === 'Medecin' && <button onClick={() => {setActiveTab('medecin'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Stethoscope size={20} /> Consultation</button>}
            {loggedInUser.role === 'Caissiere' && <button onClick={() => {setActiveTab('pharmacie'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Pill size={20} /> Pharmacie & Caisse</button>}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 relative w-full">
          {isMobileMenuOpen && <div className="absolute inset-0 bg-slate-900/50 z-10 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

          {/* === MODULE 0: ADMIN === */}
          {activeTab === 'admin' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div><h2 className="text-2xl md:text-3xl font-bold text-slate-800">Espace Administrateur</h2></div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-2 overflow-x-auto w-full">
                <button onClick={() => setAdminSubTab('stats')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Tableau de bord</button>
                <button onClick={() => setAdminSubTab('stock')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Stock Pharmacie</button>
                <button onClick={() => setAdminSubTab('personnel')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'personnel' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Personnel</button>
                <button onClick={() => setAdminSubTab('rapports')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'rapports' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Rapports</button>
              </div>

              {adminSubTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="bg-white p-6 rounded-2xl border flex items-center gap-4"><div className="bg-blue-100 p-4 rounded-xl text-blue-600"><Users size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Patients du jour</p><p className="text-3xl font-black">{patients.length}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border flex items-center gap-4"><div className="bg-emerald-100 p-4 rounded-xl text-emerald-600"><TrendingUp size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Revenus (FCFA)</p><p className="text-3xl font-black">{historiqueVentes.reduce((acc, v) => acc + v.montant, 0).toLocaleString()}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border border-red-200 flex items-center gap-4"><div className="bg-red-100 p-4 rounded-xl text-red-600"><AlertTriangle size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Alertes Stocks</p><p className="text-3xl font-black text-red-600">{medicaments.filter(m => m.stock < 10).length}</p></div></div>
                </div>
              )}

              {adminSubTab === 'stock' && (
                 <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                 <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                   <h3 className="font-bold flex items-center gap-2"><Package size={20}/> Base de médicaments</h3>
                   <div className="flex w-full sm:w-auto gap-3">
                     {/* NOUVEAU: Barre de recherche Admin */}
                     <div className="relative flex-1 sm:w-64">
                       <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                       <input type="text" placeholder="Rechercher..." value={searchAdminStock} onChange={e => setSearchAdminStock(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500" />
                     </div>
                     <button onClick={() => setShowAddProduct(!showAddProduct)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap">{showAddProduct ? 'Fermer' : 'Nouveau Produit'}</button>
                   </div>
                 </div>
                 
                 {showAddProduct && (
                   <div className="p-5 bg-blue-50 border-b flex flex-col gap-4">
                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                       <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500">Nom</label><input type="text" value={newProduct.nom || ''} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} className="w-full p-2.5 border rounded-lg" /></div>
                       <div className="md:col-span-4"><label className="text-xs font-bold text-slate-500">Code Barre (Saisie ou Scan)</label><div className="flex gap-2"><input type="text" value={newProduct.codeBarre || ''} onChange={e => setNewProduct({...newProduct, codeBarre: e.target.value})} className="w-full p-2.5 border rounded-lg font-mono" /><button onClick={() => setIsAdminCameraActive(!isAdminCameraActive)} className={`${isAdminCameraActive ? 'bg-red-600' : 'bg-blue-600'} text-white p-2.5 rounded-lg flex-shrink-0`}><Camera size={20}/></button></div></div>
                       <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Prix</label><input type="number" value={newProduct.prix || ''} onChange={e => setNewProduct({...newProduct, prix: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg" /></div>
                       <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500">Stock Initial</label><div className="flex gap-2"><input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg" /><button onClick={saveProduct} className="bg-slate-900 text-white px-4 py-2.5 rounded-lg font-bold w-full md:w-auto">Créer</button></div></div>
                     </div>
                     {isAdminCameraActive && (
                       <div className="w-full max-w-sm mx-auto bg-white p-2 rounded-xl shadow-inner border border-slate-300">
                         <div id="admin-reader" className="w-full"></div>
                         <p className="text-center text-xs text-slate-500 mt-2">Placez le code-barre devant la caméra</p>
                       </div>
                     )}
                   </div>
                 )}
                 <div className="w-full overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                     <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Médicament</th><th className="p-4">Code Barre</th><th className="p-4">Prix</th><th className="p-4">Stock</th><th className="p-4">Action</th></tr></thead>
                     <tbody>
                       {filteredAdminStock.map(med => (
                         <tr key={med.id} className="border-b"><td className="p-4 font-bold">{med.nom}</td><td className="p-4 font-mono">{med.codeBarre}</td><td className="p-4">{med.prix.toLocaleString()} F</td><td className="p-4">{med.stock}</td><td className="p-4"><button onClick={() => {
                           const updatedMed = {...med, stock: med.stock + 50};
                           setMedicaments(medicaments.map(m => m.id === med.id ? updatedMed : m));
                           syncToFirebase('medicaments', med.id, updatedMed);
                         }} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold">+50</button></td></tr>
                       ))}
                       {filteredAdminStock.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Aucun médicament trouvé.</td></tr>}
                     </tbody>
                   </table>
                 </div>
               </div>
              )}

              {adminSubTab === 'personnel' && (
                 <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                 <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4"><h3 className="font-bold flex items-center gap-2"><UserPlus size={20}/> Utilisateurs</h3><button onClick={() => setShowAddUser(!showAddUser)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold w-full sm:w-auto">Créer un compte</button></div>
                 {showAddUser && (
                    <div className="p-4 bg-blue-50 border-b grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                     <div><label className="text-xs font-bold">Nom</label><input type="text" onChange={e => setNewUser({...newUser, nomComplet: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                     <div><label className="text-xs font-bold">Login</label><input type="text" onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                     <div><label className="text-xs font-bold">Mdp</label><input type="text" onChange={e => setNewUser({...newUser, mdp: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                     <div><label className="text-xs font-bold">Rôle</label><select onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full p-2 border rounded-lg"><option value="Medecin">Médecin</option><option value="Responsable">Admin</option></select></div>
                     <div><button onClick={saveUser} className="w-full bg-slate-900 text-white p-2 rounded-lg">Enregistrer</button></div>
                   </div>
                 )}
                 <div className="w-full overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                     <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Nom</th><th className="p-4">Rôle</th><th className="p-4">Login</th><th className="p-4">Actions</th></tr></thead>
                     <tbody>{utilisateurs.map(u => (<tr key={u.id} className="border-b"><td className="p-4 font-bold">{u.nomComplet}</td><td className="p-4">{u.role}</td><td className="p-4">{u.username}</td><td className="p-4"><button onClick={() => deleteUser(u.id)} className="text-red-500"><Trash2 size={16}/></button></td></tr>))}</tbody>
                   </table>
                 </div>
               </div>
              )}

              {adminSubTab === 'rapports' && (
                <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                    <h3 className="font-bold flex items-center gap-2"><FileBarChart size={20}/> Historique</h3>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"><button onClick={exporterExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 w-full sm:w-auto"><Download size={16}/> Exporter Excel</button><button onClick={exporterPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 w-full sm:w-auto"><FileText size={16}/> Enregistrer PDF</button></div>
                  </div>
                  <div className="w-full overflow-x-auto p-4 md:p-6">
                    <table className="w-full text-left text-sm border whitespace-nowrap min-w-[600px]">
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
             <div className="max-w-4xl mx-auto h-full overflow-y-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Accueil & Enregistrement</h2>
              <p className="text-slate-500 mb-6 md:mb-8 text-sm md:text-base">Génération automatique des dossiers, tickets d'attente et QR Codes</p>

              <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet du patient</label>
                    <input type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} placeholder="Ex: Koffi Emmanuel" className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Service demandé</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setNouveauService('GEN')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all text-sm md:text-base ${nouveauService === 'GEN' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><GenMed size={18}/> Général</button>
                      <button onClick={() => setNouveauService('PED')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all text-sm md:text-base ${nouveauService === 'PED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Baby size={18}/> Pédiatrie</button>
                      <button onClick={() => setNouveauService('MAT')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all text-sm md:text-base ${nouveauService === 'MAT' ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Heart size={18}/> Maternité</button>
                      <button onClick={() => setNouveauService('CHIR')} className={`p-3 rounded-xl border flex items-center gap-2 justify-center transition-all text-sm md:text-base ${nouveauService === 'CHIR' ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Activity size={18}/> Chirurgie</button>
                    </div>
                  </div>
                </div>
                <button onClick={genererTicket} disabled={!nouveauNom.trim()} className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  <QrCode size={20} /> Générer le Dossier et le Ticket
                </button>
              </div>

              {ticketGenere && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
               <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Infirmerie - Triage</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                 <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[40vh] md:max-h-full">
                   <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Patients en attente</h3>
                   {patients.filter(p => p.statut === 'Triage').map(patient => (
                     <div key={patient.id} onClick={() => setSelectedPatientTriage(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientTriage?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                       <div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-800">{patient.nom}</span><span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{patient.ticket}</span></div>
                     </div>
                   ))}
                 </div>
                 <div className="md:col-span-2 bg-white border rounded-2xl p-4 md:p-6 shadow-sm overflow-y-auto">
                   {selectedPatientTriage ? (
                     <>
                        <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 border-b pb-4">Prise de constantes : {selectedPatientTriage.nom}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Sys</label><input type="number" value={tensionSys} onChange={e => setTensionSys(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Dia</label><input type="number" value={tensionDia} onChange={e => setTensionDia(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><Thermometer size={16} className="text-orange-500"/> Température (°C)</label><input type="number" value={temperature} onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2"><Weight size={16} className="text-emerald-500"/> Poids (kg)</label><input type="number" value={poids} onChange={e => setPoids(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                        </div>
                        <div className="flex justify-end"><button onClick={validerTriage} disabled={!tensionSys || !tensionDia || !temperature || !poids} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 size={20}/> Transférer au Médecin</button></div>
                     </>
                   ) : <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12"><Activity size={48} className="mb-4 opacity-20" /><p>Sélectionnez un patient.</p></div>}
                 </div>
               </div>
             </div>
          )}

          {/* === MODULE 3: MÉDECIN === */}
          {activeTab === 'medecin' && (
            <div className="h-full flex flex-col">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Bureau du Médecin</h2>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[30vh] lg:max-h-full">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Salle d'attente</h3>
                  {patients.filter(p => p.statut === 'Consultation').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientMed(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 ${selectedPatientMed?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block text-slate-800">{patient.nom}</span><span className="text-xs text-slate-500">{patient.constantes?.sys}/{patient.constantes?.dia} mmHg</span>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-3 bg-white border rounded-2xl flex flex-col shadow-sm overflow-hidden">
                  {selectedPatientMed ? (
                    <div className="flex-1 flex flex-col overflow-y-auto">
                      <div className="bg-slate-900 text-white p-4 md:p-6"><h2 className="text-xl md:text-2xl font-bold">{selectedPatientMed.nom}</h2><p className="text-slate-400 font-mono text-sm">Dossier N° {selectedPatientMed.id}</p></div>
                      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                        <div className="flex flex-col gap-4">
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Notes Cliniques</label><textarea className="w-full p-4 border rounded-xl h-32 md:h-40 outline-none focus:border-blue-400" value={notesCliniques} onChange={e => setNotesCliniques(e.target.value)} /></div>
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Diagnostic Retenu</label><input type="text" className="w-full p-4 border rounded-xl font-bold outline-none focus:border-blue-400" value={diagnostic} onChange={e => setDiagnostic(e.target.value)} /></div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 md:p-5 flex flex-col border border-blue-100 min-h-[300px]">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-blue-900 flex items-center gap-2"><Pill size={18}/> Ordonnance Numérique</h4>
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded hidden sm:block">Prix transparents</span>
                          </div>
                          
                          {/* NOUVEAU: Barre de recherche Médecin */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input type="text" placeholder="Rechercher un médicament..." value={searchMedecin} onChange={e => setSearchMedecin(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500" />
                          </div>

                          <div className="bg-white rounded-xl border p-2 mb-4 max-h-32 md:max-h-40 overflow-y-auto">
                            {filteredMedecinStock.map(med => {
                              const isSelected = ordonnance.some(m => m.id === med.id);
                              return (
                                <div key={med.id} onClick={() => setOrdonnance(isSelected ? ordonnance.filter(m => m.id !== med.id) : [...ordonnance, med])} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-50'}`}>
                                  <div><span className="text-sm font-bold block">{med.nom}</span><span className="text-xs text-slate-500">{med.prix.toLocaleString()} F</span></div>
                                  {isSelected ? <Check size={18} className="text-blue-600"/> : <PlusCircle size={18} className="text-slate-300"/>}
                                </div>
                              );
                            })}
                            {filteredMedecinStock.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Aucun médicament trouvé.</p>}
                          </div>
                          <div className="bg-white border rounded-xl p-4 flex-1 flex flex-col">
                            <ul className="list-disc pl-4 text-sm font-bold text-slate-700 mb-4 flex-1 overflow-y-auto">{ordonnance.map(m => <li key={m.id}>{m.nom}</li>)}</ul>
                            <div className="mt-auto pt-3 border-t flex justify-between items-end"><span className="text-sm text-slate-500 font-bold">Total estimé :</span><span className="text-xl md:text-2xl font-black text-blue-600">{totalOrdonnance.toLocaleString()} F</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button onClick={terminerSansOrdonnance} className="w-full sm:w-auto px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl flex items-center justify-center gap-2"><Ban size={18}/> Clôturer sans ordonnance</button>
                        <div className="flex gap-3 w-full sm:w-auto"><button onClick={annulerOrdonnance} className="flex-1 sm:flex-none px-6 py-3 bg-white border rounded-xl font-bold">Vider</button><button onClick={envoyerPharmacie} disabled={!diagnostic} className="flex-1 sm:flex-none bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 size={20}/> Envoyer Caisse</button></div>
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
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Caisse Pharmacie</h2>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                
                <div className="col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[25vh] lg:max-h-full">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18}/> Patients envoyés</h3>
                  {patients.filter(p => p.statut === 'Pharmacie').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientPharmacie(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientPharmacie?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block text-slate-800">{patient.nom}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mt-1 inline-block font-bold">Ordonnance: {patient.ordonnance?.length || 0} produit(s)</span>
                    </div>
                  ))}
                </div>

                <div className="col-span-1 lg:col-span-1 bg-white border rounded-2xl p-4 md:p-6 shadow-sm flex flex-col overflow-y-auto">
                  {selectedPatientPharmacie ? (
                    <div className="mb-6 p-4 md:p-5 bg-yellow-50 border border-yellow-200 rounded-xl shadow-inner">
                      <h4 className="text-xs font-black text-yellow-800 uppercase mb-3 flex items-center gap-2"><FileText size={16}/> À délivrer :</h4>
                      <ul className="text-sm font-bold text-slate-800 space-y-2">
                        {selectedPatientPharmacie.ordonnance?.map(m => <li key={m.id} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5"></div>{m.nom}</li>)}
                      </ul>
                    </div>
                  ) : <div className="mb-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-400 text-center border border-dashed border-slate-300">Sélectionnez le patient à gauche ou scannez son QR Code.</div>}

                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Scan size={14}/> Scanner Actif</label>
                      <button onClick={() => setIsCameraActive(!isCameraActive)} className={`p-2 rounded-lg text-white ${isCameraActive ? 'bg-red-500' : 'bg-blue-600'}`}>
                        <Camera size={16} />
                      </button>
                    </div>

                    {isCameraActive && (
                      <div className="mb-4 bg-black rounded-xl overflow-hidden border-2 border-blue-500 w-full max-w-sm mx-auto">
                        <div id="reader" className="w-full"></div>
                        <p className="text-white text-xs text-center p-2">Caméra active - Pointez vers un code</p>
                      </div>
                    )}

                    <form onSubmit={e => { e.preventDefault(); handleTraitementScan(codeSaisi); }} className="relative">
                      <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                      <input 
                        ref={inputScanRef} 
                        type="text" 
                        value={codeSaisi} 
                        onChange={(e) => setCodeSaisi(e.target.value)} 
                        placeholder="Scan QR ou Code Barre" 
                        className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl font-mono text-sm md:text-lg outline-none focus:border-blue-500 focus:ring-2"
                      />
                    </form>
                    {messageErreur && <div className="mt-3 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2"><AlertCircle size={16}/> {messageErreur}</div>}
                  </div>
                </div>

                <div className="col-span-1 lg:col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm overflow-hidden relative">
                  <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50/50">
                    {panier.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12"><Scan size={64} className="mb-4 opacity-20" /><p className="text-slate-500 font-medium">Scannez un produit pour l'ajouter</p></div> : (
                      <div className="flex flex-col gap-3">
                        {panier.map((ligne, i) => (
                          <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm gap-4">
                            <div><h4 className="font-bold text-slate-800">{ligne.medicament.nom}</h4><p className="text-xs text-slate-400 font-mono mt-1">Ref: {ligne.medicament.codeBarre}</p></div>
                            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-center"><p className="text-xs text-slate-400">Qté</p><p className="font-bold">x{ligne.quantite}</p></div>
                              <div className="text-right w-24"><p className="text-xs text-slate-400">Prix</p><p className="font-bold text-blue-600">{(ligne.medicament.prix * ligne.quantite).toLocaleString()} F</p></div>
                              <button onClick={() => setPanier(panier.filter(l => l.medicament.id !== ligne.medicament.id))} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-6 md:p-8 bg-slate-900 text-white mt-auto md:rounded-t-3xl">
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-slate-400 font-medium text-base md:text-lg">Net à payer</p>
                      <p className="text-3xl md:text-5xl font-black text-emerald-400">{panier.reduce((t, l) => t + (l.medicament.prix * l.quantite), 0).toLocaleString()} <span className="text-xl md:text-2xl text-emerald-600">FCFA</span></p>
                    </div>
                    <button onClick={validerPaiement} disabled={panier.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white p-4 md:p-5 rounded-xl font-bold flex justify-center items-center gap-3 text-base md:text-lg transition-all">
                      <CheckCircle2 size={24} /> Valider l'Encaissement
                    </button>
                  </div>

                  {/* APERÇU DU REÇU */}
                  {recuApercu && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-100 p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full">
                        <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2"><Search size={20}/> Aperçu du ticket</h3>
                        
                        <div className="bg-white p-4 w-[58mm] min-h-[100mm] shadow-lg mb-6 font-mono text-[10px] text-black border border-slate-300 mx-auto">
                          <div className="text-center font-bold text-sm mb-1">Clinique Ong Notre Grenier</div>
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
                          
                          <div className="flex justify-center my-2">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${recuApercu.id}`} alt="QR Code Reçu" className="w-16 h-16 object-contain" />
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
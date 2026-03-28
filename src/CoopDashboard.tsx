import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, setDoc, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, Stethoscope as GenMed,
  Scan, Search, Trash2, AlertCircle, ShoppingCart, Camera,
  Clock, CheckCircle2, Thermometer, Weight, HeartPulse,
  FileText, PlusCircle, Check,
  BarChart3, Package, TrendingUp, AlertTriangle, Plus,
  Lock, UserPlus, LogOut, Save, X, FileBarChart, Ban, Download, Menu, Wand2, Eye, TestTubes
} from 'lucide-react';

// ============================================================================
// CONFIGURATION FIREBASE ONG GRENIER
// ============================================================================
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
  console.warn("Firebase non initialisé. Fonctionnement en mode local.", error);
}

export { app, auth, db };

// --- TYPES DE DONNÉES ---
type Role = 'Responsable' | 'Medecin' | 'Infirmier' | 'Caissiere' | 'Accueil' | 'Superviseur' | 'President';
type ServiceType = 'PED' | 'GEN' | 'MAT' | 'CHIR';

const PRIX_CONSULTATION: Record<ServiceType, number> = {
  GEN: 5000,
  PED: 4000,
  MAT: 6000,
  CHIR: 10000
};

interface User { id: string; username: string; mdp: string; role: Role; nomComplet: string; }
interface ConstantesVitales { sys: number; dia: number; temp: number; poids: number; }
interface Medicament { id: string; codeBarre: string; nom: string; stock: number; prix: number; }
interface ExamenLabo { id: string; nom: string; prix: number; } // NOUVEAU: Type pour les examens
interface LignePanier { medicament: Medicament; quantite: number; }
interface LigneOrdonnance { medicament: Medicament; quantite: number; }
interface RapportVente { id: string; patientNom: string; montant: number; heure: string; date: string; detailsPanier: LignePanier[]; detailsExamens?: ExamenLabo[]; }

interface Patient {
  id: string; 
  dossierId?: string; 
  ticket: string; 
  nom: string; 
  service: ServiceType;
  statut: 'Accueil' | 'Triage' | 'Consultation' | 'Pharmacie' | 'Terminé';
  heureArrivee: string; 
  dateArrivee: string;
  constantes?: ConstantesVitales; 
  ordonnance?: LigneOrdonnance[];
  examens?: ExamenLabo[]; // NOUVEAU: Examens prescrits au patient
}

const ClinicDashboard: React.FC = () => {
  // --- ÉTATS GLOBAUX & AUTHENTIFICATION ---
  const [utilisateurs, setUtilisateurs] = useState<User[]>([
    { id: 'U1', username: 'admin', mdp: '1234', role: 'Responsable', nomComplet: 'Directeur Général' },
    { id: 'U2', username: 'medecin', mdp: '1234', role: 'Medecin', nomComplet: 'Dr. Koffi' },
    { id: 'U3', username: 'infirmier', mdp: '1234', role: 'Infirmier', nomComplet: 'Inf. Traoré' },
    { id: 'U4', username: 'caisse', mdp: '1234', role: 'Caissiere', nomComplet: 'Caisse Principale' },
    { id: 'U5', username: 'accueil', mdp: '1234', role: 'Accueil', nomComplet: 'Secrétariat' },
    { id: 'U6', username: 'president', mdp: '1234', role: 'President', nomComplet: 'M. le Président' },
    { id: 'U7', username: 'superviseur', mdp: '1234', role: 'Superviseur', nomComplet: 'Superviseur Opérationnel' },
  ]);

  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'accueil' | 'triage' | 'medecin' | 'pharmacie' | 'admin'>('accueil');
  const [adminSubTab, setAdminSubTab] = useState<'stats' | 'stock' | 'labo' | 'personnel' | 'rapports'>('stats'); // AJOUT DU TAB LABO
  const [docSubTab, setDocSubTab] = useState<'ordonnance' | 'labo'>('ordonnance'); // AJOUT DU TAB MEDECIN
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- BASE DE DONNÉES HYBRIDE ---
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [examensLabo, setExamensLabo] = useState<ExamenLabo[]>([]); // NOUVEAU: Base de données des examens
  const [historiqueVentes, setHistoriqueVentes] = useState<RapportVente[]>([]);

  // --- ÉTATS ACCUEIL ---
  const [typePatientAccueil, setTypePatientAccueil] = useState<'nouveau' | 'ancien'>('nouveau');
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauService, setNouveauService] = useState<ServiceType>('GEN');
  const [ticketGenere, setTicketGenere] = useState<Patient | null>(null);
  const [ancienDossierId, setAncienDossierId] = useState<string | null>(null);
  
  // --- ÉTATS RECHERCHES ---
  const [searchMedecin, setSearchMedecin] = useState('');
  const [searchAdminStock, setSearchAdminStock] = useState('');

  // --- ÉTATS SPÉCIFIQUES ---
  const [selectedPatientTriage, setSelectedPatientTriage] = useState<Patient | null>(null);
  const [tensionSys, setTensionSys] = useState<number | ''>('');
  const [tensionDia, setTensionDia] = useState<number | ''>('');
  const [temperature, setTemperature] = useState<number | ''>('');
  const [poids, setPoids] = useState<number | ''>('');

  const [selectedPatientMed, setSelectedPatientMed] = useState<Patient | null>(null);
  const [notesCliniques, setNotesCliniques] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [ordonnance, setOrdonnance] = useState<LigneOrdonnance[]>([]);
  const [examensPrescrits, setExamensPrescrits] = useState<ExamenLabo[]>([]); // NOUVEAU: Examens prescrits par le doc

  const [selectedPatientPharmacie, setSelectedPatientPharmacie] = useState<Patient | null>(null);
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [panierExamens, setPanierExamens] = useState<ExamenLabo[]>([]); // NOUVEAU: Examens à payer en caisse
  const [codeSaisi, setCodeSaisi] = useState('');
  const [messageErreur, setMessageErreur] = useState('');
  const [recuApercu, setRecuApercu] = useState<RapportVente | null>(null); 
  const inputScanRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAdminCameraActive, setIsAdminCameraActive] = useState(false);
  const [isAccueilCameraActive, setIsAccueilCameraActive] = useState(false);

  // ==========================================================================
  // SYNERGIE TEMPS RÉEL (FIREBASE)
  // ==========================================================================
  useEffect(() => {
    if (!db) return;
    
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const data: Patient[] = [];
      snapshot.forEach(doc => data.push(doc.data() as Patient));
      setPatients(data);
    });

    const unsubMedicaments = onSnapshot(collection(db, 'medicaments'), (snapshot) => {
      const data: Medicament[] = [];
      snapshot.forEach(doc => data.push(doc.data() as Medicament));
      setMedicaments(data);
    });

    // Écoute de la collection des examens de laboratoire
    const unsubExamens = onSnapshot(collection(db, 'examens'), (snapshot) => {
      const data: ExamenLabo[] = [];
      snapshot.forEach(doc => data.push(doc.data() as ExamenLabo));
      setExamensLabo(data);
    });

    const unsubVentes = onSnapshot(collection(db, 'ventes'), (snapshot) => {
      const data: RapportVente[] = [];
      snapshot.forEach(doc => data.push(doc.data() as RapportVente));
      data.sort((a, b) => new Date(b.date + ' ' + b.heure).getTime() - new Date(a.date + ' ' + a.heure).getTime());
      setHistoriqueVentes(data);
    });

    const unsubUtilisateurs = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      const data: User[] = [];
      snapshot.forEach(doc => data.push(doc.data() as User));
      if (data.length > 0) setUtilisateurs(data);
    });

    return () => { unsubPatients(); unsubMedicaments(); unsubExamens(); unsubVentes(); unsubUtilisateurs(); };
  }, []);

  const syncToFirebase = async (colName: string, docId: string, data: any) => {
    if (!db) return;
    try { await setDoc(doc(db, colName, docId), data, { merge: true }); } 
    catch (e) { console.error("Firebase offline mode", e); }
  };

  const removeFromFirebase = async (colName: string, docId: string) => {
    if (!db) return;
    try { await deleteDoc(doc(db, colName, docId)); } 
    catch (e) { console.error("Erreur suppression Firebase:", e); }
  };


  // ==========================================================================
  // SCANNERS (HTML5QRCODE NATIF)
  // ==========================================================================
  const handleTraitementScan = useCallback((code: string) => {
    setMessageErreur('');
    if (code.startsWith('DOS-')) {
      const patientTrouve = patients.find(p => (p.dossierId === code || p.id === code) && p.statut === 'Pharmacie');
      if (patientTrouve) {
        setSelectedPatientPharmacie(patientTrouve);
        // On charge automatiquement les examens prescrits dans le panier de la caisse
        setPanierExamens(patientTrouve.examens || []);
      } else {
        setMessageErreur('Dossier patient introuvable ou non envoyé en pharmacie.');
      }
    } else {
      const med = medicaments.find(m => m.codeBarre === code);
      if (!med) return setMessageErreur('Médicament introuvable.');
      if (med.stock <= 0) return setMessageErreur(`Rupture de stock pour ${med.nom}.`);
      
      setPanier(prev => {
        const existant = prev.find(l => l.medicament.id === med.id);
        if (existant) {
          if (existant.quantite >= med.stock) { setMessageErreur('Stock maximum atteint.'); return prev; }
          return prev.map(l => l.medicament.id === med.id ? { ...l, quantite: l.quantite + 1 } : l);
        }
        return [...prev, { medicament: med, quantite: 1 }];
      });
    }
    setCodeSaisi(''); 
  }, [patients, medicaments]);

  const handleTraitementScanRef = useRef(handleTraitementScan);
  useEffect(() => { handleTraitementScanRef.current = handleTraitementScan; }, [handleTraitementScan]);

  useEffect(() => {
    if (activeTab === 'pharmacie' && inputScanRef.current && !recuApercu && !isCameraActive) {
      inputScanRef.current.focus();
    }
  }, [activeTab, recuApercu, isCameraActive]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isAccueilCameraActive) {
      setTimeout(() => {
        const el = document.getElementById("accueil-reader");
        if (!el) return;
        html5QrCode = new Html5Qrcode("accueil-reader");
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (decodedText.startsWith('DOS-')) {
              const pastVisits = patients.filter(p => p.dossierId === decodedText || p.id === decodedText);
              if (pastVisits.length > 0) {
                setAncienDossierId(decodedText);
                setNouveauNom(pastVisits[0].nom); 
              } else {
                alert("Dossier inconnu dans le système.");
              }
            }
            html5QrCode?.stop().then(() => setIsAccueilCameraActive(false));
          },
          (errorMessage) => {}
        ).catch(err => {
          console.error("Camera Error:", err);
          alert("Impossible d'activer la caméra. Vérifiez les permissions.");
          setIsAccueilCameraActive(false);
        });
      }, 200);
    }
    return () => { if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(e => console.error(e)); };
  }, [isAccueilCameraActive, patients]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isCameraActive) {
      setTimeout(() => {
        const el = document.getElementById("reader");
        if (!el) return;
        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleTraitementScanRef.current(decodedText);
            html5QrCode?.stop().then(() => setIsCameraActive(false));
          },
          (errorMessage) => {}
        ).catch(err => {
          console.error("Camera Error:", err);
          setMessageErreur("Impossible d'activer la caméra.");
          setIsCameraActive(false);
        });
      }, 200);
    }
    return () => { if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(e => console.error(e)); };
  }, [isCameraActive]);

  const handleAdminScanRef = useRef((code: string) => setNewProduct(prev => ({...prev, codeBarre: code})));
  useEffect(() => { handleAdminScanRef.current = (code) => setNewProduct(prev => ({...prev, codeBarre: code})); }, []);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isAdminCameraActive) {
      setTimeout(() => {
        const el = document.getElementById("admin-reader");
        if (!el) return;
        html5QrCode = new Html5Qrcode("admin-reader");
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText) => {
            handleAdminScanRef.current(decodedText);
            html5QrCode?.stop().then(() => setIsAdminCameraActive(false));
          },
          (errorMessage) => {}
        ).catch(err => {
          console.error("Camera Error:", err);
          alert("Impossible d'activer la caméra.");
          setIsAdminCameraActive(false);
        });
      }, 200);
    }
    return () => { if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(e => console.error(e)); };
  }, [isAdminCameraActive]);


  // --- AUTHENTIFICATION ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginUsername.includes('@')) {
      try {
        if (!auth) throw new Error("Firebase non configuré.");
        const userCredential = await signInWithEmailAndPassword(auth, loginUsername, loginPwd);
        setLoggedInUser({
          id: userCredential.user.uid, username: userCredential.user.email || 'Admin',
          mdp: '***', role: 'Responsable', nomComplet: 'Directeur (Sécurisé)'
        });
        setActiveTab('admin');
      } catch (error: any) { setLoginError("Authentification Firebase échouée."); }
    } else {
      const user = utilisateurs.find(u => u.username === loginUsername && u.mdp === loginPwd);
      if (user) {
        setLoggedInUser(user);
        if (user.role === 'Responsable' || user.role === 'President') setActiveTab('admin');
        else if (user.role === 'Caissiere') setActiveTab('pharmacie');
        else if (user.role === 'Infirmier') setActiveTab('triage');
        else if (user.role === 'Medecin') setActiveTab('medecin');
        else setActiveTab('accueil'); 
      } else setLoginError('Identifiant ou mot de passe incorrect.');
    }
  };

  const handleLogout = () => { setLoggedInUser(null); setLoginUsername(''); setLoginPwd(''); setTicketGenere(null); setRecuApercu(null); setAncienDossierId(null); };

  // --- LOGIQUE MÉTIER ACCUEIL ---
  const genererTicket = () => {
    if (!nouveauNom.trim()) return;
    
    const todayDate = new Date().toLocaleDateString();
    const patientsAujourdhui = patients.filter(p => p.service === nouveauService && p.dateArrivee === todayDate);
    const numeroFormatte = (patientsAujourdhui.length + 1).toString().padStart(3, '0');
    
    const finalDossierId = ancienDossierId || `DOS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const newPatient: Patient = {
      id: `VIS-${Date.now()}`, 
      dossierId: finalDossierId,
      ticket: `${nouveauService}-${numeroFormatte}`, 
      nom: nouveauNom, service: nouveauService,
      statut: 'Triage', 
      heureArrivee: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateArrivee: todayDate
    };
    
    setPatients(prev => [...prev, newPatient]); 
    setTicketGenere(newPatient); 
    setNouveauNom('');
    setAncienDossierId(null);
    syncToFirebase('patients', newPatient.id, newPatient);

    const prixConsultation = PRIX_CONSULTATION[nouveauService];
    const consultationVente: RapportVente = {
      id: `REC-${Math.floor(Math.random() * 10000)}`,
      patientNom: newPatient.nom,
      montant: prixConsultation,
      heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      detailsPanier: [{ medicament: { id: 'CONS', nom: `Consultation ${nouveauService}`, prix: prixConsultation, stock: 999, codeBarre: '' }, quantite: 1 }]
    };
    setHistoriqueVentes(prev => [consultationVente, ...prev]);
    syncToFirebase('ventes', consultationVente.id, consultationVente);
  };

  const imprimerTicketAccueil = () => {
    if (!ticketGenere) return;
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer le ticket.");
      return;
    }
    const htmlTicket = `
      <html><head><title>Ticket Patient</title>
      <style>
        @page { margin: 0; size: 58mm auto; }
        body { font-family: 'Arial', sans-serif; width: 58mm; padding: 10px; margin: 0 auto; text-align: center; }
        .bold { font-weight: bold; }
        .ticket-num { font-size: 28px; margin: 10px 0; border: 2px solid #000; padding: 5px; }
        .qr-img { width: 120px; height: 120px; margin: 10px auto; display: block; }
        .price { font-size: 14px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;}
      </style></head><body>
        <div class="bold" style="font-size:16px;">Clinique ONG Grenier</div>
        <div style="font-size:12px; margin-bottom: 10px;">${new Date().toLocaleDateString()} - ${ticketGenere.heureArrivee}</div>
        <div>Ticket d'attente</div>
        <div class="ticket-num bold">${ticketGenere.ticket}</div>
        <div>${ticketGenere.nom}</div>
        <div class="price bold">Frais de dossier : ${PRIX_CONSULTATION[ticketGenere.service]} FCFA</div>
        <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketGenere.dossierId}" />
        <div style="font-size:10px;">Conservez ce ticket pour la caisse</div>
        <script>window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 500); }</script>
      </body></html>
    `;
    printWindow.document.write(htmlTicket); printWindow.document.close();
  };

  // --- LOGIQUE MÉTIER INFIRMERIE & MEDECIN ---
  const validerTriage = () => {
    if (!selectedPatientTriage) return;
    const patientAjourne = { ...selectedPatientTriage, statut: 'Consultation' as const, constantes: { sys: Number(tensionSys), dia: Number(tensionDia), temp: Number(temperature), poids: Number(poids) } };
    setPatients(patients.map(p => p.id === selectedPatientTriage.id ? patientAjourne : p));
    setSelectedPatientTriage(null); setTensionSys(''); setTensionDia(''); setTemperature(''); setPoids('');
    syncToFirebase('patients', patientAjourne.id, patientAjourne);
  };

  const handleToggleOrdonnance = (med: Medicament) => {
    setOrdonnance(prev => prev.find(o => o.medicament.id === med.id) ? prev.filter(o => o.medicament.id !== med.id) : [...prev, { medicament: med, quantite: 1 }]);
  };
  const updateQuantiteOrdonnance = (idMed: string, delta: number) => {
    setOrdonnance(prev => prev.map(o => o.medicament.id === idMed ? { ...o, quantite: Math.max(1, o.quantite + delta) } : o));
  };
  const totalOrdonnance = ordonnance.reduce((sum, o) => sum + (o.medicament.prix * o.quantite), 0);

  // NOUVEAU: Fonctions pour les examens (Médecin)
  const handleToggleExamen = (examen: ExamenLabo) => {
    setExamensPrescrits(prev => prev.find(e => e.id === examen.id) ? prev.filter(e => e.id !== examen.id) : [...prev, examen]);
  };
  const totalExamens = examensPrescrits.reduce((sum, e) => sum + e.prix, 0);


  const envoyerPharmacie = () => {
    if (!selectedPatientMed) return;
    const patientAjourne = { ...selectedPatientMed, statut: 'Pharmacie' as const, ordonnance: ordonnance, examens: examensPrescrits };
    setPatients(patients.map(p => p.id === selectedPatientMed.id ? patientAjourne : p));
    setSelectedPatientMed(null); setNotesCliniques(''); setDiagnostic(''); setOrdonnance([]); setExamensPrescrits([]);
    syncToFirebase('patients', patientAjourne.id, patientAjourne);
  };

  const terminerSansOrdonnance = () => {
    if (!selectedPatientMed) return;
    const patientAjourne = { ...selectedPatientMed, statut: 'Terminé' as const };
    setPatients(patients.map(p => p.id === selectedPatientMed.id ? patientAjourne : p));
    setSelectedPatientMed(null); setNotesCliniques(''); setDiagnostic(''); setOrdonnance([]); setExamensPrescrits([]);
    syncToFirebase('patients', patientAjourne.id, patientAjourne);
  };

  const annulerOrdonnance = () => { setOrdonnance([]); setExamensPrescrits([]); };

  // --- LOGIQUE MÉTIER CAISSE ---
  const updateQuantitePanier = (idMed: string, delta: number) => {
    setPanier(panier.map(l => {
      if (l.medicament.id === idMed) {
        const nouvelleQte = l.quantite + delta;
        if (nouvelleQte < 1) return l;
        if (nouvelleQte > l.medicament.stock) { setMessageErreur(`Stock max atteint.`); return l; }
        setMessageErreur(''); return { ...l, quantite: nouvelleQte };
      }
      return l;
    }));
  };

  const validerPaiement = () => {
    const newMeds = medicaments.map(med => {
      const ligne = panier.find(l => l.medicament.id === med.id);
      if (ligne) {
        const medAjourne = { ...med, stock: med.stock - ligne.quantite };
        syncToFirebase('medicaments', medAjourne.id, medAjourne); return medAjourne;
      }
      return med;
    });
    setMedicaments(newMeds);
    
    const totalMeds = panier.reduce((sum, l) => sum + (l.medicament.prix * l.quantite), 0);
    const totalExams = panierExamens.reduce((sum, e) => sum + e.prix, 0);
    const montantTotal = totalMeds + totalExams;
    
    const dateActuelle = new Date();
    const nouvelleTransaction: RapportVente = {
      id: `FA-${Math.floor(Math.random() * 10000)}`, 
      patientNom: selectedPatientPharmacie?.nom || 'Client Externe',
      montant: montantTotal, 
      heure: dateActuelle.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: dateActuelle.toLocaleDateString(), 
      detailsPanier: [...panier],
      detailsExamens: [...panierExamens] // On sauvegarde aussi les examens payés
    };
    
    setHistoriqueVentes([nouvelleTransaction, ...historiqueVentes]);
    syncToFirebase('ventes', nouvelleTransaction.id, nouvelleTransaction); 
    
    if (selectedPatientPharmacie) {
      const patientAjourne = { ...selectedPatientPharmacie, statut: 'Terminé' as const };
      setPatients(patients.map(p => p.id === selectedPatientPharmacie.id ? patientAjourne : p));
      setSelectedPatientPharmacie(null); syncToFirebase('patients', patientAjourne.id, patientAjourne);
    }
    setPanier([]); setPanierExamens([]); setRecuApercu(nouvelleTransaction);
  };

  // IMPRESSION CAISSE EN POP-UP (NOUVEAU FORMAT INCLUANT LES EXAMENS)
  const lancerImpressionThermique = (transaction: RapportVente) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer le reçu.");
      return;
    }
    
    // Construction de la section des médicaments
    const htmlMedicaments = transaction.detailsPanier.length > 0 ? `
        <div class="divider"></div>
        <div class="flex bold"><span>Pharmacie</span><span>Prix</span></div>
        <div class="divider"></div>
        ${transaction.detailsPanier.map(l => `
          <div class="item-row">
            <span style="flex:1; padding-right:5px;">${l.quantite}x ${l.medicament.nom}</span>
            <span>${l.quantite * l.medicament.prix}F</span>
          </div>
        `).join('')}
    ` : '';

    // Construction de la section des examens
    const htmlExamens = transaction.detailsExamens && transaction.detailsExamens.length > 0 ? `
        <div class="divider"></div>
        <div class="flex bold"><span>Laboratoire</span><span>Prix</span></div>
        <div class="divider"></div>
        ${transaction.detailsExamens.map(e => `
          <div class="item-row">
            <span style="flex:1; padding-right:5px;">1x ${e.nom}</span>
            <span>${e.prix}F</span>
          </div>
        `).join('')}
    ` : '';

    const htmlTicket = `
      <html><head><title>Ticket de Caisse - ${transaction.id}</title>
      <style>
        @page { margin: 0; size: 58mm auto; }
        body { font-family: 'Courier New', Courier, monospace; width: 58mm; padding: 5px; margin: 0 auto; font-size: 12px; color: #000; text-align: center; }
        .bold { font-weight: bold; }
        .flex { display: flex; justify-content: space-between; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .item-row { margin-bottom: 3px; font-size: 11px; text-align: left; display: flex; justify-content: space-between; }
        .qr-code { width: 100px; height: 100px; margin: 10px auto; display: block; }
      </style></head><body>
        <div class="bold" style="font-size:14px; margin-bottom: 2px;">Clinique ONG Grenier</div>
        <div>Reçu de Paiement</div>
        <div style="font-size:10px;">Le ${transaction.date} à ${transaction.heure}</div>
        <div class="divider"></div>
        <div style="text-align:left;">Ticket N°: <span class="bold">${transaction.id}</span></div>
        <div style="text-align:left;">Patient: ${transaction.patientNom}</div>
        <div style="text-align:left;">Caissier: ${loggedInUser?.nomComplet}</div>
        
        ${htmlMedicaments}
        ${htmlExamens}

        <div class="divider"></div>
        <div class="flex bold" style="font-size: 14px;"><span>TOTAL NET:</span><span>${transaction.montant} F</span></div>
        <div class="divider"></div>
        <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${transaction.id}" alt="QR Code Reçu" />
        <div style="margin-top:5px; font-size:10px;">Prompt rétablissement !</div>
        <script>window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 500); }</script>
      </body></html>
    `;
    printWindow.document.write(htmlTicket); 
    printWindow.document.close();
    setRecuApercu(null); 
  };

  // --- FONCTIONS ADMIN ---
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'Medecin' });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Medicament>>({ stock: 0, prix: 0 });
  const [showAddExamen, setShowAddExamen] = useState(false);
  const [newExamen, setNewExamen] = useState<Partial<ExamenLabo>>({ prix: 0 });

  const saveUser = () => {
    if (!newUser.username || !newUser.mdp || !newUser.nomComplet || !newUser.role) {
      alert("Veuillez remplir tous les champs pour créer l'utilisateur.");
      return;
    }
    const finalUser = { ...newUser, id: `U${Date.now()}` } as User;
    setUtilisateurs([...utilisateurs, finalUser]);
    syncToFirebase('utilisateurs', finalUser.id, finalUser);
    setShowAddUser(false); 
    setNewUser({ role: 'Medecin', nomComplet: '', username: '', mdp: '' });
    alert(`L'utilisateur ${finalUser.nomComplet} a été créé avec succès !`);
  };

  const deleteUser = (id: string) => {
    if(id === loggedInUser?.id) return alert("Impossible de supprimer votre propre compte.");
    if(window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?")) {
      setUtilisateurs(utilisateurs.filter(u => u.id !== id));
      removeFromFirebase('utilisateurs', id);
      alert("Utilisateur supprimé de la base de données.");
    }
  };

  const deleteProduct = (id: string) => {
    if(window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce médicament du stock ?")) {
      setMedicaments(medicaments.filter(m => m.id !== id));
      removeFromFirebase('medicaments', id);
      alert("Médicament supprimé de la base de données.");
    }
  };

  const genererCodeBarreAdmin = () => {
    const codeGenere = Math.floor(100000000000 + Math.random() * 900000000000).toString(); 
    setNewProduct({...newProduct, codeBarre: codeGenere});
  };

  const saveProduct = () => {
    if (!newProduct.nom || !newProduct.codeBarre) return alert("Le nom et le code barre sont obligatoires.");
    const medFinal = { ...newProduct, id: `M${Date.now()}`, stock: newProduct.stock || 0, prix: newProduct.prix || 0 } as Medicament;
    setMedicaments([...medicaments, medFinal]);
    syncToFirebase('medicaments', medFinal.id, medFinal);
    setShowAddProduct(false); 
    setNewProduct({ stock: 0, prix: 0, nom: '', codeBarre: '' });
    setIsAdminCameraActive(false);
    alert(`Le produit ${medFinal.nom} a été ajouté au stock avec succès !`);
  };

  // NOUVEAU: GESTION DES EXAMENS LABO
  const saveExamen = () => {
    if (!newExamen.nom || !newExamen.prix) return alert("Le nom et le prix sont obligatoires.");
    const examenFinal = { ...newExamen, id: `LAB-${Date.now()}`, prix: newExamen.prix || 0 } as ExamenLabo;
    setExamensLabo([...examensLabo, examenFinal]);
    syncToFirebase('examens', examenFinal.id, examenFinal);
    setShowAddExamen(false); 
    setNewExamen({ prix: 0, nom: '' });
    alert(`L'examen ${examenFinal.nom} a été ajouté avec succès !`);
  };

  const deleteExamen = (id: string) => {
    if(window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet examen ?")) {
      setExamensLabo(examensLabo.filter(e => e.id !== id));
      removeFromFirebase('examens', id);
      alert("Examen supprimé de la base de données.");
    }
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

  // --- RENDU UI PRINCIPAL ---
  if (!loggedInUser) {
    return (
      <div className="min-h-[100dvh] bg-blue-50 flex items-center justify-center p-4 font-sans w-full overflow-hidden">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl border border-blue-100">
          <div className="text-center mb-8">
            <div className="bg-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
              <Plus size={40} strokeWidth={4} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-blue-900 tracking-tight">Clinique Ong Notre Grenier</h1>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{loginError}</div>}
            <div><label className="text-xs font-bold text-blue-700 block mb-1">Identifiant</label><input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" required /></div>
            <div><label className="text-xs font-bold text-blue-700 block mb-1">Mot de passe</label><input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" required /></div>
            <button type="submit" className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-colors"><Lock size={18} /> Connexion</button>
          </form>
        </div>
      </div>
    );
  }

  const isPresident = loggedInUser.role === 'President';
  const isSuperviseur = loggedInUser.role === 'Superviseur';
  const isAdminOrAbove = loggedInUser.role === 'Responsable' || isPresident || isSuperviseur;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 font-sans overflow-x-hidden w-full">
      {/* HEADER MÉDICAL (Bleu avec logo Croix Rouge) */}
      <header className="bg-blue-900 text-white p-4 flex items-center justify-between shadow-md z-30 shrink-0 w-full border-b border-blue-800">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 bg-blue-800 rounded-lg text-white hover:bg-blue-700" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu size={24} /></button>
          <div className="bg-red-600 p-2 rounded-lg shadow-sm flex items-center justify-center">
            <Plus size={24} strokeWidth={4} className="text-white" />
          </div>
          <h1 className="text-xl font-bold hidden sm:block tracking-wide">Clinique ONG Grenier</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block"><p className="text-sm font-bold text-emerald-400">Connecté(e)</p><p className="text-sm font-bold text-blue-100">{loggedInUser.nomComplet} ({loggedInUser.role})</p></div>
          <button onClick={handleLogout} className="bg-blue-800 hover:bg-red-500 p-2.5 rounded-xl text-blue-100 transition-colors"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative w-full">
        {/* SIDEBAR RESPONSIVE */}
        <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-white border-r border-slate-200 py-6 absolute md:relative z-20 h-full shadow-xl md:shadow-none transition-all`}>
          <nav className="flex flex-col gap-2 px-4">
            {isAdminOrAbove && <button onClick={() => {setActiveTab('admin'); setAdminSubTab('stats'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-blue-800 text-white font-bold shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><BarChart3 size={20} /> Administration {isPresident && <Eye size={16} className="ml-auto opacity-50" title="Lecture seule"/>}</button>}
            {(loggedInUser.role === 'Accueil' || isSuperviseur) && <button onClick={() => {setActiveTab('accueil'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-800 text-white font-bold shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><Users size={20} /> Réception</button>}
            {(loggedInUser.role === 'Infirmier' || isSuperviseur) && <button onClick={() => {setActiveTab('triage'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-800 text-white font-bold shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><Activity size={20} /> Infirmerie</button>}
            {(loggedInUser.role === 'Medecin' || isSuperviseur) && <button onClick={() => {setActiveTab('medecin'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-800 text-white font-bold shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><Stethoscope size={20} /> Consultation</button>}
            {(loggedInUser.role === 'Caissiere' || isSuperviseur) && <button onClick={() => {setActiveTab('pharmacie'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-800 text-white font-bold shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><Pill size={20} /> Pharmacie & Caisse</button>}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 relative w-full overflow-x-hidden">
          {isMobileMenuOpen && <div className="absolute inset-0 bg-blue-900/50 z-10 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

          {/* === MODULE 0: ADMIN === */}
          {activeTab === 'admin' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-blue-950">Espace Administrateur</h2>
                  {isPresident && <p className="text-emerald-600 text-sm font-bold flex items-center gap-1 mt-1"><Eye size={16}/> Mode Consultation (Lecture seule)</p>}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-2 overflow-x-auto w-full">
                <button onClick={() => setAdminSubTab('stats')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'stats' ? 'bg-blue-800 text-white' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-800'}`}>Tableau de bord</button>
                <button onClick={() => setAdminSubTab('stock')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'stock' ? 'bg-blue-800 text-white' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-800'}`}>Stock Pharmacie</button>
                {/* NOUVEL ONGLET LABORATOIRE */}
                <button onClick={() => setAdminSubTab('labo')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'labo' ? 'bg-blue-800 text-white' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-800'}`}>Examen / Labo</button>
                <button onClick={() => setAdminSubTab('personnel')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'personnel' ? 'bg-blue-800 text-white' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-800'}`}>Personnel</button>
                <button onClick={() => setAdminSubTab('rapports')} className={`px-4 py-2 font-bold rounded-lg transition-colors whitespace-nowrap ${adminSubTab === 'rapports' ? 'bg-blue-800 text-white' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-800'}`}>Rapports</button>
              </div>

              {adminSubTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4"><div className="bg-blue-100 p-4 rounded-xl text-blue-700"><Users size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Patients du jour</p><p className="text-3xl font-black text-blue-950">{patients.filter(p => p.dateArrivee === new Date().toLocaleDateString()).length}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4"><div className="bg-emerald-100 p-4 rounded-xl text-emerald-700"><TrendingUp size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Revenus (FCFA)</p><p className="text-3xl font-black text-blue-950">{historiqueVentes.reduce((acc, v) => acc + v.montant, 0).toLocaleString()}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border border-red-200 flex items-center gap-4"><div className="bg-red-100 p-4 rounded-xl text-red-600"><AlertTriangle size={24} /></div><div><p className="text-sm font-bold text-slate-500 uppercase">Alertes Stocks</p><p className="text-3xl font-black text-red-600">{medicaments.filter(m => m.stock < 10).length}</p></div></div>
                </div>
              )}

              {adminSubTab === 'stock' && (
                 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col w-full overflow-hidden">
                 <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                   <h3 className="font-bold flex items-center gap-2 text-blue-950"><Package size={20} className="text-blue-600"/> Base de médicaments</h3>
                   <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                     <div className="relative flex-1 sm:w-64">
                       <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                       <input type="text" placeholder="Rechercher..." value={searchAdminStock} onChange={e => setSearchAdminStock(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                     </div>
                     {!isPresident && <button onClick={() => setShowAddProduct(!showAddProduct)} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded-lg text-sm font-bold">{showAddProduct ? 'Fermer le formulaire' : 'Nouveau Produit'}</button>}
                   </div>
                 </div>
                 
                 {showAddProduct && !isPresident && (
                   <div className="p-5 bg-blue-50/50 border-b flex flex-col gap-4 w-full">
                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                       <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500">Nom du produit</label><input type="text" value={newProduct.nom || ''} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                       <div className="md:col-span-4">
                         <label className="text-xs font-bold text-slate-500">Code Barre (Saisie, Auto, Scan)</label>
                         <div className="flex gap-2">
                           <input type="text" value={newProduct.codeBarre || ''} onChange={e => setNewProduct({...newProduct, codeBarre: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
                           <button onClick={genererCodeBarreAdmin} className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2.5 rounded-lg transition-colors" title="Générer un code aléatoire"><Wand2 size={20}/></button>
                           <button onClick={() => setIsAdminCameraActive(!isAdminCameraActive)} className={`${isAdminCameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white p-2.5 rounded-lg transition-colors`} title="Scanner un code barre existant"><Camera size={20}/></button>
                         </div>
                       </div>
                       <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Prix (FCFA)</label><input type="number" value={newProduct.prix || ''} onChange={e => setNewProduct({...newProduct, prix: Number(e.target.value)})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                       <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500">Stock Initial</label><div className="flex gap-2"><input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /><button onClick={saveProduct} className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white px-4 py-2.5 rounded-lg font-bold w-full sm:w-auto">Ajouter</button></div></div>
                     </div>
                     {isAdminCameraActive && (
                       <div className="w-full max-w-sm mx-auto bg-black p-2 rounded-xl relative border-2 border-blue-500">
                         <button onClick={() => setIsAdminCameraActive(false)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded z-10"><X size={16}/></button>
                         <div id="admin-reader" className="w-full min-h-[200px]"></div>
                       </div>
                     )}
                   </div>
                 )}
                 <div className="w-full overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                     <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs"><th className="p-4">Médicament</th><th className="p-4">Code Barre</th><th className="p-4">Prix</th><th className="p-4">Stock du Lot</th>{!isPresident && <th className="p-4 text-right">Actions</th>}</tr></thead>
                     <tbody>
                       {medicaments.filter(m => m.nom.toLowerCase().includes(searchAdminStock.toLowerCase()) || m.codeBarre.includes(searchAdminStock)).map(med => (
                         <tr key={med.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="p-4 font-bold text-blue-950">{med.nom}</td><td className="p-4 font-mono text-slate-600">{med.codeBarre}</td><td className="p-4 font-medium">{med.prix.toLocaleString()} F</td><td className="p-4"><span className={`px-2 py-1 rounded-full font-bold text-xs ${med.stock < 10 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>{med.stock}</span></td>
                         {!isPresident && <td className="p-4 flex gap-2 justify-end">
                           <button onClick={() => {
                             const qty = prompt(`Combien de boîtes de ${med.nom} voulez-vous ajouter au stock ?`);
                             if(qty && !isNaN(Number(qty))) {
                                const updatedMed = {...med, stock: med.stock + Number(qty)};
                                setMedicaments(medicaments.map(m => m.id === med.id ? updatedMed : m));
                                syncToFirebase('medicaments', med.id, updatedMed).then(() => alert("Le stock a été mis à jour avec succès !"));
                             }
                           }} className="text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors">+ Stock</button>
                           <button onClick={() => deleteProduct(med.id)} className="text-red-500 bg-red-50 border border-red-100 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors" title="Supprimer définitivement"><Trash2 size={16}/></button>
                         </td>}</tr>
                       ))}
                       {medicaments.filter(m => m.nom.toLowerCase().includes(searchAdminStock.toLowerCase()) || m.codeBarre.includes(searchAdminStock)).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Aucun médicament trouvé.</td></tr>}
                     </tbody>
                   </table>
                 </div>
               </div>
              )}

              {/* NOUVEAU ONGLET LABORATOIRE (ADMIN) */}
              {adminSubTab === 'labo' && (
                 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col w-full overflow-hidden">
                 <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                   <h3 className="font-bold flex items-center gap-2 text-blue-950"><TestTubes size={20} className="text-blue-600"/> Base des Examens de Laboratoire</h3>
                   {!isPresident && <button onClick={() => setShowAddExamen(!showAddExamen)} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded-lg text-sm font-bold">{showAddExamen ? 'Fermer le formulaire' : 'Nouvel Examen'}</button>}
                 </div>
                 
                 {showAddExamen && !isPresident && (
                   <div className="p-5 bg-blue-50/50 border-b flex flex-col gap-4 w-full">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                       <div><label className="text-xs font-bold text-slate-500">Nom de l'examen (Ex: Goutte Épaisse)</label><input type="text" value={newExamen.nom || ''} onChange={e => setNewExamen({...newExamen, nom: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                       <div><label className="text-xs font-bold text-slate-500">Coût de l'examen (FCFA)</label><div className="flex gap-2"><input type="number" value={newExamen.prix || ''} onChange={e => setNewExamen({...newExamen, prix: Number(e.target.value)})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /><button onClick={saveExamen} className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white px-8 py-2.5 rounded-lg font-bold w-full sm:w-auto">Enregistrer</button></div></div>
                     </div>
                   </div>
                 )}
                 <div className="w-full overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                     <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs"><th className="p-4 w-2/3">Type d'examen / Analyse</th><th className="p-4">Coût (FCFA)</th>{!isPresident && <th className="p-4 text-right">Actions</th>}</tr></thead>
                     <tbody>
                       {examensLabo.map(examen => (
                         <tr key={examen.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="p-4 font-bold text-blue-950 flex items-center gap-2"><Activity size={16} className="text-blue-400"/> {examen.nom}</td><td className="p-4 font-black text-emerald-600">{examen.prix.toLocaleString()} F</td>
                         {!isPresident && <td className="p-4 text-right">
                           <button onClick={() => deleteExamen(examen.id)} className="text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors" title="Supprimer cet examen"><Trash2 size={16}/></button>
                         </td>}</tr>
                       ))}
                       {examensLabo.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">Aucun examen de laboratoire enregistré.</td></tr>}
                     </tbody>
                   </table>
                 </div>
               </div>
              )}

              {adminSubTab === 'personnel' && (
                 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col w-full overflow-hidden">
                 <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                   <h3 className="font-bold flex items-center gap-2 text-blue-950"><UserPlus size={20} className="text-blue-600"/> Base du Personnel</h3>
                   {!isPresident && <button onClick={() => setShowAddUser(!showAddUser)} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded-lg text-sm font-bold">Créer un compte</button>}
                 </div>
                 {showAddUser && !isPresident && (
                    <div className="p-4 bg-blue-50/50 border-b border-blue-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                     <div><label className="text-xs font-bold text-slate-500">Nom complet</label><input type="text" value={newUser.nomComplet || ''} onChange={e => setNewUser({...newUser, nomComplet: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" placeholder="Ex: Dr. Koffi" /></div>
                     <div><label className="text-xs font-bold text-slate-500">Identifiant (Login)</label><input type="text" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                     <div><label className="text-xs font-bold text-slate-500">Mot de passe</label><input type="text" value={newUser.mdp || ''} onChange={e => setNewUser({...newUser, mdp: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                     <div>
                       <label className="text-xs font-bold text-slate-500">Rôle / Service</label>
                       <select value={newUser.role || 'Medecin'} onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white">
                         <option value="Accueil">Accueil (Réception)</option>
                         <option value="Infirmier">Infirmier (Triage)</option>
                         <option value="Medecin">Médecin (Consultation)</option>
                         <option value="Caissiere">Caissière (Pharmacie)</option>
                         <option value="Responsable">Directeur (Admin total)</option>
                         <option value="Superviseur">Superviseur (Accès à tout)</option>
                         <option value="President">Président (Lecture seule)</option>
                       </select>
                     </div>
                     <div><button onClick={saveUser} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded-lg transition-colors">Créer le compte</button></div>
                   </div>
                 )}
                 <div className="w-full overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                     <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs"><th className="p-4">Nom Complet</th><th className="p-4">Rôle / Accès</th><th className="p-4">Identifiant</th>{!isPresident && <th className="p-4 text-right">Actions</th>}</tr></thead>
                     <tbody>{utilisateurs.map(u => (<tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="p-4 font-bold text-blue-950">{u.nomComplet}</td><td className="p-4"><span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td><td className="p-4 font-mono text-slate-500">{u.username}</td>{!isPresident && <td className="p-4 text-right"><button onClick={() => deleteUser(u.id)} className="text-red-500 bg-red-50 border border-red-100 p-1.5 rounded-lg hover:bg-red-100 transition-colors" title="Supprimer ce compte"><Trash2 size={16}/></button></td>}</tr>))}</tbody>
                   </table>
                 </div>
               </div>
              )}

              {adminSubTab === 'rapports' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col w-full overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                    <h3 className="font-bold flex items-center gap-2 text-blue-950"><FileBarChart size={20} className="text-blue-600"/> Historique Global (Temps Réel)</h3>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <button onClick={exporterExcel} className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white px-4 py-2 rounded-lg text-sm font-bold flex gap-2 flex-1 justify-center items-center"><Download size={16}/> Exporter Excel</button>
                      <button onClick={exporterPDF} className="bg-red-600 hover:bg-red-700 transition-colors text-white px-4 py-2 rounded-lg text-sm font-bold flex gap-2 flex-1 justify-center items-center"><FileText size={16}/> Générer PDF</button>
                    </div>
                  </div>
                  <div className="w-full overflow-x-auto p-0">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                      <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs"><th className="p-4">N° Facture</th><th className="p-4">Date & Heure</th><th className="p-4">Patient / Vente</th><th className="p-4 text-right">Montant Encaissé</th></tr></thead>
                      <tbody>{historiqueVentes.map(v => (<tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="p-4 font-mono text-slate-500">{v.id}</td><td className="p-4 text-slate-600">{v.date} à {v.heure}</td><td className="p-4 font-bold text-blue-950">{v.patientNom}</td><td className="p-4 text-right font-black text-emerald-600">{v.montant.toLocaleString()} F</td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODULE 1: ACCUEIL === */}
          {activeTab === 'accueil' && (
             <div className="max-w-4xl mx-auto h-full overflow-y-auto w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-blue-950 mb-2">Accueil & Réception</h2>
              <p className="text-slate-500 mb-6 text-sm">Génération de dossiers de suivi, tickets journaliers et facturation automatique.</p>

              <div className="flex gap-4 mb-6">
                <button onClick={() => {setTypePatientAccueil('nouveau'); setAncienDossierId(null); setNouveauNom(''); setIsAccueilCameraActive(false);}} className={`flex-1 p-4 rounded-xl font-bold border transition-all ${typePatientAccueil === 'nouveau' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'}`}>NOUVEAU PATIENT<br/><span className="text-xs font-normal">Créer un dossier & QR</span></button>
                <button onClick={() => setTypePatientAccueil('ancien')} className={`flex-1 p-4 rounded-xl font-bold border transition-all ${typePatientAccueil === 'ancien' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'}`}>ANCIEN PATIENT<br/><span className="text-xs font-normal">Scanner le QR de suivi</span></button>
              </div>

              {typePatientAccueil === 'ancien' && (
                <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-200 mb-6 shadow-sm">
                  {!ancienDossierId ? (
                    <div className="flex flex-col items-center">
                      <p className="mb-4 text-emerald-800 font-medium text-center">Veuillez scanner le code QR du patient pour retrouver son dossier permanent.</p>
                      <button onClick={() => setIsAccueilCameraActive(!isAccueilCameraActive)} className={`p-4 rounded-xl text-white font-bold flex gap-2 items-center justify-center w-full max-w-sm transition-colors ${isAccueilCameraActive ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        <Camera size={20} /> {isAccueilCameraActive ? 'Fermer la Caméra' : 'Activer le Scanner'}
                      </button>
                      
                      {isAccueilCameraActive && (
                        <div className="mt-4 bg-black rounded-xl overflow-hidden border-2 border-emerald-500 w-full max-w-sm relative shadow-lg">
                          <button onClick={() => setIsAccueilCameraActive(false)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded z-10"><X size={16}/></button>
                          <div id="accueil-reader" className="w-full min-h-[250px]"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-4 border-b border-emerald-200 pb-2">
                        <h4 className="font-bold text-emerald-900 flex items-center gap-2"><CheckCircle2 size={20}/> Dossier récupéré avec succès</h4>
                        <button onClick={() => {setAncienDossierId(null); setNouveauNom('');}} className="text-xs text-red-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors">Annuler / Changer</button>
                      </div>
                      <p className="text-sm text-emerald-800 mb-1">Nom du patient : <strong className="text-lg">{nouveauNom}</strong></p>
                      <p className="text-sm text-emerald-800 mb-4">ID Dossier permanent : <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-100">{ancienDossierId}</span></p>
                    </div>
                  )}
                </div>
              )}

              <div className={`bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm w-full transition-opacity ${typePatientAccueil === 'ancien' && !ancienDossierId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-2">Nom complet du patient</label>
                    <input type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} disabled={!!ancienDossierId} placeholder="Saisir le nom complet..." className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-2">Service & Tarification (FCFA)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => setNouveauService('GEN')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold transition-all ${nouveauService === 'GEN' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><GenMed size={18}/> Général</div><span className="text-xs text-blue-500">{PRIX_CONSULTATION.GEN} F</span>
                      </button>
                      <button onClick={() => setNouveauService('PED')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold transition-all ${nouveauService === 'PED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><Baby size={18}/> Pédiatrie</div><span className="text-xs text-emerald-600">{PRIX_CONSULTATION.PED} F</span>
                      </button>
                      <button onClick={() => setNouveauService('MAT')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold transition-all ${nouveauService === 'MAT' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><Heart size={18}/> Maternité</div><span className="text-xs text-rose-500">{PRIX_CONSULTATION.MAT} F</span>
                      </button>
                      <button onClick={() => setNouveauService('CHIR')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold transition-all ${nouveauService === 'CHIR' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><Activity size={18}/> Chirurgie</div><span className="text-xs text-blue-500">{PRIX_CONSULTATION.CHIR} F</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={genererTicket} disabled={!nouveauNom.trim()} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md disabled:shadow-none"><QrCode size={20} /> Valider & Générer Ticket du Jour ({PRIX_CONSULTATION[nouveauService]} F)</button>
              </div>

              {ticketGenere && (
                <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-blue-200">
                    <div className="bg-blue-800 text-white text-center p-6 pb-8 rounded-b-[2rem] relative shadow-inner">
                      <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-1">Ticket du Jour</p>
                      <h1 className="text-5xl font-black">{ticketGenere.ticket}</h1>
                    </div>
                    <div className="p-8 text-center -mt-6">
                      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 mx-auto inline-block border border-slate-100">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketGenere.dossierId}`} alt="QR Code Patient" className="w-32 h-32 object-contain" />
                      </div>
                      <h2 className="text-xl font-black text-blue-950">{ticketGenere.nom}</h2>
                      <p className="text-slate-500 text-sm mb-2">QR de suivi (Dossier) : <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{ticketGenere.dossierId}</span></p>
                    </div>
                    <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-200">
                      <button onClick={() => setTicketGenere(null)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors">Fermer</button>
                      <button onClick={imprimerTicketAccueil} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors shadow-md"><Printer size={18} /> Imprimer pop-up</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODULE 2: INFIRMERIE === */}
          {activeTab === 'triage' && (
             <div className="h-full flex flex-col w-full">
               <h2 className="text-2xl md:text-3xl font-bold text-blue-950 mb-6">Infirmerie - Triage</h2>
               <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 flex-1 min-h-0 w-full">
                 <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[30vh] lg:max-h-full w-full">
                   <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-900"><Clock size={18} className="text-blue-500"/> Patients en attente</h3>
                   {patients.filter(p => p.statut === 'Triage' && p.dateArrivee === new Date().toLocaleDateString()).map(patient => (
                     <div key={patient.id} onClick={() => setSelectedPatientTriage(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientTriage?.id === patient.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                       <div className="flex justify-between items-center"><span className="font-bold text-blue-950">{patient.nom}</span><span className="text-xs bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-full font-bold shadow-sm">{patient.ticket}</span></div>
                     </div>
                   ))}
                 </div>
                 <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm overflow-y-auto w-full">
                   {selectedPatientTriage ? (
                     <>
                        <h3 className="text-lg md:text-xl font-bold mb-4 border-b border-slate-100 pb-4 text-blue-950">Constantes de {selectedPatientTriage.nom}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <div><label className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Sys</label><input type="number" value={tensionSys} onChange={e => setTensionSys(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                          <div><label className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Dia</label><input type="number" value={tensionDia} onChange={e => setTensionDia(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                          <div><label className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><Thermometer size={16} className="text-orange-500"/> Temp (°C)</label><input type="number" value={temperature} onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                          <div><label className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><Weight size={16} className="text-emerald-500"/> Poids (kg)</label><input type="number" value={poids} onChange={e => setPoids(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" /></div>
                        </div>
                        <div className="flex justify-end"><button onClick={validerTriage} disabled={!tensionSys || !tensionDia || !temperature || !poids} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-md disabled:shadow-none"><CheckCircle2 size={20}/> Transférer au Médecin</button></div>
                     </>
                   ) : <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12"><Activity size={64} className="mb-4 opacity-20 text-blue-500" /><p className="font-medium text-slate-500">Sélectionnez un patient à gauche.</p></div>}
                 </div>
               </div>
             </div>
          )}

          {/* === MODULE 3: MÉDECIN (AVEC EXAMENS LABO) === */}
          {activeTab === 'medecin' && (
            <div className="h-full flex flex-col w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-blue-950 mb-6">Bureau du Médecin</h2>
              <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 flex-1 min-h-0 w-full">
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[30vh] lg:max-h-full w-full">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-900"><Users size={18} className="text-blue-500"/> Salle d'attente</h3>
                  {patients.filter(p => p.statut === 'Consultation' && p.dateArrivee === new Date().toLocaleDateString()).map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientMed(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientMed?.id === patient.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <span className="font-bold block text-blue-950">{patient.nom}</span><span className="text-xs text-emerald-600 font-bold block mt-1"><Activity size={12} className="inline mr-1"/>{patient.constantes?.sys}/{patient.constantes?.dia} mmHg</span>
                    </div>
                  ))}
                  {patients.filter(p => p.statut === 'Consultation').length === 0 && <p className="text-sm text-slate-400 italic">Aucun patient.</p>}
                </div>

                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden w-full">
                  {selectedPatientMed ? (
                    <div className="flex-1 flex flex-col overflow-y-auto">
                      <div className="bg-blue-800 text-white p-4 md:p-6"><h2 className="text-xl md:text-2xl font-bold">{selectedPatientMed.nom}</h2><p className="text-blue-200 text-sm font-mono mt-1">ID: {selectedPatientMed.dossierId}</p></div>
                      <div className="p-4 md:p-6 flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 w-full">
                        <div className="flex flex-col gap-4">
                          <div><label className="text-sm font-bold text-blue-900 mb-2 block">Notes Cliniques</label><textarea className="w-full p-4 border border-slate-200 rounded-xl h-32 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={notesCliniques} onChange={e => setNotesCliniques(e.target.value)} /></div>
                          <div><label className="text-sm font-bold text-blue-900 mb-2 block">Diagnostic Retenu</label><input type="text" className="w-full p-4 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-950" value={diagnostic} onChange={e => setDiagnostic(e.target.value)} /></div>
                        </div>
                        
                        {/* ZONE DE PRESCRIPTION MIXTE */}
                        <div className="bg-blue-50/50 rounded-2xl p-4 md:p-5 flex flex-col border border-blue-100 min-h-[400px] w-full">
                          
                          {/* TOGGLE BOUTONS */}
                          <div className="flex bg-white rounded-lg p-1 border border-slate-200 mb-4 shadow-sm">
                            <button onClick={() => setDocSubTab('ordonnance')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${docSubTab === 'ordonnance' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Pill size={16} className="inline mr-2"/> Médicaments</button>
                            <button onClick={() => setDocSubTab('labo')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${docSubTab === 'labo' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><TestTubes size={16} className="inline mr-2"/> Laboratoire</button>
                          </div>

                          {/* RECHERCHE */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input type="text" placeholder={`Rechercher un ${docSubTab === 'ordonnance' ? 'médicament' : 'examen'}...`} value={searchMedecin} onChange={e => setSearchMedecin(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white" />
                          </div>

                          {/* RÉSULTATS DE RECHERCHE */}
                          <div className="bg-white rounded-xl border border-slate-200 p-2 mb-4 max-h-32 overflow-y-auto shadow-inner">
                            {docSubTab === 'ordonnance' && medicaments.filter(m => m.nom.toLowerCase().includes(searchMedecin.toLowerCase())).map(med => {
                              const isSelected = ordonnance.some(m => m.medicament.id === med.id);
                              return (
                                <div key={med.id} onClick={() => handleToggleOrdonnance(med)} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${isSelected ? 'bg-blue-100 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>
                                  <div><span className="text-sm block">{med.nom}</span><span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>{med.prix.toLocaleString()} F</span></div>
                                  {isSelected ? <Check size={18} className="text-blue-600"/> : <PlusCircle size={18} className="text-slate-300"/>}
                                </div>
                              );
                            })}
                            {docSubTab === 'labo' && examensLabo.filter(e => e.nom.toLowerCase().includes(searchMedecin.toLowerCase())).map(examen => {
                              const isSelected = examensPrescrits.some(e => e.id === examen.id);
                              return (
                                <div key={examen.id} onClick={() => handleToggleExamen(examen)} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${isSelected ? 'bg-emerald-100 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>
                                  <div><span className="text-sm block">{examen.nom}</span><span className={`text-xs font-medium ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>{examen.prix.toLocaleString()} F</span></div>
                                  {isSelected ? <Check size={18} className="text-emerald-600"/> : <PlusCircle size={18} className="text-slate-300"/>}
                                </div>
                              );
                            })}
                          </div>

                          {/* RECAPITULATIF GLOBAL DE LA PRESCRIPTION */}
                          <div className="bg-white border border-blue-100 rounded-xl p-4 flex-1 flex flex-col w-full shadow-sm">
                            <ul className="list-none p-0 m-0 text-sm font-bold text-slate-700 mb-4 flex-1 overflow-y-auto">
                              
                              {/* Affichage des médicaments choisis */}
                              {ordonnance.map(o => (
                                <li key={o.medicament.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-2 rounded-lg mb-2 border border-slate-100 gap-2">
                                  <span className="truncate flex-1 text-blue-950 flex items-center gap-2"><Pill size={14} className="text-blue-500"/> {o.medicament.nom}</span>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantiteOrdonnance(o.medicament.id, -1)} className="bg-white border border-slate-200 px-3 py-1 rounded shadow-sm text-slate-700 hover:bg-slate-100">-</button>
                                    <span className="w-6 text-center font-black text-blue-700">{o.quantite}</span>
                                    <button onClick={() => updateQuantiteOrdonnance(o.medicament.id, 1)} className="bg-white border border-slate-200 px-3 py-1 rounded shadow-sm text-slate-700 hover:bg-slate-100">+</button>
                                  </div>
                                </li>
                              ))}
                              
                              {/* Affichage des examens choisis */}
                              {examensPrescrits.map(e => (
                                <li key={e.id} className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg mb-2 border border-emerald-100 gap-2">
                                  <span className="truncate flex-1 text-emerald-950 flex items-center gap-2"><TestTubes size={14} className="text-emerald-600"/> {e.nom}</span>
                                  <button onClick={() => handleToggleExamen(e)} className="text-red-400 hover:text-red-600 px-2"><X size={18}/></button>
                                </li>
                              ))}

                              {ordonnance.length === 0 && examensPrescrits.length === 0 && <p className="text-center text-slate-400 text-xs italic mt-4">La prescription est vide.</p>}
                            </ul>
                            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-end"><span className="text-sm text-slate-500 font-bold">Total Facturation :</span><span className="text-xl font-black text-blue-600">{(totalOrdonnance + totalExamens).toLocaleString()} F</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button onClick={terminerSansOrdonnance} className="w-full sm:w-auto px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-200"><Ban size={18}/> Clôturer (Rien prescrit)</button>
                        <div className="flex gap-3 w-full sm:w-auto"><button onClick={annulerOrdonnance} className="flex-1 px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold hover:bg-slate-100 text-slate-700 transition-colors shadow-sm">Vider</button><button onClick={envoyerPharmacie} disabled={!diagnostic} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-md disabled:shadow-none"><CheckCircle2 size={20}/> Envoyer Caisse</button></div>
                      </div>
                    </div>
                  ) : <div className="p-12 h-full flex flex-col items-center justify-center text-slate-400"><Stethoscope size={64} className="mb-4 opacity-20 text-blue-500" /><p className="font-medium text-slate-500">Sélectionnez un patient.</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* === MODULE 4: PHARMACIE / CAISSE === */}
          {activeTab === 'pharmacie' && (
            <div className="h-full flex flex-col relative w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-blue-950 mb-6">Caisse Pharmacie & Laboratoire</h2>
              <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 flex-1 min-h-0 w-full">
                
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[30vh] lg:max-h-full w-full">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-900"><Users size={18} className="text-blue-500"/> Patients envoyés</h3>
                  {patients.filter(p => p.statut === 'Pharmacie' && p.dateArrivee === new Date().toLocaleDateString()).map(patient => (
                    <div key={patient.id} onClick={() => {
                        setSelectedPatientPharmacie(patient);
                        setPanierExamens(patient.examens || []); // Charge les examens à payer
                      }} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientPharmacie?.id === patient.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <span className="font-bold block text-blue-950">{patient.nom}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {patient.ordonnance && patient.ordonnance.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">Pharm: {patient.ordonnance.length}</span>}
                        {patient.examens && patient.examens.length > 0 && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Labo: {patient.examens.length}</span>}
                      </div>
                    </div>
                  ))}
                  {patients.filter(p => p.statut === 'Pharmacie').length === 0 && <p className="text-sm text-slate-400 italic">Aucun patient à facturer.</p>}
                </div>

                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col overflow-y-auto w-full">
                  {selectedPatientPharmacie ? (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-inner">
                      <div className="flex justify-between items-center mb-2 border-b border-yellow-200 pb-2">
                        <h4 className="text-xs font-black text-yellow-800 uppercase flex items-center gap-1"><FileText size={16}/> Prescription</h4>
                        <button onClick={() => {setSelectedPatientPharmacie(null); setPanierExamens([]);}} className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-200 hover:bg-red-50">Annuler</button>
                      </div>
                      <ul className="text-sm font-bold text-slate-800 mt-2 space-y-1">
                        {/* LISTE DES MEDOCS */}
                        {selectedPatientPharmacie.ordonnance?.map(o => (
                          <li key={o.medicament.id} className="flex gap-2 items-center"><Pill size={12} className="text-blue-500 shrink-0"/><span><span className="text-blue-600 font-black">{o.quantite}x</span> {o.medicament.nom}</span></li>
                        ))}
                        {/* LISTE DES EXAMENS */}
                        {selectedPatientPharmacie.examens?.map(e => (
                          <li key={e.id} className="flex gap-2 items-center"><TestTubes size={12} className="text-emerald-500 shrink-0"/><span><span className="text-emerald-600 font-black">1x</span> {e.nom}</span></li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200 text-center shadow-inner">
                      <ShoppingCart size={24} className="mx-auto text-blue-500 mb-2"/>
                      <p className="text-sm text-blue-900 font-bold uppercase tracking-wide">Vente Directe</p>
                      <p className="text-xs text-blue-600 mt-1">Scannez directement un produit.</p>
                    </div>
                  )}

                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2"><Scan size={14}/> Scanner Actif</label>
                      <button onClick={() => setIsCameraActive(!isCameraActive)} className={`p-2 rounded-lg text-white transition-colors shadow-sm ${isCameraActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}><Camera size={16} /></button>
                    </div>

                    {isCameraActive && (
                      <div className="mb-4 bg-black rounded-xl overflow-hidden border-2 border-blue-500 w-full mx-auto relative shadow-lg">
                        <button onClick={() => setIsCameraActive(false)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded z-10"><X size={16}/></button>
                        <div id="reader" className="w-full min-h-[200px]"></div>
                      </div>
                    )}

                    <form onSubmit={e => { e.preventDefault(); handleTraitementScanRef.current(codeSaisi); }} className="relative">
                      <Search className="absolute left-4 top-4 text-blue-400" size={20} />
                      <input ref={inputScanRef} type="text" value={codeSaisi} onChange={(e) => setCodeSaisi(e.target.value)} placeholder="Code Barre ou QR..." className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl font-mono text-sm outline-none focus:ring-1 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors shadow-sm" />
                    </form>
                    {messageErreur && <div className="mt-3 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} className="shrink-0"/> {messageErreur}</div>}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden relative w-full">
                  <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
                    {panier.length === 0 && panierExamens.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12"><ShoppingCart size={64} className="mb-4 opacity-20 text-blue-500" /><p className="font-medium">Le panier global est vide.</p></div> : (
                      <div className="flex flex-col gap-3">
                        
                        {/* PANIER DES MEDICAMENTS */}
                        {panier.length > 0 && <h4 className="text-xs font-bold text-slate-500 uppercase mt-2 mb-1 pl-2">Pharmacie</h4>}
                        {panier.map((ligne, i) => (
                          <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm gap-4">
                            <div className="flex-1 min-w-0"><h4 className="font-bold text-blue-950 truncate">{ligne.medicament.nom}</h4><p className="text-xs text-slate-400 font-mono mt-1">Ref: {ligne.medicament.codeBarre}</p></div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-slate-100 sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                              <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-lg border border-blue-100">
                                <button onClick={() => updateQuantitePanier(ligne.medicament.id, -1)} className="bg-white px-2 py-1 rounded shadow-sm text-blue-700 font-black hover:bg-blue-100 transition-colors">-</button>
                                <span className="w-6 text-center font-black text-blue-900">{ligne.quantite}</span>
                                <button onClick={() => updateQuantitePanier(ligne.medicament.id, 1)} className="bg-white px-2 py-1 rounded shadow-sm text-blue-700 font-black hover:bg-blue-100 transition-colors">+</button>
                              </div>
                              <div className="text-right w-24"><p className="text-xs text-slate-400 uppercase font-bold">Prix</p><p className="font-black text-blue-600">{(ligne.medicament.prix * ligne.quantite).toLocaleString()} F</p></div>
                              <button onClick={() => setPanier(panier.filter(l => l.medicament.id !== ligne.medicament.id))} className="text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={20}/></button>
                            </div>
                          </div>
                        ))}

                        {/* PANIER DES EXAMENS LABO */}
                        {panierExamens.length > 0 && <h4 className="text-xs font-bold text-slate-500 uppercase mt-4 mb-1 pl-2">Laboratoire (Examens)</h4>}
                        {panierExamens.map((examen, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm gap-4">
                            <div className="flex-1 min-w-0"><h4 className="font-bold text-emerald-950 truncate flex items-center gap-2"><TestTubes size={16}/> {examen.nom}</h4></div>
                            <div className="flex items-center gap-4">
                              <div className="text-right w-24"><p className="text-xs text-emerald-600/70 uppercase font-bold">Prix unique</p><p className="font-black text-emerald-700">{(examen.prix).toLocaleString()} F</p></div>
                              <button onClick={() => setPanierExamens(panierExamens.filter(e => e.id !== examen.id))} className="text-red-500 bg-white border border-red-100 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={20}/></button>
                            </div>
                          </div>
                        ))}

                      </div>
                    )}
                  </div>
                  <div className="p-6 bg-blue-900 text-white mt-auto sm:rounded-none">
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-blue-200 font-bold uppercase tracking-wider text-sm">Net Total à Payer</p>
                      <p className="text-4xl font-black text-emerald-400">{(panier.reduce((t, l) => t + (l.medicament.prix * l.quantite), 0) + panierExamens.reduce((t, e) => t + e.prix, 0)).toLocaleString()} <span className="text-2xl text-emerald-500">FCFA</span></p>
                    </div>
                    <button onClick={validerPaiement} disabled={panier.length === 0 && panierExamens.length === 0} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-blue-950 disabled:text-blue-800 text-white p-4 rounded-xl font-bold flex justify-center items-center gap-3 shadow-lg disabled:shadow-none transition-all text-lg border border-transparent disabled:border-blue-800">
                      <CheckCircle2 size={24} /> Valider le Paiement
                    </button>
                  </div>

                  {/* APERÇU DU REÇU CAISSE */}
                  {recuApercu && (
                    <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-blue-200">
                        <h3 className="text-blue-950 font-black mb-4 flex items-center gap-2"><Search size={20} className="text-blue-600"/> Aperçu du Reçu</h3>
                        <div className="bg-slate-50 p-4 w-[58mm] min-h-[100mm] shadow-md mb-6 font-mono text-[10px] text-black border border-slate-300 mx-auto rounded-lg">
                          <div className="text-center font-bold text-sm mb-1">Clinique ONG Grenier</div>
                          <div className="text-center mb-1">Reçu de Paiement</div>
                          <div className="text-center text-[8px]">Le {recuApercu.date} à {recuApercu.heure}</div>
                          <div className="border-t border-dashed border-slate-400 my-2"></div>
                          <div>N°: <span className="font-bold">{recuApercu.id}</span></div>
                          <div>Client: {recuApercu.patientNom}</div>
                          <div>Caissier: {loggedInUser?.nomComplet}</div>
                          
                          {recuApercu.detailsPanier && recuApercu.detailsPanier.length > 0 && (
                            <>
                              <div className="border-t border-dashed border-slate-400 my-2"></div>
                              <div className="flex justify-between font-bold"><span>Pharmacie</span><span>Prix</span></div>
                              <div className="border-t border-dashed border-slate-400 my-2"></div>
                              {recuApercu.detailsPanier.map((l, idx) => (
                                <div key={idx} className="mb-1 flex justify-between items-start">
                                  <span className="flex-1 pr-1">{l.quantite}x {l.medicament.nom}</span>
                                  <span className="font-bold">{l.quantite * l.medicament.prix}F</span>
                                </div>
                              ))}
                            </>
                          )}

                          {recuApercu.detailsExamens && recuApercu.detailsExamens.length > 0 && (
                            <>
                              <div className="border-t border-dashed border-slate-400 my-2"></div>
                              <div className="flex justify-between font-bold"><span>Laboratoire</span><span>Prix</span></div>
                              <div className="border-t border-dashed border-slate-400 my-2"></div>
                              {recuApercu.detailsExamens.map((e, idx) => (
                                <div key={idx} className="mb-1 flex justify-between items-start">
                                  <span className="flex-1 pr-1">1x {e.nom}</span>
                                  <span className="font-bold">{e.prix}F</span>
                                </div>
                              ))}
                            </>
                          )}

                          <div className="border-t border-dashed border-slate-400 my-2"></div>
                          <div className="flex justify-between font-bold text-xs text-blue-800"><span>TOTAL NET:</span><span>{recuApercu.montant} F</span></div>
                          <div className="border-t border-dashed border-slate-400 my-2"></div>
                          <div className="flex justify-center my-2">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${recuApercu.id}`} alt="QR" className="w-16 h-16 object-contain" />
                          </div>
                          <div className="text-center mt-2 text-[8px] italic">Prompt rétablissement !</div>
                        </div>
                        <div className="flex gap-3 w-full">
                          <button onClick={() => setRecuApercu(null)} className="flex-1 bg-white border border-slate-300 text-slate-700 p-3 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-sm">Fermer</button>
                          <button onClick={() => lancerImpressionThermique(recuApercu)} className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 shadow-md transition-colors"><Printer size={18}/> Imprimer Pop-up</button>
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
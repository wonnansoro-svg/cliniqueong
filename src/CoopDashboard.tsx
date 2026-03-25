import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, setDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, ShieldPlus, Stethoscope as GenMed,
  Scan, Search, Trash2, AlertCircle, ShoppingCart, Camera,
  Clock, CheckCircle2, Thermometer, Weight, HeartPulse,
  FileText, PlusCircle, Check,
  BarChart3, Package, TrendingUp, AlertTriangle, Plus,
  Lock, UserPlus, LogOut, Save, X, FileBarChart, Ban, Download, Menu, Wand2, Eye
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

// --- TYPES DE DONNÉES ---
type Role = 'Responsable' | 'Medecin' | 'Infirmier' | 'Caissiere' | 'Accueil' | 'Superviseur' | 'President';
type ServiceType = 'PED' | 'GEN' | 'MAT' | 'CHIR';

// NOUVEAU : Tarifs des consultations
const PRIX_CONSULTATION: Record<ServiceType, number> = {
  GEN: 5000,
  PED: 4000,
  MAT: 6000,
  CHIR: 10000
};

interface User { id: string; username: string; mdp: string; role: Role; nomComplet: string; }
interface ConstantesVitales { sys: number; dia: number; temp: number; poids: number; }
interface Medicament { id: string; codeBarre: string; nom: string; stock: number; prix: number; }
interface LignePanier { medicament: Medicament; quantite: number; }
interface LigneOrdonnance { medicament: Medicament; quantite: number; }
interface RapportVente { id: string; patientNom: string; montant: number; heure: string; date: string; detailsPanier: LignePanier[]; }

interface Patient {
  id: string; // ID unique de la visite
  dossierId?: string; // ID unique et permanent du dossier patient
  ticket: string; nom: string; service: ServiceType;
  statut: 'Accueil' | 'Triage' | 'Consultation' | 'Pharmacie' | 'Terminé';
  heureArrivee: string; constantes?: ConstantesVitales; ordonnance?: LigneOrdonnance[];
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
  const [adminSubTab, setAdminSubTab] = useState<'stats' | 'stock' | 'personnel' | 'rapports'>('stats');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- BASE DE DONNÉES HYBRIDE (Local + Firebase) ---
  const [patients, setPatients] = useState<Patient[]>([
    { id: 'VIS-001', dossierId: 'DOS-0012', ticket: 'GEN-001', nom: 'Kouassi Aya', service: 'GEN', statut: 'Triage', heureArrivee: '08:15' },
  ]);
  
  const [medicaments, setMedicaments] = useState<Medicament[]>([
    { id: 'M1', codeBarre: '123456789', nom: 'Paracétamol 500mg', stock: 150, prix: 1500 },
    { id: 'M2', codeBarre: '987654321', nom: 'Amoxicilline Sachet', stock: 5, prix: 3500 },
  ]);

  const [historiqueVentes, setHistoriqueVentes] = useState<RapportVente[]>([]);

  // --- ÉTATS RECHERCHES & ACCUEIL ---
  const [searchMedecin, setSearchMedecin] = useState('');
  const [searchAdminStock, setSearchAdminStock] = useState('');
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauService, setNouveauService] = useState<ServiceType>('GEN');
  const [ticketGenere, setTicketGenere] = useState<Patient | null>(null);
  
  // NOUVEAU: Gestion des anciens dossiers à l'accueil
  const [ancienDossierId, setAncienDossierId] = useState<string | null>(null);
  const [isAccueilCameraActive, setIsAccueilCameraActive] = useState(false);

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

  const [selectedPatientPharmacie, setSelectedPatientPharmacie] = useState<Patient | null>(null);
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [messageErreur, setMessageErreur] = useState('');
  const [recuApercu, setRecuApercu] = useState<RapportVente | null>(null); 
  const inputScanRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAdminCameraActive, setIsAdminCameraActive] = useState(false);

  // ==========================================================================
  // SYNERGIE TEMPS RÉEL (FIREBASE)
  // ==========================================================================
  useEffect(() => {
    if (!db) return;
    
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const data: Patient[] = [];
      snapshot.forEach(doc => data.push(doc.data() as Patient));
      if (data.length > 0) setPatients(data);
    });

    const unsubMedicaments = onSnapshot(collection(db, 'medicaments'), (snapshot) => {
      const data: Medicament[] = [];
      snapshot.forEach(doc => data.push(doc.data() as Medicament));
      if (data.length > 0) setMedicaments(data);
    });

    const unsubVentes = onSnapshot(collection(db, 'ventes'), (snapshot) => {
      const data: RapportVente[] = [];
      snapshot.forEach(doc => data.push(doc.data() as RapportVente));
      data.sort((a, b) => new Date(b.date + ' ' + b.heure).getTime() - new Date(a.date + ' ' + a.heure).getTime());
      if (data.length > 0) setHistoriqueVentes(data);
    });

    const unsubUtilisateurs = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      const data: User[] = [];
      snapshot.forEach(doc => data.push(doc.data() as User));
      if (data.length > 0) setUtilisateurs(data);
    });

    return () => {
      unsubPatients();
      unsubMedicaments();
      unsubVentes();
      unsubUtilisateurs();
    };
  }, []);

  const syncToFirebase = async (colName: string, docId: string, data: any) => {
    if (!db) return;
    try {
      await setDoc(doc(db, colName, docId), data, { merge: true });
    } catch (e) { 
      console.error("Erreur de sync Firebase (Mode hors ligne conservé):", e); 
    }
  };


  // ==========================================================================
  // GESTION STABILISÉE DES CAMÉRAS (SCANNERS)
  // ==========================================================================
  
  const handleTraitementScan = useCallback((code: string) => {
    setMessageErreur('');
    if (code.startsWith('DOS-')) {
      // On cherche par dossierId ou par id(pour rétrocompatibilité)
      const patientTrouve = patients.find(p => (p.dossierId === code || p.id === code) && p.statut === 'Pharmacie');
      if (patientTrouve) {
        setSelectedPatientPharmacie(patientTrouve);
      } else {
        setMessageErreur('Dossier patient introuvable ou non envoyé en pharmacie.');
      }
    } else {
      const med = medicaments.find(m => m.codeBarre === code);
      if (!med) return setMessageErreur('Médicament introuvable.');
      if (med.stock <= 0) return setMessageErreur(`Rupture de stock pour ${med.nom}.`);
      
      const existant = panier.find(l => l.medicament.id === med.id);
      if (existant) {
        if (existant.quantite >= med.stock) return setMessageErreur('Stock maximum atteint.');
        setPanier(prev => prev.map(l => l.medicament.id === med.id ? { ...l, quantite: l.quantite + 1 } : l));
      } else {
        setPanier(prev => [...prev, { medicament: med, quantite: 1 }]);
      }
    }
    setCodeSaisi(''); 
  }, [patients, medicaments, panier]);

  const handleTraitementScanRef = useRef(handleTraitementScan);
  useEffect(() => { handleTraitementScanRef.current = handleTraitementScan; }, [handleTraitementScan]);

  // Focus automatique
  useEffect(() => {
    if (activeTab === 'pharmacie' && inputScanRef.current && !recuApercu && !isCameraActive) {
      inputScanRef.current.focus();
    }
  }, [activeTab, recuApercu, isCameraActive]);

  // NOUVEAU: Scanner Accueil (Recherche de dossier)
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;
    if (isAccueilCameraActive) {
      setTimeout(() => {
        const element = document.getElementById("accueil-reader");
        if (element) {
          html5QrcodeScanner = new Html5QrcodeScanner(
            "accueil-reader", { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: "environment" } }, false
          );
          html5QrcodeScanner.render(
            (decodedText) => {
              if (decodedText.startsWith('DOS-')) {
                const pastVisits = patients.filter(p => p.dossierId === decodedText || p.id === decodedText);
                if (pastVisits.length > 0) {
                  setAncienDossierId(decodedText);
                  setNouveauNom(pastVisits[0].nom); // On récupère le nom
                } else {
                  alert("Dossier inconnu dans le système.");
                }
              }
              if (html5QrcodeScanner) html5QrcodeScanner.clear();
              setIsAccueilCameraActive(false); 
            },
            (error) => {}
          );
        }
      }, 150);
    }
    return () => { if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(e => console.error(e)); };
  }, [isAccueilCameraActive, patients]);

  // Scanner Pharmacie (Caméra)
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;
    if (isCameraActive) {
      setTimeout(() => {
        const element = document.getElementById("reader");
        if (element) {
          html5QrcodeScanner = new Html5QrcodeScanner(
            "reader", { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: "environment" } }, false
          );
          html5QrcodeScanner.render(
            (decodedText) => {
              handleTraitementScanRef.current(decodedText);
              if (html5QrcodeScanner) html5QrcodeScanner.clear();
              setIsCameraActive(false); 
            },
            (error) => { }
          );
        }
      }, 150);
    }
    return () => { if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(e => console.error(e)); };
  }, [isCameraActive]);

  // Scanner Admin (Ajout produit)
  const handleAdminScanRef = useRef((code: string) => setNewProduct(prev => ({...prev, codeBarre: code})));
  useEffect(() => { handleAdminScanRef.current = (code) => setNewProduct(prev => ({...prev, codeBarre: code})); }, []);

  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;
    if (isAdminCameraActive) {
      setTimeout(() => {
        const element = document.getElementById("admin-reader");
        if (element) {
          html5QrcodeScanner = new Html5QrcodeScanner(
            "admin-reader", { fps: 10, qrbox: { width: 250, height: 100 }, videoConstraints: { facingMode: "environment" } }, false
          );
          html5QrcodeScanner.render(
            (decodedText) => {
              handleAdminScanRef.current(decodedText);
              if (html5QrcodeScanner) html5QrcodeScanner.clear();
              setIsAdminCameraActive(false);
            },
            (error) => { }
          );
        }
      }, 150);
    }
    return () => { if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(e => console.error(e)); };
  }, [isAdminCameraActive]);


  // --- AUTHENTIFICATION HYBRIDE ---
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

  // --- LOGIQUE MÉTIER ---
  const genererTicket = () => {
    if (!nouveauNom.trim()) return;
    const numeroFormatte = (patients.filter(p => p.service === nouveauService).length + 1).toString().padStart(3, '0');
    
    // NOUVEAU: Maintien du DossierId si c'est un ancien patient
    const finalDossierId = ancienDossierId || `DOS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const newPatient: Patient = {
      id: `VIS-${Date.now()}`, // ID de la visite unique
      dossierId: finalDossierId,
      ticket: `${nouveauService}-${numeroFormatte}`, 
      nom: nouveauNom, service: nouveauService,
      statut: 'Triage', heureArrivee: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setPatients([...patients, newPatient]); 
    setTicketGenere(newPatient); 
    setNouveauNom('');
    setAncienDossierId(null);
    syncToFirebase('patients', newPatient.id, newPatient);

    // NOUVEAU: Facturation automatique de la consultation
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
    const printWindow = window.open('', '_blank', 'width=300,height=500');
    if (!printWindow) return;
    const htmlTicket = `
      <html><head><title>Ticket Patient</title>
      <style>
        body { font-family: 'Arial', sans-serif; width: 58mm; padding: 10px; margin: 0; text-align: center; }
        .bold { font-weight: bold; }
        .ticket-num { font-size: 28px; margin: 10px 0; border: 2px solid #000; padding: 5px; }
        .qr-img { width: 120px; height: 120px; margin: 10px auto; }
        .price { font-size: 14px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;}
      </style></head><body>
        <div class="bold" style="font-size:16px;">ONG SANTE PLUS</div>
        <div style="font-size:12px; margin-bottom: 10px;">${new Date().toLocaleDateString()} - ${ticketGenere.heureArrivee}</div>
        <div>Ticket d'attente</div>
        <div class="ticket-num bold">${ticketGenere.ticket}</div>
        <div>${ticketGenere.nom}</div>
        <div class="price bold">Frais de dossier : ${PRIX_CONSULTATION[ticketGenere.service]} FCFA</div>
        <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketGenere.dossierId}" />
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

  const handleToggleOrdonnance = (med: Medicament) => {
    setOrdonnance(prev => prev.find(o => o.medicament.id === med.id) ? prev.filter(o => o.medicament.id !== med.id) : [...prev, { medicament: med, quantite: 1 }]);
  };
  const updateQuantiteOrdonnance = (idMed: string, delta: number) => {
    setOrdonnance(prev => prev.map(o => o.medicament.id === idMed ? { ...o, quantite: Math.max(1, o.quantite + delta) } : o));
  };
  const totalOrdonnance = ordonnance.reduce((sum, o) => sum + (o.medicament.prix * o.quantite), 0);

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
    
    const montantTotal = panier.reduce((sum, l) => sum + (l.medicament.prix * l.quantite), 0);
    const dateActuelle = new Date();
    const nouvelleTransaction: RapportVente = {
      id: `FA-${Math.floor(Math.random() * 10000)}`, patientNom: selectedPatientPharmacie?.nom || 'Client Externe',
      montant: montantTotal, heure: dateActuelle.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: dateActuelle.toLocaleDateString(), detailsPanier: [...panier] 
    };
    
    setHistoriqueVentes([nouvelleTransaction, ...historiqueVentes]);
    syncToFirebase('ventes', nouvelleTransaction.id, nouvelleTransaction); 
    
    if (selectedPatientPharmacie) {
      const patientAjourne = { ...selectedPatientPharmacie, statut: 'Terminé' as const };
      setPatients(patients.map(p => p.id === selectedPatientPharmacie.id ? patientAjourne : p));
      setSelectedPatientPharmacie(null); syncToFirebase('patients', patientAjourne.id, patientAjourne);
    }
    setPanier([]); setRecuApercu(nouvelleTransaction);
  };

  const lancerImpressionThermique = (transaction: RapportVente) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;
    const htmlTicket = `
      <html><head><title>Ticket de Caisse - ${transaction.id}</title>
      <style>
        @page { margin: 0; size: 58mm auto; }
        body { font-family: 'Courier New', Courier, monospace; width: 58mm; padding: 5px; margin: 0; font-size: 12px; color: #000; }
        .center { text-align: center; } .bold { font-weight: bold; }
        .flex { display: flex; justify-content: space-between; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .item-row { margin-bottom: 3px; }
        .qr-code { width: 100px; height: 100px; margin: 10px auto; display: block; }
      </style></head><body>
        <div class="center bold" style="font-size:14px; margin-bottom: 2px;">ONG SANTE PLUS</div>
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
          <div class="item-row"><div>${l.medicament.nom}</div><div class="flex"><span>${l.quantite} x ${l.medicament.prix}F</span><span>${l.quantite * l.medicament.prix}F</span></div></div>
        `).join('')}
        <div class="divider"></div>
        <div class="flex bold" style="font-size: 14px;"><span>TOTAL NET:</span><span>${transaction.montant} F</span></div>
        <div class="divider"></div>
        <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${transaction.id}" alt="QR Code Reçu" />
        <div class="center" style="margin-top:5px; font-size:10px;">Bonne guérison !</div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body></html>
    `;
    printWindow.document.write(htmlTicket); printWindow.document.close();
    setRecuApercu(null); 
  };

  const saveUser = () => {
    if (!newUser.username || !newUser.mdp || !newUser.nomComplet) return;
    const finalUser = { ...newUser, id: `U${Date.now()}` } as User;
    setUtilisateurs([...utilisateurs, finalUser]);
    syncToFirebase('utilisateurs', finalUser.id, finalUser);
    setShowAddUser(false); setNewUser({ role: 'Medecin' });
  };

  const deleteUser = (id: string) => {
    if(id === loggedInUser?.id) return alert("Impossible de supprimer votre propre compte.");
    setUtilisateurs(utilisateurs.filter(u => u.id !== id));
  };

  const genererCodeBarreAdmin = () => {
    const codeGenere = Math.floor(100000000000 + Math.random() * 900000000000).toString(); 
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

  const imprimerEtiquette = (med: Partial<Medicament>) => {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) return;
    const htmlLabel = `
      <html><head><title>Étiquette - ${med.nom}</title>
      <style>
        @page { margin: 0; size: 50mm 30mm; }
        body { font-family: Arial, sans-serif; width: 50mm; height: 30mm; margin: 0; padding: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; }
        .title { font-size: 10px; font-weight: bold; margin-bottom: 2px; max-height: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;}
        .price { font-size: 9px; font-weight: bold; margin-bottom: 2px; }
        .barcode { max-width: 100%; max-height: 14px; }
      </style></head><body>
        <div class="title">${med.nom || 'Produit'}</div>
        <div class="price">${med.prix ? med.prix.toLocaleString() + ' FCFA' : ''}</div>
        <img class="barcode" src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${med.codeBarre}&scale=2&height=10&includetext=true" alt="Barcode"/>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body></html>
    `;
    printWindow.document.write(htmlLabel); printWindow.document.close();
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
      <h2>Rapport des Encaissements - ONG SANTE PLUS</h2><p>Date : ${new Date().toLocaleDateString()}</p>
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
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4 font-sans w-full overflow-hidden">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30"><ShieldPlus size={32} className="text-white" /></div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">ONG SANTE PLUS</h1>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{loginError}</div>}
            <div><label className="text-xs font-bold text-slate-500 block mb-1">Identifiant</label><input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none" required /></div>
            <div><label className="text-xs font-bold text-slate-500 block mb-1">Mot de passe</label><input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none" required /></div>
            <button type="submit" className="mt-4 w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2"><Lock size={18} /> Connexion</button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 border text-center">
            <strong>Tests Locaux (Mdp: 1234) :</strong> admin, medecin, infirmier, caisse, accueil, <strong>president</strong>, <strong>superviseur</strong>
          </div>
        </div>
      </div>
    );
  }

  // --- GESTION DES RÔLES ---
  const isPresident = loggedInUser.role === 'President';
  const isSuperviseur = loggedInUser.role === 'Superviseur';
  const isAdminOrAbove = loggedInUser.role === 'Responsable' || isPresident || isSuperviseur;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 font-sans overflow-x-hidden w-full">
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-30 shrink-0 w-full">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 bg-slate-800 rounded-lg text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu size={24} /></button>
          <div className="bg-blue-500 p-2 rounded-lg"><ShieldPlus size={24} className="text-white" /></div>
          <h1 className="text-xl font-bold hidden sm:block">ONG SANTE PLUS</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block"><p className="text-sm font-bold text-emerald-400">Connecté(e)</p><p className="text-sm font-bold">{loggedInUser.nomComplet} ({loggedInUser.role})</p></div>
          <button onClick={handleLogout} className="bg-slate-800 hover:bg-red-500 p-2.5 rounded-xl text-slate-300"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative w-full">
        {/* SIDEBAR RESPONSIVE AVEC LOGIQUE DE ROLES */}
        <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-white border-r py-6 absolute md:relative z-20 h-full transition-all`}>
          <nav className="flex flex-col gap-2 px-4">
            {isAdminOrAbove && <button onClick={() => {setActiveTab('admin'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><BarChart3 size={20} /> Administration {isPresident && <Eye size={16} className="ml-auto opacity-50" title="Lecture seule"/>}</button>}
            {(loggedInUser.role === 'Accueil' || isSuperviseur) && <button onClick={() => {setActiveTab('accueil'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Réception</button>}
            {(loggedInUser.role === 'Infirmier' || isSuperviseur) && <button onClick={() => {setActiveTab('triage'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={20} /> Infirmerie</button>}
            {(loggedInUser.role === 'Medecin' || isSuperviseur) && <button onClick={() => {setActiveTab('medecin'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Stethoscope size={20} /> Consultation</button>}
            {(loggedInUser.role === 'Caissiere' || isSuperviseur) && <button onClick={() => {setActiveTab('pharmacie'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Pill size={20} /> Pharmacie & Caisse</button>}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 relative w-full overflow-x-hidden">
          {isMobileMenuOpen && <div className="absolute inset-0 bg-slate-900/50 z-10 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

          {/* === MODULE 0: ADMIN === */}
          {activeTab === 'admin' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Espace Administrateur</h2>
                  {isPresident && <p className="text-emerald-600 text-sm font-bold flex items-center gap-1 mt-1"><Eye size={16}/> Mode Consultation (Lecture seule)</p>}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6 border-b pb-2 overflow-x-auto w-full">
                <button onClick={() => setAdminSubTab('stats')} className={`px-4 py-2 font-bold rounded-lg ${adminSubTab === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Tableau de bord</button>
                <button onClick={() => setAdminSubTab('stock')} className={`px-4 py-2 font-bold rounded-lg ${adminSubTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Stock Pharmacie</button>
                <button onClick={() => setAdminSubTab('personnel')} className={`px-4 py-2 font-bold rounded-lg ${adminSubTab === 'personnel' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Personnel</button>
                <button onClick={() => setAdminSubTab('rapports')} className={`px-4 py-2 font-bold rounded-lg ${adminSubTab === 'rapports' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Rapports</button>
              </div>

              {adminSubTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
                  <div className="bg-white p-6 rounded-2xl border flex items-center gap-4"><div className="bg-blue-100 p-4 rounded-xl text-blue-600"><Users size={24} /></div><div><p className="text-sm font-bold text-slate-500">Patients du jour</p><p className="text-3xl font-black">{patients.length}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border flex items-center gap-4"><div className="bg-emerald-100 p-4 rounded-xl text-emerald-600"><TrendingUp size={24} /></div><div><p className="text-sm font-bold text-slate-500">Revenus (FCFA)</p><p className="text-3xl font-black">{historiqueVentes.reduce((acc, v) => acc + v.montant, 0).toLocaleString()}</p></div></div>
                  <div className="bg-white p-6 rounded-2xl border flex items-center gap-4"><div className="bg-red-100 p-4 rounded-xl text-red-600"><AlertTriangle size={24} /></div><div><p className="text-sm font-bold text-slate-500">Alertes Stocks</p><p className="text-3xl font-black text-red-600">{medicaments.filter(m => m.stock < 10).length}</p></div></div>
                </div>
              )}

              {adminSubTab === 'stock' && (
                 <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col w-full overflow-hidden">
                 <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                   <h3 className="font-bold flex items-center gap-2"><Package size={20}/> Base de médicaments</h3>
                   <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                     <div className="relative flex-1 sm:w-64">
                       <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                       <input type="text" placeholder="Rechercher..." value={searchAdminStock} onChange={e => setSearchAdminStock(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-500" />
                     </div>
                     {!isPresident && <button onClick={() => setShowAddProduct(!showAddProduct)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">{showAddProduct ? 'Fermer' : 'Nouveau Produit'}</button>}
                   </div>
                 </div>
                 
                 {showAddProduct && !isPresident && (
                   <div className="p-5 bg-blue-50 border-b flex flex-col gap-4 w-full">
                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                       <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500">Nom</label><input type="text" value={newProduct.nom || ''} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
                       <div className="md:col-span-4">
                         <label className="text-xs font-bold text-slate-500">Code Barre</label>
                         <div className="flex gap-2">
                           <input type="text" value={newProduct.codeBarre || ''} onChange={e => setNewProduct({...newProduct, codeBarre: e.target.value})} className="w-full p-2.5 border rounded-lg font-mono text-sm outline-none" />
                           <button onClick={genererCodeBarreAdmin} className="bg-slate-200 text-slate-700 p-2.5 rounded-lg"><Wand2 size={20}/></button>
                           <button onClick={() => setIsAdminCameraActive(!isAdminCameraActive)} className={`${isAdminCameraActive ? 'bg-red-600' : 'bg-blue-600'} text-white p-2.5 rounded-lg`}><Camera size={20}/></button>
                         </div>
                       </div>
                       <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Prix</label><input type="number" value={newProduct.prix || ''} onChange={e => setNewProduct({...newProduct, prix: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg outline-none" /></div>
                       <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500">Stock</label><div className="flex gap-2"><input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg outline-none" /><button onClick={saveProduct} className="bg-slate-900 text-white px-4 py-2.5 rounded-lg font-bold">Créer</button></div></div>
                     </div>
                     {newProduct.codeBarre && (
                       <div className="mt-2 p-4 bg-white rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4">
                         <div className="flex flex-col items-center sm:items-start">
                           <p className="text-xs font-bold text-slate-500 uppercase mb-2">Aperçu :</p>
                           <img src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${newProduct.codeBarre}&scale=2&height=10&includetext=true`} alt="Aperçu" className="max-h-16" />
                         </div>
                         <button onClick={() => imprimerEtiquette(newProduct as Medicament)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-bold flex gap-2 w-full sm:w-auto"><Printer size={16}/> Imprimer l'étiquette</button>
                       </div>
                     )}
                     {isAdminCameraActive && (
                       <div className="w-full max-w-sm mx-auto bg-white p-2 rounded-xl relative">
                         <button onClick={() => setIsAdminCameraActive(false)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded z-10"><X size={16}/></button>
                         <div id="admin-reader" className="w-full min-h-[200px]"></div>
                       </div>
                     )}
                   </div>
                 )}
                 <div className="w-full overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                     <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Médicament</th><th className="p-4">Code Barre</th><th className="p-4">Prix</th><th className="p-4">Stock</th>{!isPresident && <th className="p-4">Action</th>}</tr></thead>
                     <tbody>
                       {medicaments.filter(m => m.nom.toLowerCase().includes(searchAdminStock.toLowerCase()) || m.codeBarre.includes(searchAdminStock)).map(med => (
                         <tr key={med.id} className="border-b"><td className="p-4 font-bold">{med.nom}</td><td className="p-4 font-mono">{med.codeBarre}</td><td className="p-4">{med.prix.toLocaleString()} F</td><td className="p-4"><span className={`px-2 py-1 rounded-full font-bold text-xs ${med.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{med.stock}</span></td>
                         {!isPresident && <td className="p-4">
                           <button onClick={() => {
                             const qty = prompt("Ajouter au stock :");
                             if(qty && !isNaN(Number(qty))) {
                                const updatedMed = {...med, stock: med.stock + Number(qty)};
                                setMedicaments(medicaments.map(m => m.id === med.id ? updatedMed : m));
                                syncToFirebase('medicaments', med.id, updatedMed);
                             }
                           }} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-xs">+ Stock</button>
                         </td>}</tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
              )}

              {adminSubTab === 'personnel' && (
                 <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col w-full overflow-hidden">
                 <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                   <h3 className="font-bold flex items-center gap-2"><UserPlus size={20}/> Utilisateurs</h3>
                   {!isPresident && <button onClick={() => setShowAddUser(!showAddUser)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Créer un compte</button>}
                 </div>
                 {showAddUser && !isPresident && (
                    <div className="p-4 bg-blue-50 border-b grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                     <div><label className="text-xs font-bold">Nom</label><input type="text" onChange={e => setNewUser({...newUser, nomComplet: e.target.value})} className="w-full p-2 border rounded-lg outline-none" /></div>
                     <div><label className="text-xs font-bold">Login</label><input type="text" onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-2 border rounded-lg outline-none" /></div>
                     <div><label className="text-xs font-bold">Mdp</label><input type="text" onChange={e => setNewUser({...newUser, mdp: e.target.value})} className="w-full p-2 border rounded-lg outline-none" /></div>
                     <div><label className="text-xs font-bold">Rôle</label><select onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full p-2 border rounded-lg outline-none"><option value="Medecin">Médecin</option><option value="Responsable">Admin</option><option value="Superviseur">Superviseur</option><option value="President">Président</option></select></div>
                     <div><button onClick={saveUser} className="w-full bg-slate-900 text-white p-2 rounded-lg">Enregistrer</button></div>
                   </div>
                 )}
                 <div className="w-full overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                     <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-4">Nom</th><th className="p-4">Rôle</th><th className="p-4">Login</th>{!isPresident && <th className="p-4">Actions</th>}</tr></thead>
                     <tbody>{utilisateurs.map(u => (<tr key={u.id} className="border-b"><td className="p-4 font-bold">{u.nomComplet}</td><td className="p-4">{u.role}</td><td className="p-4">{u.username}</td>{!isPresident && <td className="p-4"><button onClick={() => deleteUser(u.id)} className="text-red-500"><Trash2 size={16}/></button></td>}</tr>))}</tbody>
                   </table>
                 </div>
               </div>
              )}

              {adminSubTab === 'rapports' && (
                <div className="bg-white border rounded-2xl shadow-sm flex-1 flex flex-col w-full overflow-hidden">
                  <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                    <h3 className="font-bold flex items-center gap-2"><FileBarChart size={20}/> Historique</h3>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <button onClick={exporterExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex gap-2 flex-1 justify-center"><Download size={16}/> Excel</button>
                      <button onClick={exporterPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex gap-2 flex-1 justify-center"><FileText size={16}/> PDF</button>
                    </div>
                  </div>
                  <div className="w-full overflow-x-auto p-4">
                    <table className="w-full text-left text-sm border whitespace-nowrap min-w-[600px]">
                      <thead><tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs"><th className="p-3">Facture</th><th className="p-3">Date/Heure</th><th className="p-3">Patient</th><th className="p-3 text-right">Montant</th></tr></thead>
                      <tbody>{historiqueVentes.map(v => (<tr key={v.id} className="border-b"><td className="p-3 font-mono">{v.id}</td><td className="p-3">{v.date} {v.heure}</td><td className="p-3 font-bold">{v.patientNom}</td><td className="p-3 text-right font-bold text-emerald-600">{v.montant.toLocaleString()} F</td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODULE 1: ACCUEIL === */}
          {activeTab === 'accueil' && (
             <div className="max-w-4xl mx-auto h-full overflow-y-auto w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Accueil & Enregistrement</h2>
              <p className="text-slate-500 mb-6 md:mb-8 text-sm">Génération de dossiers et tickets</p>

              {/* NOUVEAU: Option Ancien Dossier */}
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-blue-50 p-4 rounded-xl border border-blue-100 gap-4">
                <div>
                  <h3 className="font-bold text-blue-900">Patient existant ?</h3>
                  <p className="text-xs text-blue-700">Scannez son QR code pour retrouver son dossier.</p>
                </div>
                <button onClick={() => setIsAccueilCameraActive(!isAccueilCameraActive)} className={`p-3 rounded-lg text-white font-bold flex gap-2 w-full sm:w-auto justify-center ${isAccueilCameraActive ? 'bg-red-500' : 'bg-blue-600'}`}>
                  <Camera size={18} /> {isAccueilCameraActive ? 'Fermer Caméra' : 'Scanner Ancien Dossier'}
                </button>
              </div>

              {isAccueilCameraActive && (
                <div className="mb-6 bg-black rounded-xl overflow-hidden border-2 border-blue-500 w-full max-w-sm mx-auto relative">
                  <button onClick={() => setIsAccueilCameraActive(false)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded z-10"><X size={16}/></button>
                  <div id="accueil-reader" className="w-full min-h-[200px]"></div>
                  <p className="text-white text-xs text-center p-2">Pointez vers le QR Code du patient</p>
                </div>
              )}

              {ancienDossierId && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-emerald-800 flex items-center gap-2"><CheckCircle2 size={18}/> Dossier reconnu</h4>
                    <button onClick={() => {setAncienDossierId(null); setNouveauNom('');}} className="text-xs text-red-600 font-bold bg-white px-2 py-1 rounded border hover:bg-red-50">Annuler</button>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-2">Historique des passages :</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {patients.filter(p => p.dossierId === ancienDossierId || p.id === ancienDossierId).map((p, i) => (
                       <li key={i}>• {p.heureArrivee} - Service {p.service} ({p.statut})</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white p-4 md:p-6 rounded-2xl border shadow-sm w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet du patient</label>
                    <input type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} disabled={!!ancienDossierId} placeholder="Ex: Koffi Emmanuel" className="w-full p-4 border rounded-xl outline-none focus:border-blue-400 disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Service & Tarification</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => setNouveauService('GEN')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold ${nouveauService === 'GEN' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><GenMed size={18}/> Général</div><span className="text-xs">{PRIX_CONSULTATION.GEN} F</span>
                      </button>
                      <button onClick={() => setNouveauService('PED')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold ${nouveauService === 'PED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><Baby size={18}/> Pédiatrie</div><span className="text-xs">{PRIX_CONSULTATION.PED} F</span>
                      </button>
                      <button onClick={() => setNouveauService('MAT')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold ${nouveauService === 'MAT' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><Heart size={18}/> Maternité</div><span className="text-xs">{PRIX_CONSULTATION.MAT} F</span>
                      </button>
                      <button onClick={() => setNouveauService('CHIR')} className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold ${nouveauService === 'CHIR' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <div className="flex gap-2 items-center"><Activity size={18}/> Chirurgie</div><span className="text-xs">{PRIX_CONSULTATION.CHIR} F</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={genererTicket} disabled={!nouveauNom.trim()} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><QrCode size={20} /> Valider & Générer Ticket ({PRIX_CONSULTATION[nouveauService]} F)</button>
              </div>

              {ticketGenere && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
                    <div className="bg-slate-900 text-white text-center p-6 pb-8 rounded-b-[2rem] relative">
                      <p className="text-slate-300 text-sm font-medium uppercase tracking-widest mb-1">Votre Numéro</p>
                      <h1 className="text-5xl font-black">{ticketGenere.ticket}</h1>
                    </div>
                    <div className="p-8 text-center -mt-6">
                      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 mx-auto inline-block border">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketGenere.dossierId}`} alt="QR Code Patient" className="w-32 h-32 object-contain" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">{ticketGenere.nom}</h2>
                      <p className="text-slate-500 text-sm mb-2">Dossier: <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded">{ticketGenere.dossierId}</span></p>
                      <div className="bg-blue-50 text-blue-800 p-2 rounded-lg font-bold text-sm">Frais Consultation : {PRIX_CONSULTATION[ticketGenere.service]} FCFA</div>
                    </div>
                    <div className="p-4 bg-slate-50 flex gap-3 border-t">
                      <button onClick={() => setTicketGenere(null)} className="flex-1 bg-white border text-slate-700 py-3 rounded-xl font-bold">Fermer</button>
                      <button onClick={imprimerTicketAccueil} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2"><Printer size={18} /> Imprimer</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODULE 2: INFIRMERIE === */}
          {activeTab === 'triage' && (
             <div className="h-full flex flex-col w-full">
               <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Infirmerie - Triage</h2>
               <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 flex-1 min-h-0 w-full">
                 <div className="lg:col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[30vh] lg:max-h-full w-full">
                   <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Patients en attente</h3>
                   {patients.filter(p => p.statut === 'Triage').map(patient => (
                     <div key={patient.id} onClick={() => setSelectedPatientTriage(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 ${selectedPatientTriage?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                       <div className="flex justify-between items-center"><span className="font-bold text-slate-800">{patient.nom}</span><span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{patient.ticket}</span></div>
                     </div>
                   ))}
                 </div>
                 <div className="lg:col-span-2 bg-white border rounded-2xl p-4 md:p-6 shadow-sm overflow-y-auto w-full">
                   {selectedPatientTriage ? (
                     <>
                        <h3 className="text-lg md:text-xl font-bold mb-4 border-b pb-4">Constantes : {selectedPatientTriage.nom}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <div><label className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Sys</label><input type="number" value={tensionSys} onChange={e => setTensionSys(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><HeartPulse size={16} className="text-red-500"/> Tension Dia</label><input type="number" value={tensionDia} onChange={e => setTensionDia(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Thermometer size={16} className="text-orange-500"/> Temp (°C)</label><input type="number" value={temperature} onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
                          <div><label className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Weight size={16} className="text-emerald-500"/> Poids (kg)</label><input type="number" value={poids} onChange={e => setPoids(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-4 border rounded-xl outline-none" /></div>
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
            <div className="h-full flex flex-col w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Bureau du Médecin</h2>
              <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 flex-1 min-h-0 w-full">
                <div className="lg:col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[30vh] lg:max-h-full w-full">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Salle d'attente</h3>
                  {patients.filter(p => p.statut === 'Consultation').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientMed(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 ${selectedPatientMed?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block text-slate-800">{patient.nom}</span><span className="text-xs text-slate-500">{patient.constantes?.sys}/{patient.constantes?.dia} mmHg</span>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-3 bg-white border rounded-2xl flex flex-col shadow-sm overflow-hidden w-full">
                  {selectedPatientMed ? (
                    <div className="flex-1 flex flex-col overflow-y-auto">
                      <div className="bg-slate-900 text-white p-4 md:p-6"><h2 className="text-xl md:text-2xl font-bold">{selectedPatientMed.nom}</h2></div>
                      <div className="p-4 md:p-6 flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 w-full">
                        <div className="flex flex-col gap-4">
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Notes Cliniques</label><textarea className="w-full p-4 border rounded-xl h-32 md:h-40 outline-none focus:border-blue-400" value={notesCliniques} onChange={e => setNotesCliniques(e.target.value)} /></div>
                          <div><label className="text-sm font-bold text-slate-700 mb-2 block">Diagnostic Retenu</label><input type="text" className="w-full p-4 border rounded-xl font-bold outline-none focus:border-blue-400" value={diagnostic} onChange={e => setDiagnostic(e.target.value)} /></div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 md:p-5 flex flex-col border border-blue-100 min-h-[300px] w-full">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-blue-900 flex items-center gap-2"><Pill size={18}/> Ordonnance</h4>
                          </div>
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input type="text" placeholder="Rechercher..." value={searchMedecin} onChange={e => setSearchMedecin(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none" />
                          </div>
                          <div className="bg-white rounded-xl border p-2 mb-4 max-h-32 overflow-y-auto">
                            {medicaments.filter(m => m.nom.toLowerCase().includes(searchMedecin.toLowerCase())).map(med => {
                              const isSelected = ordonnance.some(m => m.medicament.id === med.id);
                              return (
                                <div key={med.id} onClick={() => handleToggleOrdonnance(med)} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-50'}`}>
                                  <div><span className="text-sm font-bold block">{med.nom}</span><span className="text-xs text-slate-500">{med.prix.toLocaleString()} F</span></div>
                                  {isSelected ? <Check size={18} className="text-blue-600"/> : <PlusCircle size={18} className="text-slate-300"/>}
                                </div>
                              );
                            })}
                          </div>
                          <div className="bg-white border rounded-xl p-4 flex-1 flex flex-col w-full">
                            <ul className="list-none p-0 m-0 text-sm font-bold text-slate-700 mb-4 flex-1 overflow-y-auto">
                              {ordonnance.map(o => (
                                <li key={o.medicament.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-2 rounded-lg mb-2 border gap-2">
                                  <span className="truncate flex-1">{o.medicament.nom}</span>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantiteOrdonnance(o.medicament.id, -1)} className="bg-slate-200 px-3 py-1 rounded">-</button>
                                    <span className="w-6 text-center">{o.quantite}</span>
                                    <button onClick={() => updateQuantiteOrdonnance(o.medicament.id, 1)} className="bg-slate-200 px-3 py-1 rounded">+</button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-auto pt-3 border-t flex justify-between items-end"><span className="text-sm text-slate-500 font-bold">Total :</span><span className="text-xl font-black text-blue-600">{totalOrdonnance.toLocaleString()} F</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button onClick={terminerSansOrdonnance} className="w-full sm:w-auto px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl flex items-center justify-center gap-2"><Ban size={18}/> Clôturer</button>
                        <div className="flex gap-3 w-full sm:w-auto"><button onClick={annulerOrdonnance} className="flex-1 px-6 py-3 bg-white border rounded-xl font-bold">Vider</button><button onClick={envoyerPharmacie} disabled={!diagnostic} className="flex-1 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 size={20}/> Envoyer</button></div>
                      </div>
                    </div>
                  ) : <div className="p-12 h-full flex flex-col items-center justify-center text-slate-400"><Stethoscope size={64} className="mb-4 opacity-20" /><p>Sélectionnez un patient.</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* === MODULE 4: PHARMACIE === */}
          {activeTab === 'pharmacie' && (
            <div className="h-full flex flex-col relative w-full">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Caisse Pharmacie</h2>
              <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 flex-1 min-h-0 w-full">
                
                <div className="lg:col-span-1 bg-white border rounded-2xl p-5 shadow-sm overflow-y-auto max-h-[30vh] lg:max-h-full w-full">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18}/> Patients envoyés</h3>
                  {patients.filter(p => p.statut === 'Pharmacie').map(patient => (
                    <div key={patient.id} onClick={() => setSelectedPatientPharmacie(patient)} className={`p-4 rounded-xl cursor-pointer border mb-2 transition-all ${selectedPatientPharmacie?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="font-bold block text-slate-800">{patient.nom}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mt-1 inline-block font-bold">Ordonnance: {patient.ordonnance?.length || 0} prod.</span>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-1 bg-white border rounded-2xl p-4 shadow-sm flex flex-col overflow-y-auto w-full">
                  {selectedPatientPharmacie ? (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-black text-yellow-800 uppercase"><FileText size={16} className="inline"/> À délivrer</h4>
                        <button onClick={() => setSelectedPatientPharmacie(null)} className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-200">Annuler</button>
                      </div>
                      <ul className="text-sm font-bold text-slate-800">
                        {selectedPatientPharmacie.ordonnance?.map(o => (
                          <li key={o.medicament.id} className="flex gap-2 items-center"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div><span className="text-blue-600">{o.quantite}x</span> {o.medicament.nom}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
                      <ShoppingCart size={24} className="mx-auto text-blue-500 mb-2"/>
                      <p className="text-sm text-blue-800 font-bold">Vente Directe (Client Externe)</p>
                      <p className="text-xs text-blue-600 mt-1">Scannez un produit sans dossier.</p>
                    </div>
                  )}

                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Scan size={14}/> Scanner (Dossier ou Médicament)</label>
                      <button onClick={() => setIsCameraActive(!isCameraActive)} className={`p-2 rounded-lg text-white ${isCameraActive ? 'bg-red-500' : 'bg-blue-600'}`}><Camera size={16} /></button>
                    </div>

                    {/* FENÊTRE DE LA CAMÉRA */}
                    {isCameraActive && (
                      <div className="mb-4 bg-black rounded-xl overflow-hidden border-2 border-blue-500 w-full relative">
                        <button onClick={() => setIsCameraActive(false)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded z-10"><X size={16}/></button>
                        <div id="reader" className="w-full min-h-[200px]"></div>
                        <p className="text-white text-xs text-center p-2">Caméra active</p>
                      </div>
                    )}

                    <form onSubmit={e => { e.preventDefault(); handleTraitementScanRef.current(codeSaisi); }} className="relative">
                      <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                      <input ref={inputScanRef} type="text" value={codeSaisi} onChange={(e) => setCodeSaisi(e.target.value)} placeholder="Code Barre ou QR..." className="w-full pl-12 pr-4 py-4 border rounded-xl font-mono text-sm outline-none focus:ring-2 focus:border-blue-500" />
                    </form>
                    {messageErreur && <div className="mt-3 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg"><AlertCircle size={16} className="inline"/> {messageErreur}</div>}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white border rounded-2xl flex flex-col shadow-sm overflow-hidden relative">
                  <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
                    {panier.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12"><Scan size={64} className="mb-4 opacity-20" /><p>Scannez pour ajouter</p></div> : (
                      <div className="flex flex-col gap-3">
                        {panier.map((ligne, i) => (
                          <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-xl border shadow-sm gap-4">
                            <div className="flex-1"><h4 className="font-bold text-slate-800">{ligne.medicament.nom}</h4></div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => updateQuantitePanier(ligne.medicament.id, -1)} className="bg-white px-2 py-1 rounded shadow-sm text-slate-700 font-bold hover:bg-slate-200">-</button>
                                <span className="w-6 text-center font-bold">{ligne.quantite}</span>
                                <button onClick={() => updateQuantitePanier(ligne.medicament.id, 1)} className="bg-white px-2 py-1 rounded shadow-sm text-slate-700 font-bold hover:bg-slate-200">+</button>
                              </div>
                              <div className="text-right w-24"><p className="text-xs text-slate-400">Prix</p><p className="font-bold text-blue-600">{(ligne.medicament.prix * ligne.quantite).toLocaleString()} F</p></div>
                              <button onClick={() => setPanier(panier.filter(l => l.medicament.id !== ligne.medicament.id))} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={20}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-6 bg-slate-900 text-white mt-auto">
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-slate-400 font-medium">Net à payer</p>
                      <p className="text-3xl font-black text-emerald-400">{panier.reduce((t, l) => t + (l.medicament.prix * l.quantite), 0).toLocaleString()} <span className="text-xl text-emerald-600">FCFA</span></p>
                    </div>
                    <button onClick={validerPaiement} disabled={panier.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white p-4 rounded-xl font-bold flex justify-center items-center gap-3">
                      <CheckCircle2 size={24} /> Valider l'Encaissement
                    </button>
                  </div>

                  {/* APERÇU DU REÇU CAISSE */}
                  {recuApercu && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-100 p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full">
                        <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2"><Search size={20}/> Aperçu du ticket</h3>
                        <div className="bg-white p-4 w-[58mm] min-h-[100mm] shadow-lg mb-6 font-mono text-[10px] text-black border mx-auto">
                          <div className="text-center font-bold text-sm mb-1">ONG SANTE PLUS</div>
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
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${recuApercu.id}`} alt="QR" className="w-16 h-16 object-contain" />
                          </div>
                          <div className="text-center mt-2 text-[8px]">Bonne guérison !</div>
                        </div>
                        <div className="flex gap-3 w-full">
                          <button onClick={() => setRecuApercu(null)} className="flex-1 bg-slate-300 text-slate-800 p-3 rounded-xl font-bold">Annuler</button>
                          <button onClick={() => lancerImpressionThermique(recuApercu)} className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold flex justify-center items-center gap-2"><Printer size={18}/> Imprimer</button>
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
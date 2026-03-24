import React, { useState } from 'react';
import { 
  Users, Activity, Stethoscope, Pill, 
  Settings, CreditCard, QrCode, Printer,
  Baby, Heart, ShieldPlus, Stethoscope as GenMed
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// --- TYPES DE DONNÉES ---
type Role = 'Responsable' | 'Medecin' | 'Infirmier' | 'Caissiere' | 'Accueil';
type ServiceType = 'PED' | 'GEN' | 'MAT' | 'CHIR';

interface Patient {
  id: string;          // Numéro de dossier unique
  ticket: string;      // Numéro de passage (ex: PED-001)
  nom: string;
  service: ServiceType;
  statut: 'Accueil' | 'Triage' | 'Consultation' | 'Pharmacie' | 'Caisse' | 'Terminé';
  heureArrivee: string;
}

const ClinicDashboard: React.FC = () => {
  // --- ÉTATS GLOBAUX ---
  const [currentUserRole, setCurrentUserRole] = useState<Role>('Responsable');
  const [activeTab, setActiveTab] = useState<'accueil' | 'triage' | 'medecin' | 'pharmacie' | 'caisse' | 'admin'>('accueil');
  
  // Liste des patients (Base de données simulée)
  const [patients, setPatients] = useState<Patient[]>([]);

  // --- ÉTATS POUR L'ACCUEIL ---
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauService, setNouveauService] = useState<ServiceType>('GEN');
  const [ticketGenere, setTicketGenere] = useState<Patient | null>(null);

  // --- FONCTIONS ---
  // Générer un numéro de ticket selon le service
  const genererTicket = () => {
    if (!nouveauNom.trim()) return;

    // Compter combien de patients sont déjà dans ce service aujourd'hui
    const countService = patients.filter(p => p.service === nouveauService).length + 1;
    const numeroFormatte = countService.toString().padStart(3, '0'); // ex: 001
    
    // Création du patient
    const newPatient: Patient = {
      id: `DOS-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`, // Dossier unique
      ticket: `${nouveauService}-${numeroFormatte}`, // Ticket du jour
      nom: nouveauNom,
      service: nouveauService,
      statut: 'Triage',
      heureArrivee: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setPatients([...patients, newPatient]);
    setTicketGenere(newPatient); // Affiche le modal du ticket
    setNouveauNom(''); // Réinitialise le champ
  };

  // --- GESTION DES ACCÈS (Qui voit quoi ?) ---
  const canSee = (tab: string) => {
    if (currentUserRole === 'Responsable') return true; // Le boss voit tout
    if (currentUserRole === 'Accueil' && tab === 'accueil') return true;
    if (currentUserRole === 'Infirmier' && tab === 'triage') return true;
    if (currentUserRole === 'Medecin' && tab === 'medecin') return true;
    if (currentUserRole === 'Caissiere' && (tab === 'caisse' || tab === 'pharmacie')) return true;
    return false;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* BANDEAU HAUT & SIMULATEUR DE RÔLE */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <ShieldPlus size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-wide hidden sm:block">ONG SANTE PLUS</h1>
        </div>
        
        {/* Simulateur de Profil (Pour les tests) */}
        <div className="flex items-center gap-3 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400 pl-2">Connecté en tant que :</span>
          <select 
            className="bg-slate-700 text-white border-none rounded-lg text-sm p-2 focus:ring-0 cursor-pointer"
            value={currentUserRole}
            onChange={(e) => {
              setCurrentUserRole(e.target.value as Role);
              setActiveTab('accueil'); // Reset la vue par défaut
            }}
          >
            <option value="Responsable">Responsable (Boss)</option>
            <option value="Accueil">Secrétaire Accueil</option>
            <option value="Infirmier">Infirmier (Triage)</option>
            <option value="Medecin">Médecin</option>
            <option value="Caissiere">Caissière</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* MENU LATÉRAL DYNAMIQUE */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 shadow-sm z-0">
          <nav className="flex flex-col gap-2 px-4">
            {canSee('accueil') && (
              <button onClick={() => setActiveTab('accueil')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Users size={20} /> Réception (Accueil)
              </button>
            )}
            {canSee('triage') && (
              <button onClick={() => setActiveTab('triage')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Activity size={20} /> Infirmerie (Triage)
              </button>
            )}
            {canSee('medecin') && (
              <button onClick={() => setActiveTab('medecin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Stethoscope size={20} /> Consultation
              </button>
            )}
            {canSee('pharmacie') && (
              <button onClick={() => setActiveTab('pharmacie')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Pill size={20} /> Pharmacie & Stock
              </button>
            )}
            {canSee('caisse') && (
              <button onClick={() => setActiveTab('caisse')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'caisse' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <CreditCard size={20} /> Caisse / Facturation
              </button>
            )}
            {currentUserRole === 'Responsable' && (
              <button onClick={() => setActiveTab('admin')} className={`mt-8 flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Settings size={20} /> Admin & Rapports
              </button>
            )}
          </nav>
        </aside>

        {/* ZONE PRINCIPALE */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50 relative">
          
          {/* VUE ACCUEIL */}
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

              {/* MODAL TICKET GÉNÉRÉ */}
              {ticketGenere && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                    
                    {/* En-tête du ticket */}
                    <div className="bg-slate-900 text-white text-center p-6 pb-8 rounded-b-[2rem] shadow-inner relative">
                      <p className="text-slate-300 text-sm font-medium uppercase tracking-widest mb-1">Votre Numéro</p>
                      <h1 className="text-5xl font-black tracking-tighter">{ticketGenere.ticket}</h1>
                    </div>

                    {/* Corps du ticket */}
                    <div className="p-8 text-center -mt-6">
                      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 mx-auto inline-block border border-slate-100">
                        {/* Le Code QR dynamique contenant le N° de Dossier */}
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

                    {/* Actions */}
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

          {/* VUES TEMPORAIRES (Pour les autres pages) */}
          {activeTab !== 'accueil' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Settings size={48} className="mb-4 opacity-20 animate-spin-slow" />
              <h2 className="text-2xl font-bold text-slate-600 mb-2">Module en construction</h2>
              <p>Ce module ({activeTab}) sera développé à la prochaine étape.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ClinicDashboard;
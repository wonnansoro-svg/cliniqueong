import React, { useState } from 'react';
import { 
  Users, Activity, Stethoscope, Pill, 
  Search, Plus, ScanBarcode, CreditCard, Clock
} from 'lucide-react';


// --- TYPES ---
interface Patient {
  id: string;
  nom: string;
  age: number;
  sexe: 'M' | 'F';
  statut: 'En attente' | 'Triage' | 'En consultation' | 'Pharmacie' | 'Terminé';
  heureArrivee: string;
  urgence: 'Normale' | 'Moyenne' | 'Élevée';
}

const ClinicDashboard: React.FC = () => {
  // Navigation entre les services de la clinique
  const [activeService, setActiveService] = useState<'accueil' | 'triage' | 'medecin' | 'pharmacie' | 'caisse'>('accueil');
  const [searchTerm, setSearchTerm] = useState('');

  // Faux patients pour la démonstration
  const [patients] = useState<Patient[]>([
    { id: 'P-001', nom: 'Kouassi Aya', age: 34, sexe: 'F', statut: 'En attente', heureArrivee: '08:15', urgence: 'Normale' },
    { id: 'P-002', nom: 'Traoré Seydou', age: 52, sexe: 'M', statut: 'Triage', heureArrivee: '08:30', urgence: 'Élevée' },
    { id: 'P-003', nom: 'Bamba Fatou', age: 8, sexe: 'F', statut: 'Pharmacie', heureArrivee: '07:45', urgence: 'Normale' },
  ]);

  // Fonction pour définir la couleur de l'urgence
  const getUrgencyColor = (urgence: string) => {
    switch(urgence) {
      case 'Élevée': return 'bg-red-100 text-red-700 border-red-200';
      case 'Moyenne': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* HEADER PREMIUM */}
      <div className="bg-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Activity size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">ONG SANTE PLUS</h1>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Système Intégré de Gestion Médicale</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold">Dr. Emmanuel</p>
              <p className="text-xs text-slate-400">Directeur Médical</p>
            </div>
            <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center font-bold border-2 border-blue-500">
              DE
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* MENUS DES SERVICES (Sidebar sur grand écran, haut sur mobile) */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-2">Services</p>
          
          <button onClick={() => setActiveService('accueil')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeService === 'accueil' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-100'}`}>
            <Users size={20} /> Accueil & Dossiers
          </button>
          
          <button onClick={() => setActiveService('triage')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeService === 'triage' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-teal-50 border border-slate-100'}`}>
            <Activity size={20} /> Infirmerie (Triage)
          </button>

          <button onClick={() => setActiveService('medecin')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeService === 'medecin' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-100'}`}>
            <Stethoscope size={20} /> Consultations
          </button>

          <button onClick={() => setActiveService('pharmacie')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeService === 'pharmacie' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-100'}`}>
            <Pill size={20} /> Pharmacie
          </button>

          <button onClick={() => setActiveService('caisse')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeService === 'caisse' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'}`}>
            <CreditCard size={20} /> Caisse Centrale
          </button>
        </div>

        {/* ZONE PRINCIPALE DE TRAVAIL */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[600px]">
            
            {/* EN-TÊTE DYNAMIQUE SELON LE SERVICE */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  {activeService === 'accueil' && 'Réception & Nouveaux Patients'}
                  {activeService === 'triage' && 'Prise des Constantes (Infirmerie)'}
                  {activeService === 'medecin' && 'Salle d\'Attente Médicale'}
                  {activeService === 'pharmacie' && 'Délivrance & Scanner'}
                  {activeService === 'caisse' && 'Facturation Globale'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gérez le flux des patients en temps réel.</p>
              </div>

              {/* Bouton d'action spécifique au service */}
              {activeService === 'pharmacie' && (
                 <button className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 border border-emerald-300 transition-colors">
                   <ScanBarcode size={20} /> Activer Scanner Caméra
                 </button>
              )}
              {activeService === 'accueil' && (
                 <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-colors">
                   <Plus size={20} /> Nouveau Patient
                 </button>
              )}
            </div>

            {/* LISTE FILE D'ATTENTE (Vue globale temporaire) */}
            <div className="mb-4">
              <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher un patient par nom ou ID..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {patients.map(patient => (
                  <div key={patient.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200">
                        {patient.nom.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{patient.nom}</h3>
                        <p className="text-sm text-slate-500">ID: {patient.id} • {patient.sexe} • {patient.age} ans</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto">
                      <div className="flex flex-col items-end">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(patient.urgence)}`}>
                           Urgence : {patient.urgence}
                         </span>
                         <span className="flex items-center gap-1 text-xs text-slate-500 mt-2 font-medium">
                           <Clock size={12} /> Arrivé à {patient.heureArrivee}
                         </span>
                      </div>
                      
                      <button className="hidden md:flex bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 p-2 rounded-lg border border-slate-200 transition-colors">
                        Ouvrir le dossier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ClinicDashboard;
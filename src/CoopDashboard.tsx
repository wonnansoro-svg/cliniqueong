import React, { useState } from 'react';
import { 
  Users, Activity, Stethoscope, Pill, 
  Search, AlertCircle, Clock, CheckCircle2,
  Thermometer, Weight, HeartPulse
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
  // Navigation
  const [activeService, setActiveService] = useState<'accueil' | 'triage' | 'medecin' | 'pharmacie' | 'caisse'>('triage');
  
  // Faux patients
  const [patients] = useState<Patient[]>([
    { id: 'P-001', nom: 'Kouassi Aya', age: 34, sexe: 'F', statut: 'Triage', heureArrivee: '08:15', urgence: 'Normale' },
    { id: 'P-002', nom: 'Traoré Seydou', age: 52, sexe: 'M', statut: 'Triage', heureArrivee: '08:45', urgence: 'Élevée' },
  ]);

  // États pour le formulaire de Triage
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0]);
  const [tensionSys, setTensionSys] = useState<number | ''>(120); // Systolique (le grand chiffre)
  const [tensionDia, setTensionDia] = useState<number | ''>(80);  // Diastolique (le petit chiffre)
  const [temperature, setTemperature] = useState<number | ''>(37.5);
  const [poids, setPoids] = useState<number | ''>(70);

  // LOGIQUE D'ALERTE : Si la tension est >= 140/90, on déclenche l'alerte
  const isTensionHigh = (tensionSys !== '' && tensionSys >= 140) || (tensionDia !== '' && tensionDia >= 90);

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* BANDEAU HAUT */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <HeartPulse size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">ONG SANTE PLUS</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="bg-slate-800 px-3 py-1 rounded-full text-slate-300">Dr. Connecté</span>
          <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white"></div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* MENU LATÉRAL */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 shadow-sm z-0">
          <div className="px-6 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Services</p>
          </div>
          <nav className="flex flex-col gap-2 px-4">
            <button onClick={() => setActiveService('accueil')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeService === 'accueil' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users size={20} /> Accueil
            </button>
            <button onClick={() => setActiveService('triage')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeService === 'triage' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Activity size={20} /> Infirmerie
            </button>
            <button onClick={() => setActiveService('medecin')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeService === 'medecin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Stethoscope size={20} /> Consultation
            </button>
            <button onClick={() => setActiveService('pharmacie')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeService === 'pharmacie' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Pill size={20} /> Pharmacie
            </button>
          </nav>
        </aside>

        {/* ZONE PRINCIPALE - L'INFIRMERIE */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-slate-800">Infirmerie - Triage</h2>
              <p className="text-slate-500 mt-1">Saisie des constantes vitales des patients</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Colonne de gauche : Liste des patients en attente */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-500"/> Patients en attente
              </h3>
              <div className="flex flex-col gap-3">
                {patients.map(patient => (
                  <div 
                    key={patient.id} 
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-3 rounded-xl cursor-pointer border transition-all ${selectedPatient?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800">{patient.nom}</span>
                      <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{patient.id}</span>
                    </div>
                    <p className="text-sm text-slate-500">{patient.age} ans • {patient.sexe}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne de droite : Formulaire des constantes */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {selectedPatient ? (
                <>
                  <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Dossier: {selectedPatient.nom}</h3>
                      <p className="text-slate-500">Prise des constantes</p>
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                      <Activity size={18}/> Phase de Triage
                    </div>
                  </div>

                  {/* ALERTE DYNAMIQUE */}
                  {isTensionHigh && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mb-6 animate-pulse">
                      <AlertCircle className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">Alerte Hypertension Détectée</h4>
                        <p className="text-sm mt-1 text-red-600/80">La tension artérielle du patient est élevée. Un marquage d'urgence sera ajouté pour le médecin.</p>
                      </div>
                    </div>
                  )}

                  {/* FORMULAIRE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Bloc Tension */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <HeartPulse size={16} className="text-rose-500"/> Tension Artérielle (mmHg)
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          value={tensionSys}
                          onChange={(e) => setTensionSys(e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none ${isTensionHigh ? 'border-red-300 focus:ring-red-200 bg-red-50 text-red-700 font-bold' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'}`}
                          placeholder="Systolique (ex: 120)"
                        />
                        <span className="text-slate-400 text-xl font-light">/</span>
                        <input 
                          type="number" 
                          value={tensionDia}
                          onChange={(e) => setTensionDia(e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none ${isTensionHigh ? 'border-red-300 focus:ring-red-200 bg-red-50 text-red-700 font-bold' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'}`}
                          placeholder="Diastolique (ex: 80)"
                        />
                      </div>
                    </div>

                    {/* Bloc Température */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <Thermometer size={16} className="text-orange-500"/> Température (°C)
                      </label>
                      <input 
                        type="number" 
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
                      />
                    </div>

                    {/* Bloc Poids */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <Weight size={16} className="text-emerald-500"/> Poids (kg)
                      </label>
                      <input 
                        type="number" 
                        value={poids}
                        onChange={(e) => setPoids(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
                      />
                    </div>

                  </div>

                  <div className="mt-8 flex justify-end">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm shadow-blue-200">
                      <CheckCircle2 size={20} /> Enregistrer et envoyer au médecin
                    </button>
                  </div>

                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                  <Activity size={48} className="mb-4 opacity-20" />
                  <p>Sélectionnez un patient dans la liste pour commencer le triage.</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default ClinicDashboard;
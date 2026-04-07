import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ProjectData, loadProjectBlobs, deleteProject, cleanupExpiredProjects } from '../services/storage';
import { LayoutTemplate, Plus, Trash2, Clock, LogOut, Loader2, PlaySquare, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  onNewProject: () => void;
  onOpenProject: (project: ProjectData, blobs: any) => void;
}

export function Dashboard({ onNewProject, onOpenProject }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projData: ProjectData[] = [];
      snapshot.forEach((doc) => {
        projData.push(doc.data() as ProjectData);
      });
      // Sort by createdAt descending
      projData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setProjects(projData);
      setLoading(false);
      
      // Cleanup expired projects in the background
      cleanupExpiredProjects(projData).catch(console.error);
    }, (err) => {
      console.error("Error fetching projects", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleOpenProject = async (project: ProjectData) => {
    setOpeningId(project.id);
    try {
      const blobs = await loadProjectBlobs(project.id);
      if (blobs) {
        onOpenProject(project, blobs);
      } else {
        setErrorMsg("Aset proyek tidak ditemukan di perangkat ini.");
      }
    } catch (error) {
      console.error("Error loading project blobs", error);
      setErrorMsg("Gagal memuat aset proyek.");
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteProject(deleteConfirmId);
    } catch (error) {
      console.error("Error deleting project", error);
      setErrorMsg("Gagal menghapus proyek.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-8">
          <LayoutTemplate className="w-8 h-8 text-zinc-950" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Selamat Datang di FrameFlow</h1>
        <p className="text-zinc-400 mb-8 text-center max-w-md">Masuk untuk menyimpan aset, storyboard, dan video Anda secara otomatis. Proyek akan disimpan selama 30 hari.</p>
        <button 
          onClick={handleLogin}
          className="px-8 py-3 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
        >
          Masuk dengan Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <LayoutTemplate className="w-6 h-6 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-zinc-400">Halo, {user.displayName}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors border border-zinc-800"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </header>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/80">
            <p className="font-semibold text-amber-500 mb-1">⚠️ Peringatan Penyimpanan Aset (Gambar & Video)</p>
            <p>
              Aset visual Anda disimpan secara <strong>lokal di browser perangkat ini</strong> untuk menghemat kuota cloud.
              Aset akan <strong>hilang permanen</strong> jika Anda:
            </p>
            <ul className="list-disc ml-5 mt-1 space-y-0.5">
              <li>Menghapus riwayat/data browser (Clear Cache/Data)</li>
              <li>Menggunakan aplikasi pembersih laptop/HP (seperti CCleaner)</li>
              <li>Membuka proyek ini di browser atau perangkat yang berbeda</li>
            </ul>
            <p className="mt-2 font-medium text-amber-400">
              Segera download video yang sudah selesai ke perangkat Anda!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={onNewProject}
            className="h-64 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-3xl flex flex-col items-center justify-center gap-4 transition-colors group bg-zinc-900/30 hover:bg-zinc-900/50"
          >
            <div className="w-12 h-12 bg-zinc-800 group-hover:bg-emerald-500/20 rounded-full flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400" />
            </div>
            <span className="font-medium text-zinc-400 group-hover:text-emerald-400">Buat Proyek Baru</span>
          </button>

          {projects.map(project => (
            <div 
              key={project.id} 
              onClick={() => handleOpenProject(project)}
              className="h-64 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-6 flex flex-col cursor-pointer transition-all hover:shadow-xl group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${project.contentMode === 'ugc' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {project.contentMode.toUpperCase()}
                  </span>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, project.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold mb-2 line-clamp-1">{project.name || 'Proyek Tanpa Nama'}</h3>
              <p className="text-sm text-zinc-400 line-clamp-2 mb-auto">{project.productName}</p>
              
              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(project.createdAt).toLocaleDateString('id-ID')}
                </div>
                <div className="flex items-center gap-1 text-orange-400/80">
                  Kadaluarsa: {new Date(project.expiresAt).toLocaleDateString('id-ID')}
                </div>
              </div>

              {openingId === project.id && (
                <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-bold text-white">Hapus Proyek?</h3>
            </div>
            <p className="text-zinc-400 mb-6">
              Apakah Anda yakin ingin menghapus proyek ini? Tindakan ini tidak dapat dibatalkan dan semua aset akan hilang.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-bold text-white">Terjadi Kesalahan</h3>
            </div>
            <p className="text-zinc-400 mb-6">
              {errorMsg}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setErrorMsg(null)}
                className="px-4 py-2 rounded-lg font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

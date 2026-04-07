import { db, auth } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import localforage from 'localforage';

export interface SceneData {
  id: string;
  title: string;
  startVisualPrompt: string;
  endVisualPrompt: string;
  script: string;
  startImageUrl?: string; // base64 or blob url
  endImageUrl?: string;   // base64 or blob url
  videoUrl?: string;      // blob url
  status: 'idle' | 'generating_images' | 'images_done' | 'generating_video' | 'video_done' | 'error';
  error?: string;
  videoProgress?: string;
}

export interface ProjectData {
  id: string;
  userId: string;
  name: string;
  productName: string;
  productDetails: string;
  backgroundScene: string;
  contentMode: string;
  createdAt: string;
  expiresAt: string;
  // We don't store large blobs in Firestore to avoid 1MB limit.
  // We store them in localforage keyed by projectId.
}

export interface ProjectBlobs {
  productImageData: string | null;
  modelImageData: string | null;
  scenes: SceneData[];
}

// 30 days expiration
const EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

export const saveProject = async (
  project: Omit<ProjectData, 'id' | 'userId' | 'createdAt' | 'expiresAt'>,
  blobs: ProjectBlobs,
  existingId?: string
) => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  const projectId = existingId || crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRATION_MS);

  const projectData: ProjectData = {
    ...project,
    id: projectId,
    userId: auth.currentUser.uid,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Convert blob URLs to actual Blobs for storage
  const processedScenes = await Promise.all(blobs.scenes.map(async (scene) => {
    const newScene = { ...scene };
    if (newScene.videoUrl && newScene.videoUrl.startsWith('blob:')) {
      try {
        const res = await fetch(newScene.videoUrl);
        const blob = await res.blob();
        // Store the blob directly in localforage (we'll replace the URL with the blob temporarily)
        (newScene as any).videoBlob = blob;
      } catch (e) {
        console.error("Failed to fetch blob for video", e);
      }
    }
    return newScene;
  }));

  const processedBlobs = {
    ...blobs,
    scenes: processedScenes
  };

  // Save metadata to Firestore
  await setDoc(doc(db, 'projects', projectId), projectData);

  // Save blobs to localforage
  await localforage.setItem(`project_blobs_${projectId}`, processedBlobs);

  return projectId;
};

export const loadProjectBlobs = async (projectId: string): Promise<ProjectBlobs | null> => {
  const data: any = await localforage.getItem(`project_blobs_${projectId}`);
  if (!data) return null;

  // Convert Blobs back to blob URLs
  const processedScenes = data.scenes.map((scene: any) => {
    if (scene.videoBlob) {
      scene.videoUrl = URL.createObjectURL(scene.videoBlob);
      delete scene.videoBlob;
    }
    return scene;
  });

  return {
    ...data,
    scenes: processedScenes
  };
};

export const deleteProject = async (projectId: string) => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  await deleteDoc(doc(db, 'projects', projectId));
  await localforage.removeItem(`project_blobs_${projectId}`);
};

// Auto-cleanup expired projects locally
export const cleanupExpiredProjects = async (projects: ProjectData[]) => {
  const now = new Date();
  for (const p of projects) {
    if (new Date(p.expiresAt) < now) {
      try {
        await deleteProject(p.id);
      } catch (e) {
        console.error("Failed to delete expired project", e);
      }
    }
  }
};

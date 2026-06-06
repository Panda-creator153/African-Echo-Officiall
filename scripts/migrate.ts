import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const CONTENT_FILE = path.join(process.cwd(), "site-content.json");

async function migrate() {
  console.log('Starting migration to Firestore...');
  
  if (!fs.existsSync(CONTENT_FILE)) {
    console.error('site-content.json not found. Nothing to migrate.');
    return;
  }

  const raw = fs.readFileSync(CONTENT_FILE, 'utf-8');
  const content = JSON.parse(raw);

  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  const db = getFirestore(firebaseConfig.firestoreDatabaseId || '(default)');

  const batch = db.batch();

  // Settings
  console.log('Migrating settings...');
  batch.set(db.doc('settings/main'), {
    artistName: content.artistName,
    footer: content.footer,
    images: {
      hero: content.images.hero,
      portrait: content.images.portrait
    }
  });

  // Pages
  console.log('Migrating pages...');
  batch.set(db.doc('home/main'), content.home);
  batch.set(db.doc('about/main'), content.about);
  batch.set(db.doc('booking/main'), content.booking);
  batch.set(db.doc('contact/main'), content.contact);

  // Tracks
  console.log('Migrating tracks...');
  content.tracks.forEach((t: any) => {
    batch.set(db.collection('tracks').doc(t.id), t);
  });

  // Albums
  console.log('Migrating albums...');
  content.albums.forEach((a: any) => {
    batch.set(db.collection('albums').doc(a.id), a);
  });

  // Videos
  console.log('Migrating videos...');
  content.videos.forEach((v: any) => {
    batch.set(db.collection('videos').doc(v.id), v);
  });

  // Gallery
  console.log('Migrating gallery...');
  content.images.gallery.forEach((g: any) => {
    batch.set(db.collection('gallery').doc(g.id), g);
  });

  await batch.commit();
  console.log('Migration complete!');
}

migrate().catch(console.error);

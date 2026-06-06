import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailRegex.test(email.trim())) {
      setStatus('error');
      setError('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setError('');

    const sanitizedEmail = email.trim().toLowerCase();
    const subscriberId = `sub-${sanitizedEmail.replace(/[^a-zA-Z0-9_\-+.]/g, '_')}`;
    const subscriberDocRef = doc(db, 'subscribers', subscriberId);

    try {
      // Write the subscription directly to Firestore "subscribers" collection
      await setDoc(subscriberDocRef, {
        id: subscriberId,
        email: sanitizedEmail,
        createdAt: serverTimestamp()
      });

      // Call the express fallback endpoint
      try {
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: sanitizedEmail }),
        });
      } catch (apiErr) {
        console.warn('API notification fallback limited:', apiErr);
      }

      setStatus('success');
      setEmail('');
    } catch (err: any) {
      console.error('Error in newsletter subscription:', err);
      setStatus('error');
      setError('Subscription failed. Please try again.');
      try {
        handleFirestoreError(err, OperationType.WRITE, `subscribers/${subscriberId}`);
      } catch (e2) {
        // Quiet log
      }
    }
  };

  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto glass-panel p-16 rounded-[40px] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full atmosphere-gradient opacity-20 pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10"
        >
          <Mail className="w-12 h-12 text-accent mx-auto mb-8" />
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight uppercase">Join the Transmission</h2>
          <p className="text-secondary mb-12 max-w-md mx-auto">
            Stay updated with exclusive releases, tour dates, and atmospheric transmissions from the void.
          </p>

          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center py-4"
              >
                <CheckCircle2 className="w-12 h-12 text-accent mb-4" />
                <p className="font-bold text-lg">YOU ARE CONNECTED.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="text-xs text-secondary underline mt-4 hover:text-white"
                >
                  ADD ANOTHER EMAIL
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative max-w-lg mx-auto"
                onSubmit={handleSubmit}
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="YOUR EMAIL"
                    disabled={status === 'loading'}
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-8 py-4 text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  />
                  <button 
                    disabled={status === 'loading'}
                    className="bg-white text-black font-bold text-xs tracking-widest px-8 py-4 rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-all disabled:opacity-50 group"
                  >
                    {status === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        SIGN UP <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
                {status === 'error' && (
                  <p className="text-accent text-[10px] font-bold mt-4 tracking-widest">{error.toUpperCase()}</p>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;

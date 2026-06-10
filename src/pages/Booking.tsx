import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import SEO from '../components/SEO';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const Booking = () => {
  const { content, loading } = useContent();
  const [formData, setFormData] = useState({ name: '', email: '', eventType: 'FESTIVAL', date: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const bookingSchema = useMemo(() => {
    if (!content) return null;
    return {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      "name": content.artistName,
      "description": content.booking?.description || "Book for live performances, festivals, and private sets.",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": content.contact?.managementEmail || 'mgmt@africanecho.com',
        "contactType": "booking"
      }
    };
  }, [content]);

  if (!content) return null;

  const { booking } = content;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.eventType || !formData.date || !formData.message.trim()) {
      setSubmitStatus('error');
      setErrorMessage('Please fill in all fields with valid information.');
      return;
    }

    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setSubmitStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    const bookingId = `book-${Date.now()}`;
    const bookingDocRef = doc(db, 'bookings', bookingId);

    try {
      let apiSuccess = false;
      let localErrorMsg = '';

      // 1. Post to Express Server
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: bookingId,
            name: formData.name.trim(),
            email: formData.email.trim(),
            eventType: formData.eventType,
            date: formData.date,
            message: formData.message.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
          })
        });
        if (res.ok) {
          apiSuccess = true;
        } else {
          localErrorMsg = await res.text() || 'Failed to submit via API';
        }
      } catch (apiErr: any) {
        console.warn('API submission failed, relying on Firestore direct write:', apiErr);
        localErrorMsg = apiErr.message;
      }

      // 2. Post directly to Firestore (so it records in Firestore if client has permission/Internet is working)
      try {
        await setDoc(bookingDocRef, {
          id: bookingId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          eventType: formData.eventType,
          date: formData.date,
          message: formData.message.trim(),
          status: 'pending',
          createdAt: serverTimestamp()
        });
        apiSuccess = true;
      } catch (firestoreErr: any) {
        console.warn('Firestore fallback write limited:', firestoreErr.message || firestoreErr);
      }

      if (apiSuccess) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', eventType: 'FESTIVAL', date: '', message: '' });
      } else {
        throw new Error(localErrorMsg || 'All submission gateways failed');
      }
    } catch (err: any) {
      console.error('Error submitting booking form:', err);
      setSubmitStatus('error');
      setErrorMessage('Failed to send booking inquiry. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-40 pb-32 px-6">
      <SEO 
        title="Booking & Inquiries" 
        description={`Book ${content.artistName} for live performances, festivals, and private sets.`} 
        schema={bookingSchema}
      />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24">
        <div>
          <header className="mb-16">
            <p className="text-[10px] font-bold tracking-[0.4em] text-accent mb-4">PERFORMANCES</p>
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight mb-8">BOOKING</h1>
            <p className="text-secondary text-lg leading-relaxed max-w-md">
              {booking?.description || "For live performances, festivals, and private sets."}
            </p>
          </header>

          <div className="space-y-12">
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">AVAILABILITY</h3>
                <p className="text-secondary text-sm">{booking?.availability || "Open for bookings."}</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">BASE</h3>
                <p className="text-secondary text-sm">{booking?.base || "Global"}</p>
              </div>
            </div>
          </div>
        </div>

        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="glass-panel p-12 rounded-[40px] relative"
        >
          <div className="absolute top-0 left-0 w-full h-full atmosphere-gradient opacity-10 pointer-events-none" />
          
          <form className="relative z-10 space-y-8" onSubmit={handleSubmit}>
            {submitStatus === 'success' && (
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-400 p-5 rounded-2xl">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium">Your booking inquiry has been submitted! We will contact you soon to finalize details.</p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">NAME / ORGANIZATION</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Your Name / Agency"
                  className="w-full bg-white/5 border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors text-white placeholder-white/10" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">EMAIL</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="contact@agency.com"
                  className="w-full bg-white/5 border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors text-white placeholder-white/10" 
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">EVENT TYPE</label>
                <select 
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors appearance-none text-white [&>option]:text-black"
                >
                  <option className="bg-bg" value="FESTIVAL">FESTIVAL</option>
                  <option className="bg-bg" value="CLUB SET">CLUB SET</option>
                  <option className="bg-bg" value="PRIVATE EVENT">PRIVATE EVENT</option>
                  <option className="bg-bg" value="CORP/VIRTUAL">CORP/VIRTUAL</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">DATE</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors text-white select-none shrink-0" 
                />
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">MESSAGE / DETAILS</label>
                <textarea 
                  rows={4} 
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Please describe stage size, sound, and additional requirements..."
                  className="w-full bg-white/5 border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors resize-none text-white placeholder-white/10" 
                />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-black font-bold tracking-[0.2em] py-6 rounded-full hover:bg-accent hover:text-white transition-all flex items-center justify-center group uppercase text-xs disabled:opacity-50"
            >
              {isSubmitting ? 'SENDING REQUEST...' : 'SEND REQUEST'} <Send className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Booking;
